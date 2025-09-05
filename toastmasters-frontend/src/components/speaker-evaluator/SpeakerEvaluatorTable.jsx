import React, { useEffect, useMemo, useState } from 'react';
import seMappingService from '../../api/seMappingService';
import apiService from '../../api/api';
import assignedRoleService from '../../api/assignedRoleService';

/**
 * SpeakerEvaluatorTable
 * Props:
 *  - meetingId: string (required)
 *  - canAssign?: boolean (default true) - if false, hides assignment controls
 */
export default function SpeakerEvaluatorTable({ meetingId, canAssign = true }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [members, setMembers] = useState([]);
  const [speakers, setSpeakers] = useState([]); // [{memberId, memberName}]
  const [mappings, setMappings] = useState([]); // [{speakerId, speakerName, evaluatorId, evaluatorName}]
  const [evaluatorCandidates, setEvaluatorCandidates] = useState([]); // [{memberId, memberName}] members assigned as evaluators for this meeting

  // UI state for adding evaluator per speaker
  const [rowState, setRowState] = useState({}); // key: speakerId -> { open: bool, selectedEvaluatorId: '' }

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError('');
      try {
        // 1) Load roster
        const membersRes = await apiService.getMembers();
        const roster = Array.isArray(membersRes?.data?.data) ? membersRes.data.data : (Array.isArray(membersRes?.data) ? membersRes.data : []);
        const rosterNorm = (roster || []).map(m => ({
          memberId: Number(m.memberId || m.id),
          memberName: m.memberName || m.name || '',
        })).filter(m => Number.isFinite(m.memberId));
        setMembers(rosterNorm);

        // 2) Detect speakers for the meeting via assigned roles
        // Expectation: assignedRoleService.getAssignedRolesByMeeting returns items with role info
        // We'll treat a role as Speaker if roleName includes 'speaker' (case-insensitive) or roleId base 'R12' (if present)
        const assignedRes = await assignedRoleService.getAssignedRolesByMeeting(meetingId);
        const assignedList = Array.isArray(assignedRes?.data?.data) ? assignedRes.data.data : (Array.isArray(assignedRes?.data) ? assignedRes.data : []);
        const isSpeakerRole = (r) => {
          const rn = String(r?.roleName || r?.role?.roleName || '').toLowerCase();
          const rid = String(r?.roleId || r?.role?.roleId || '').toLowerCase();
          return rn.includes('speaker') || rid.startsWith('r12');
        };
        const speakerAssignments = (assignedList || []).filter(isSpeakerRole);
        const speakerSet = new Map();
        speakerAssignments.forEach(a => {
          const mid = Number(a?.memberId || a?.member?.memberId);
          const mname = a?.memberName || a?.member?.memberName;
          if (Number.isFinite(mid)) {
            if (!speakerSet.has(mid)) {
              speakerSet.set(mid, { memberId: mid, memberName: mname || (rosterNorm.find(x => x.memberId === mid)?.memberName) || `Member ${mid}` });
            }
          }
        });
        setSpeakers(Array.from(speakerSet.values()));

        // Derive evaluator candidates (only those assigned as Evaluator for this meeting)
        const isEvaluatorRole = (r) => {
          const rn = String(r?.roleName || r?.role?.roleName || '').toLowerCase();
          // Consider variations like "Evaluator", "Speech Evaluator", "Evaluator 1", etc.
          return rn.includes('evaluator');
        };
        const evaluatorAssignments = (assignedList || []).filter(isEvaluatorRole);
        const evaluatorMap = new Map();
        evaluatorAssignments.forEach(a => {
          const mid = Number(a?.memberId || a?.member?.memberId);
          const mname = a?.memberName || a?.member?.memberName;
          if (Number.isFinite(mid) && !evaluatorMap.has(mid)) {
            evaluatorMap.set(mid, { memberId: mid, memberName: mname || (rosterNorm.find(x => x.memberId === mid)?.memberName) || `Member ${mid}` });
          }
        });
        setEvaluatorCandidates(Array.from(evaluatorMap.values()));

        // 3) Load mappings for meeting
        const mappingsRes = await seMappingService.getMappingsForMeeting(meetingId);
        const mappingsRaw = Array.isArray(mappingsRes?.data?.data) ? mappingsRes.data.data : (Array.isArray(mappingsRes?.data) ? mappingsRes.data : []);
        const norm = (mappingsRaw || []).map(m => ({
          id: Number(m?.id || m?.mappingId || m?.speakerEvaluatorMappingId),
          speakerId: Number(m?.speakerId || m?.speaker?.memberId),
          speakerName: m?.speakerName || m?.speaker?.memberName,
          evaluatorId: Number(m?.evaluatorId || m?.evaluator?.memberId),
          evaluatorName: m?.evaluatorName || m?.evaluator?.memberName,
        })).filter(x => Number.isFinite(x.speakerId) && Number.isFinite(x.evaluatorId));
        setMappings(norm);
      } catch (e) {
        setError('Failed to load speaker-evaluator mappings.');
      } finally {
        setLoading(false);
      }
    };
    if (meetingId) init();
  }, [meetingId]);

  const evaluatorsBySpeaker = useMemo(() => {
    const map = new Map();
    mappings.forEach(m => {
      const key = m.speakerId;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ mappingId: m.id, evaluatorId: m.evaluatorId, evaluatorName: m.evaluatorName });
    });
    return map; // Map<number, Array<{evaluatorId, evaluatorName}>>
  }, [mappings]);

  // Set of evaluatorIds already assigned to any speaker in this meeting (single-instance rule)
  const globallyAssignedEvaluatorIds = useMemo(() => {
    const s = new Set();
    for (const m of mappings) s.add(m.evaluatorId);
    return s;
  }, [mappings]);

  const getAvailableEvaluatorsForSpeaker = (speakerId) => {
    const assignedForThisSpeaker = new Set((evaluatorsBySpeaker.get(speakerId) || []).map(e => e.evaluatorId));
    // exclude the speaker themselves as evaluator for themselves
    assignedForThisSpeaker.add(Number(speakerId));
    // Only allow members who are assigned as evaluator for this meeting, and not assigned to any other speaker (single instance)
    return evaluatorCandidates.filter(m => !assignedForThisSpeaker.has(m.memberId) && !globallyAssignedEvaluatorIds.has(m.memberId));
  };

  const openRow = (speakerId) => {
    setRowState(prev => ({ ...prev, [speakerId]: { open: true, selectedEvaluatorId: '' } }));
  };

  const cancelRow = (speakerId) => {
    setRowState(prev => ({ ...prev, [speakerId]: { open: false, selectedEvaluatorId: '' } }));
  };

  const onSelectEvaluator = (speakerId, val) => {
    setRowState(prev => ({ ...prev, [speakerId]: { ...(prev[speakerId] || {}), selectedEvaluatorId: val } }));
  };

  const confirmAssign = async (speakerId) => {
    const sel = rowState[speakerId]?.selectedEvaluatorId;
    const evaluatorId = Number(sel);
    if (!Number.isFinite(evaluatorId)) return;
    try {
      await seMappingService.assignEvaluator(meetingId, Number(speakerId), evaluatorId);
      // Refetch mappings to get server-generated mapping IDs
      const mappingsRes = await seMappingService.getMappingsForMeeting(meetingId);
      const mappingsRaw = Array.isArray(mappingsRes?.data?.data) ? mappingsRes.data.data : (Array.isArray(mappingsRes?.data) ? mappingsRes.data : []);
      const norm = (mappingsRaw || []).map(m => ({
        id: Number(m?.id || m?.mappingId || m?.speakerEvaluatorMappingId),
        speakerId: Number(m?.speakerId || m?.speaker?.memberId),
        speakerName: m?.speakerName || m?.speaker?.memberName,
        evaluatorId: Number(m?.evaluatorId || m?.evaluator?.memberId),
        evaluatorName: m?.evaluatorName || m?.evaluator?.memberName,
      })).filter(x => Number.isFinite(x.speakerId) && Number.isFinite(x.evaluatorId));
      setMappings(norm);
      cancelRow(speakerId);
    } catch (e) {
      setError('Failed to assign evaluator. Please try again.');
    }
  };

  const handleUnassign = async (speakerId, evaluatorId, mappingId) => {
    try {
      await seMappingService.removeEvaluator(meetingId, Number(speakerId), Number(evaluatorId));
    } catch (e) {
      // If remove endpoint not found, try delete-by-id fallback when available
      if (e?.response?.status === 404 && Number.isFinite(Number(mappingId))) {
        try {
          await seMappingService.deleteMapping(Number(mappingId));
        } catch (inner) {
          setError('Failed to remove evaluator. Please try again.');
          return;
        }
      } else {
        setError('Failed to remove evaluator. Please try again.');
        return;
      }
    }
    // Remove from local mappings on success
    setMappings(prev => prev.filter(m => !(m.speakerId === Number(speakerId) && m.evaluatorId === Number(evaluatorId))));
  };

  if (!meetingId) return <div className="alert alert-warning">Meeting ID is required.</div>;
  if (loading) return (
    <div className="text-center my-4">
      <div className="spinner-border text-primary" role="status" />
      <p className="mt-2">Loading speaker-evaluator mappings...</p>
    </div>
  );

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Speakers and Evaluators</h5>
        </div>
        {error && <div className="alert alert-danger py-2">{error}</div>}

        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th style={{width: '35%'}}>Speaker</th>
                <th>Evaluators</th>
                {canAssign && <th style={{width: '28%'}}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {speakers.length === 0 && (
                <tr>
                  <td colSpan={canAssign ? 3 : 2} className="text-muted">No speakers found for this meeting.</td>
                </tr>
              )}
              {speakers.map(sp => {
                const assigned = evaluatorsBySpeaker.get(sp.memberId) || [];
                const row = rowState[sp.memberId] || { open: false, selectedEvaluatorId: '' };
                const available = getAvailableEvaluatorsForSpeaker(sp.memberId);
                return (
                  <tr key={sp.memberId}>
                    <td className="fw-semibold">{sp.memberName}</td>
                    <td>
                      {assigned.length === 0 ? (
                        <span className="text-muted">No evaluators assigned</span>
                      ) : (
                        <div className="d-flex flex-wrap gap-2">
                          {assigned.map(ev => (
                            <span key={ev.evaluatorId} className="badge bg-light text-dark border d-inline-flex align-items-center">
                              {ev.evaluatorName}
                              {canAssign && (
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm ms-1 p-0 text-danger"
                                  title="Remove evaluator"
                                  onClick={() => handleUnassign(sp.memberId, ev.evaluatorId, ev.mappingId)}
                                >
                                  <i className="bi bi-x-circle" />
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    {canAssign && (
                      <td>
                        {!row.open ? (
                          <button className="btn btn-sm btn-primary" onClick={() => openRow(sp.memberId)} disabled={available.length === 0}>
                            Add Evaluator
                          </button>
                        ) : (
                          <div className="d-flex gap-2">
                            <select
                              className="form-select form-select-sm"
                              value={row.selectedEvaluatorId}
                              onChange={(e) => onSelectEvaluator(sp.memberId, e.target.value)}
                            >
                              <option value="">Select evaluator</option>
                              {available.map(m => (
                                <option key={m.memberId} value={m.memberId}>{m.memberName}</option>
                              ))}
                            </select>
                            <button className="btn btn-sm btn-success" onClick={() => confirmAssign(sp.memberId)} disabled={!row.selectedEvaluatorId}>
                              Confirm
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => cancelRow(sp.memberId)}>
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
