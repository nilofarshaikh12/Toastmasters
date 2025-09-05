import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import grammarianService from '../../api/grammarianService';
import apiService from '../../api/api.js';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function GrammarianForm() {
  const navigate = useNavigate();
  const { grammarianId } = useParams();
  const query = useQuery();
  const { user } = useAuth();

  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [memberId, setMemberId] = useState('');
  const [meetingIdState, setMeetingIdState] = useState('');
  const [wod, setWod] = useState({ id: '', word: '', meaning: '', example: '' });
  const [pod, setPod] = useState({ id: '', word: '', meaning: '', example: '' });

  const meetingIdParam = query.get('meetingId') || '';

  const getCurrentUserMemberId = () => {
    const uid = user?.memberId || user?.id || user?.userId;
    if (uid) return String(uid);
    const email = String(user?.email || '').toLowerCase();
    const name = String(user?.name || user?.memberName || '').toLowerCase();
    if (Array.isArray(allMembers) && allMembers.length > 0) {
      if (email) {
        const mByEmail = allMembers.find(x => String(x.email || '').toLowerCase() === email);
        if (mByEmail?.memberId) return String(mByEmail.memberId);
      }
      if (name) {
        const mByName = allMembers.find(x => String(x.memberName || x.name || '').toLowerCase() === name);
        if (mByName?.memberId) return String(mByName.memberId);
      }
    }
    return '';
  };

  useEffect(() => {
    const init = async () => {
      try {
        // roster (for memberId resolution)
        const res = await apiService.getMembers();
        const arr = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
        setAllMembers(arr);
      } catch (e) {
        setAllMembers([]);
      }

      const currentMemberId = getCurrentUserMemberId();
      setMemberId(String(currentMemberId));
      setMeetingIdState(String(meetingIdParam || ''));

      // Load existing entries for this meeting and current member (both WOD and POD)
      if (meetingIdParam) {
        try {
          const byMeeting = await grammarianService.getByMeeting(meetingIdParam);
          const list = byMeeting?.data?.data ?? byMeeting?.data ?? [];
          const mine = (Array.isArray(list) ? list : []).filter(x => String(x.memberId) === String(currentMemberId));
          const getType = (t) => String(t || '').toUpperCase();
          const wodRec = mine.find(x => getType(x.type) === 'WOD');
          const podRec = mine.find(x => getType(x.type) === 'POD');
          if (wodRec) setWod({ id: String(wodRec.grammarianId || wodRec.id || ''), word: wodRec.word || '', meaning: wodRec.meaning || '', example: wodRec.example || '' });
          if (podRec) setPod({ id: String(podRec.grammarianId || podRec.id || ''), word: podRec.word || '', meaning: podRec.meaning || '', example: podRec.example || '' });
        } catch (e) {
          // ignore; start blank
        }
      }

      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grammarianId, meetingIdParam]);

  const handleChangeWod = (e) => {
    const { name, value } = e.target;
    setWod(prev => ({ ...prev, [name]: value }));
  };
  const handleChangePod = (e) => {
    const { name, value } = e.target;
    setPod(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const ops = [];
      const safeMeetingId = meetingIdState;
      const safeMemberId = Number(memberId);
      const hasWod = (wod.word || wod.meaning || wod.example);
      const hasPod = (pod.word || pod.meaning || pod.example);
      if (!hasWod && !hasPod) {
        setError('Please fill at least one of WOD or POD.');
        return;
      }
      if (hasWod) {
        const payloadW = { type: 'WOD', word: wod.word, meaning: wod.meaning, example: wod.example, memberId: safeMemberId, meetingId: safeMeetingId };
        if (wod.id) ops.push(grammarianService.update(wod.id, payloadW)); else ops.push(grammarianService.add(payloadW));
      }
      if (hasPod) {
        const payloadP = { type: 'POD', word: pod.word, meaning: pod.meaning, example: pod.example, memberId: safeMemberId, meetingId: safeMeetingId };
        if (pod.id) ops.push(grammarianService.update(pod.id, payloadP)); else ops.push(grammarianService.add(payloadP));
      }
      await Promise.all(ops);
      // back to meeting details
      navigate(`/meetings/${encodeURIComponent(safeMeetingId)}`);
    } catch (e) {
      setError('Failed to save Grammarian template.');
    }
  };

  if (loading) return (
    <div className="container mt-4 text-center">
      <div className="spinner-border text-primary" role="status" />
      <p className="mt-2">Loading...</p>
    </div>
  );

  return (
    <div className="container mt-4" style={{ maxWidth: 820 }}>
      <h3 className="fw-bold mb-3">Grammarian WOD/POD</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0">Word of the Day (WOD)</h5>
                  {wod.id && <span className="badge bg-secondary">Editing existing</span>}
                </div>
                <div className="mb-3">
                  <label className="form-label">Word</label>
                  <input name="word" className="form-control" value={wod.word} onChange={handleChangeWod} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Meaning</label>
                  <textarea name="meaning" className="form-control" rows={3} value={wod.meaning} onChange={handleChangeWod} />
                </div>
                <div className="mb-0">
                  <label className="form-label">Example</label>
                  <textarea name="example" className="form-control" rows={3} value={wod.example} onChange={handleChangeWod} />
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0">Phrase of the Day (POD)</h5>
                  {pod.id && <span className="badge bg-secondary">Editing existing</span>}
                </div>
                <div className="mb-3">
                  <label className="form-label">Phrase</label>
                  <input name="word" className="form-control" value={pod.word} onChange={handleChangePod} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Meaning</label>
                  <textarea name="meaning" className="form-control" rows={3} value={pod.meaning} onChange={handleChangePod} />
                </div>
                <div className="mb-0">
                  <label className="form-label">Example</label>
                  <textarea name="example" className="form-control" rows={3} value={pod.example} onChange={handleChangePod} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Read-only member and meeting */}
        <div className="mb-3">
          <label className="form-label">Member</label>
          <input className="form-control" readOnly value={user?.name || user?.memberName || memberId} />
          <input type="hidden" name="memberId" value={memberId} />
        </div>
        <div className="mb-3">
          <label className="form-label">Meeting</label>
          <input className="form-control" readOnly value={meetingIdState} />
          <input type="hidden" name="meetingId" value={meetingIdState} />
        </div>

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary">Save</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
