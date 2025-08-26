import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import meetingService from "../../api/meetingservice";
import availableMemberService from "../../api/availableMemberService";
import assignedRoleService from "../../api/assignedRoleService";
import apiService from "../../api/api.js";

const getMeetingStatus = (m) => {
  try {
    if (!m || !m.date || !m.startTime || !m.endTime) return "Invalid";
    let parsedStart, parsedEnd;
    if (m.date.includes("T")) {
      parsedStart = new Date(m.date);
      parsedEnd = new Date(m.date);
    } else {
      const dateStr = m.date;
      const normalizeTime = (t) => {
        if (!t) return t;
        if (t.includes(":")) {
          const parts = t.split(":");
          return parts.length === 2 ? `${t}:00` : t;
        }
        return t;
      };
      parsedStart = new Date(`${dateStr}T${normalizeTime(m.startTime)}`);
      parsedEnd = new Date(`${dateStr}T${normalizeTime(m.endTime)}`);
    }
    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) return "Invalid";
    const now = new Date();
    if (now < parsedStart) return "Upcoming";
    if (now >= parsedStart && now <= parsedEnd) return "Ongoing";
    return "Closed";
  } catch (e) {
    console.warn("Failed to compute meeting status", e, m);
    return "Error";
  }
};

const formatDateTime = (m) => {
  try {
    if (!m || !m.date || !m.startTime) return "N/A";
    let dt;
    if (m.date.includes("T")) {
      dt = new Date(m.date);
    } else {
      const normalizeTime = (t) => {
        if (!t) return t;
        if (t.includes(":")) {
          const parts = t.split(":");
          return parts.length === 2 ? `${t}:00` : t;
        }
        return t;
      };
      dt = new Date(`${m.date}T${normalizeTime(m.startTime)}`);
    }
    if (isNaN(dt.getTime())) return "Invalid date";
    const formatter = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return formatter.format(dt);
  } catch {
    return "N/A";
  }
};

export default function MeetingDetails() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [assignedRoles, setAssignedRoles] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [openPanels, setOpenPanels] = useState({
    AVAILABLE: false,
    NOT_AVAILABLE: false,
    TENTATIVE: false,
    NOT_RESPONDED: false,
  });
  // Modal state for viewing category lists
  const [showModal, setShowModal] = useState(false);
  const [modalCategory, setModalCategory] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      let mRes;
      try {
        mRes = await meetingService.getMeetingById(meetingId);
        setMeeting(mRes.data.data);
      } catch (e) {
        console.error("Failed to load meeting", e);
        setError("Failed to load meeting.");
        setLoading(false);
        return;
      }

      // Build candidate IDs to try (URL id, meeting.meetingId, meeting.id, and versions without 'M' prefix)
      const candidates = [];
      const pushIf = (val) => { if (val !== undefined && val !== null && String(val).trim() !== '') candidates.push(String(val)); };
      pushIf(meetingId);
      pushIf((mRes?.data?.data || {}).meetingId);
      pushIf((mRes?.data?.data || {}).id);
      // Also push without 'M' prefix variations
      const stripM = (v) => String(v).replace(/^M/i, '');
      [meetingId, (mRes?.data?.data || {}).meetingId].forEach(v => { if (v) pushIf(stripM(v)); });
      // Deduplicate while preserving order
      const seen = new Set();
      const uniqueCandidates = candidates.filter(c => (seen.has(c) ? false : (seen.add(c), true)));

      // Helper to try GETs with fallbacks
      const tryFetchList = async (fn, label) => {
        for (const c of uniqueCandidates) {
          try {
            const res = await fn(c);
            const arr = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : null);
            if (Array.isArray(arr)) {
              return arr;
            }
          } catch (e) {
            if (e?.response?.status === 404) {
              // Try next candidate
              continue;
            }
            console.warn(`Failed ${label} for candidate ${c}, trying next.`, e);
            continue;
          }
        }
        return [];
      };

      // Available members with fallbacks
      let amList = await tryFetchList((id) => availableMemberService.getAvailableMembersByMeeting(id), 'available-members');
      // If empty, try fetching all and filter client-side by various meetingId shapes
      if ((!Array.isArray(amList) || amList.length === 0)) {
        try {
          const allAMRes = await availableMemberService.getAllAvailableMembers();
          const allAM = allAMRes?.data?.data ?? allAMRes?.data ?? [];
          const norm = (v) => String(v ?? '').trim();
          const stripM = (v) => norm(v).replace(/^M/i, '');
          const candidateSet = new Set([ ...uniqueCandidates.map(norm), ...uniqueCandidates.map(stripM) ]);
          amList = (Array.isArray(allAM) ? allAM : []).filter((x) => {
            const mid = norm(x.meetingId);
            const midStripped = stripM(x.meetingId);
            return candidateSet.has(mid) || candidateSet.has(midStripped);
          });
          console.log('[MeetingDetails] Fallback used. Filtered available members:', amList.length);
        } catch (e) {
          console.warn('Fallback fetch of all available members failed', e);
        }
      }
      console.log('[MeetingDetails] Available members count:', Array.isArray(amList) ? amList.length : 'n/a');
      setAvailableMembers(Array.isArray(amList) ? amList : []);

      // Assigned roles with fallbacks (usually works with URL id, but safe to try)
      const arList = await tryFetchList((id) => assignedRoleService.getAssignedRolesByMeeting(id), 'assigned-roles');
      console.log('[MeetingDetails] Assigned roles count:', Array.isArray(arList) ? arList.length : 'n/a');
      setAssignedRoles(arList);

      // Fetch full member roster from canonical members API to compute Not Responded Yet
      try {
        const allRes = await apiService.getMembers();
        const arr = Array.isArray(allRes?.data?.data)
          ? allRes.data.data
          : (Array.isArray(allRes?.data) ? allRes.data : []);
        console.log('[MeetingDetails] Roster size:', Array.isArray(arr) ? arr.length : 'n/a');
        setAllMembers(Array.isArray(arr) ? arr : []);
      } catch (e) {
        console.warn('Failed to fetch all members roster', e);
        setAllMembers([]);
      }

      setLoading(false);
    };
    fetchAll();
  }, [meetingId]);

  const status = useMemo(() => getMeetingStatus(meeting || {}), [meeting]);

  const assignedByMember = useMemo(() => {
    const map = {};
    for (const r of assignedRoles) {
      if (!map[r.memberId]) map[r.memberId] = [];
      map[r.memberId].push(r);
    }
    return map;
  }, [assignedRoles]);

  const openList = (categoryKey) => {
    setModalCategory(categoryKey);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setModalCategory(null);
  };

  const sections = useMemo(() => {
    const byStatus = {
      AVAILABLE: [],
      TENTATIVE: [],
      NOT_AVAILABLE: [],
      NOT_RESPONDED: [],
    };
    const normalizeId = (v) => String(v ?? '').trim().replace(/^M/i, '');
    const rosterByNormId = new Map(
      (allMembers || []).map((m) => {
        const rawId = m.memberId ?? m.id ?? '';
        const norm = normalizeId(rawId);
        // Prefer canonical fields from roster if present
        const displayId = String(rawId || norm);
        const displayName = (m.memberName && String(m.memberName).trim()) || (m.name && String(m.name).trim()) || 'Member';
        return [norm, { memberId: displayId, memberName: displayName }];
      })
    );
    const normalizeStatus = (s) => {
      const v = String(s || '').toUpperCase();
      if (v === 'UNAVAILABLE' || v === 'NOT_AVAILABLE') return 'NOT_AVAILABLE';
      if (v === 'AVAILABLE') return 'AVAILABLE';
      if (v === 'TENTATIVE') return 'TENTATIVE';
      return 'NOT_RESPONDED';
    };
    const pushUnique = (arr, item) => {
      const id = item.memberId;
      if (!id) return;
      if (!arr.some((x) => x.memberId === id)) arr.push(item);
    };
    // Group those who responded (deduped, normalized IDs, enriched names)
    for (const m of (availableMembers || [])) {
      const key = normalizeStatus(m.availabilityStatus);
      const bucket = byStatus[key] || byStatus.NOT_RESPONDED;
      const rawId = m.memberId ?? '';
      const normId = normalizeId(rawId);
      const rosterInfo = rosterByNormId.get(normId);
      const displayId = rosterInfo?.memberId || String(rawId).trim() || normId;
      const displayName = (m.memberName && String(m.memberName).trim()) || rosterInfo?.memberName || 'Member';
      pushUnique(bucket, {
        ...m,
        memberId: displayId,
        memberName: displayName,
      });
    }
    // Compute not responded as allMembers minus responded
    if (Array.isArray(allMembers) && allMembers.length > 0) {
      const respondedNormIds = new Set((availableMembers || []).map((x) => normalizeId(x.memberId)));
      for (const mem of allMembers) {
        const rawId = mem.memberId ?? mem.id ?? '';
        const normId = normalizeId(rawId);
        if (!normId) continue;
        if (!respondedNormIds.has(normId)) {
          const rosterInfo = rosterByNormId.get(normId);
          pushUnique(byStatus.NOT_RESPONDED, {
            memberId: rosterInfo?.memberId || String(rawId).trim() || normId,
            memberName: rosterInfo?.memberName || 'Member',
            availabilityStatus: 'NOT_RESPONDED',
          });
        }
      }
    }
    return byStatus;
  }, [availableMembers, allMembers]);

  // Now that 'sections' is initialized, derive rows for the modal safely
  const modalRows = useMemo(() => {
    if (!modalCategory) return [];
    return sections[modalCategory] || [];
  }, [sections, modalCategory]);

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2">Loading meeting details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Back</button>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">Meeting not found.</div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Back</button>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="fw-bold mb-0">Meeting Details</h3>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-secondary" to="/meetings">Back to Meetings</Link>
          <Link to={`/available-members/add?meetingId=${encodeURIComponent(meeting.meetingId || meetingId)}`} className="btn btn-primary">
            + Add Availability
          </Link>
          <span className={
            status === "Upcoming" ? "badge bg-info fs-6 px-3 py-2" :
            status === "Ongoing" ? "badge bg-success fs-6 px-3 py-2" :
            status === "Invalid" ? "badge bg-warning fs-6 px-3 py-2" :
            status === "Error" ? "badge bg-danger fs-6 px-3 py-2" :
            "badge bg-secondary fs-6 px-3 py-2"
          }>{status}</span>
        </div>
      </div>

      {/* Top summary cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Meeting ID</div>
              <div className="fs-5 fw-bold">{meeting.meetingId}</div>
            </div>
          </div>
        </div>
        <div className="col-md-5">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Date & Time</div>
              <div className="fs-5 fw-bold">{formatDateTime(meeting)}</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Meeting Type</div>
              <div className="fs-5 fw-bold">
                <span className="badge bg-primary">{meeting.category || "Regular"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Venue</div>
              <div className="fs-6 fw-semibold">{meeting.venue || "Not set"}</div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted">Theme</div>
              <div className="fs-6 fw-semibold">{meeting.theme || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Member availability sections (accordion-style) */}
      <div className="mb-3">
        <h5 className="fw-bold mb-0">Member Availability</h5>
      </div>

      <div className="row g-3">
        {[
          { key: "AVAILABLE", title: "✅ Available Members", badge: "bg-success" },
          { key: "NOT_AVAILABLE", title: "❌ Not Available Members", badge: "bg-danger" },
          { key: "TENTATIVE", title: "🤔 Tentative Members", badge: "bg-warning text-dark" },
          { key: "NOT_RESPONDED", title: "⏳ Not Responded Yet", badge: "bg-secondary" },
        ].map((sec) => (
          <div className="col-md-6" key={sec.key}>
            <div className="card shadow-sm h-100">
              <div className={`card-header d-flex justify-content-between align-items-center ${sec.key === 'AVAILABLE' ? 'border-success' : sec.key === 'NOT_AVAILABLE' ? 'border-danger' : sec.key === 'TENTATIVE' ? 'border-warning' : 'border-secondary'}`}>
                <span className="fw-bold">{sec.title}</span>
                <div className="d-flex align-items-center gap-2">
                  {loading ? (
                    <span className={`badge ${sec.badge}`}>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    </span>
                  ) : (
                    <button type="button" className={`badge ${sec.badge} border-0`} onClick={() => openList(sec.key)}>
                      {sections[sec.key]?.length || 0}
                    </button>
                  )}
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openList(sec.key)}>
                    View List
                  </button>
                </div>
              </div>
              {/* Inline table removed in favor of modal view */}
            </div>
          </div>
        ))}
      </div>

      {/* Modal for viewing member lists */}
      {showModal && (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-md" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{modalCategory?.replace('_', ' ') || 'Members'}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                {loading ? (
                  <div className="text-center py-3">
                    <div className="spinner-border text-primary" role="status"></div>
                  </div>
                ) : (modalRows.length === 0 ? (
                  <div className="text-muted">No members</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th style={{width: '140px'}}>Member ID</th>
                          <th>Member Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalRows.map((m) => (
                          <tr key={m.memberId}>
                            <td className="text-muted">{m.memberId}</td>
                            <td className="fw-semibold">{m.memberName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
