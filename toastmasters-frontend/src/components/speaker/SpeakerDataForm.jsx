import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import speakerDataService from '../../api/speakerDataService';
import meetingService from '../../api/meetingservice';
import apiService from '../../api/api';
import { useAuth } from '../../context/AuthContext.jsx';

function SpeakerDataForm() {
  const { speakerId } = useParams();
  const isEdit = Boolean(speakerId);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const preselectedMeetingId = searchParams.get('meetingId') || '';

  const [meetings, setMeetings] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    meetingId: preselectedMeetingId,
    memberId: '',
    memberName: '',
    pathwaysTrack: '',
    level: 0,
    projectNo: 0,
    projectTitle: '',
    minSpeechTime: 0,
    maxSpeechTime: 0,
    speechTitle: '',
    speechObjectives: '',
  });

  // fetch base data and auto-populate member
  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [meetingsRes, membersRes] = await Promise.all([
          meetingService.getAllMeetings(),
          apiService.getMembers(),
        ]);
        const meetingsData = meetingsRes?.data?.data || [];
        setMeetings(meetingsData);
        const membersData = membersRes?.data?.data || [];
        setMembers(membersData);

        if (!isEdit && user) {
          // auto-map member by email or id
          let matched = null;
          if (user.memberId) {
            matched = membersData.find(m => String(m.memberId) === String(user.memberId));
          }
          if (!matched && user.email) {
            matched = membersData.find(m => String(m.email || '').toLowerCase() === String(user.email).toLowerCase());
          }
          if (!matched && user.name) {
            matched = membersData.find(m => String(m.memberName || '').toLowerCase() === String(user.name).toLowerCase());
          }
          if (matched) {
            setForm(prev => ({ ...prev, memberId: matched.memberId, memberName: matched.memberName }));
          }
        }

        if (isEdit) {
          const data = await speakerDataService.getById(speakerId);
          setForm({
            meetingId: data?.meetingId ?? preselectedMeetingId ?? '',
            memberId: data?.memberId ?? '',
            memberName: data?.memberName ?? '',
            pathwaysTrack: data?.pathwaysTrack ?? '',
            level: data?.level ?? 0,
            projectNo: data?.projectNo ?? 0,
            projectTitle: data?.projectTitle ?? '',
            minSpeechTime: data?.minSpeechTime ?? 0,
            maxSpeechTime: data?.maxSpeechTime ?? 0,
            speechTitle: data?.speechTitle ?? '',
            speechObjectives: data?.speechObjectives ?? '',
          });
        }
      } catch (e) {
        console.error('Failed to load speaker form data', e);
      }
    };
    fetchInit();
  }, [isEdit, speakerId, user, preselectedMeetingId]);

  // block duplicate add if record exists for member+meeting
  useEffect(() => {
    const checkDuplicate = async () => {
      if (isEdit) return;
      if (!form.meetingId || !form.memberId) return;
      try {
        const res = await speakerDataService.getByMeeting(form.meetingId);
        const arr = res?.data?.data ?? res?.data ?? [];
        const mine = (Array.isArray(arr) ? arr : []).find(x => String(x.memberId) === String(form.memberId));
        if (mine) {
          await Swal.fire({ icon: 'info', title: 'Speech already added', text: 'Redirecting to edit your speech...', timer: 1600, showConfirmButton: false });
          navigate(`/speaker-data/edit/${mine.speakerId || mine.id}`);
        }
      } catch (_) {}
    };
    checkDuplicate();
  }, [isEdit, form.meetingId, form.memberId, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.memberId || !form.meetingId) {
      Swal.fire('Missing data', 'Member or Meeting not set.', 'warning');
      return;
    }
    try {
      if (isEdit) {
        await speakerDataService.update(speakerId, form);
        Swal.fire('Success', 'Speech updated!', 'success');
      } else {
        // guard duplicate
        try {
          const res = await speakerDataService.getByMeeting(form.meetingId);
          const arr = res?.data?.data ?? res?.data ?? [];
          const mine = (Array.isArray(arr) ? arr : []).find(x => String(x.memberId) === String(form.memberId));
          if (mine) {
            Swal.fire('Already Exists', 'You already submitted your speech. Redirecting...', 'info');
            navigate(`/speaker-data/edit/${mine.speakerId || mine.id}`);
            return;
          }
        } catch (_) {}
        await speakerDataService.add(form);
        Swal.fire('Success', 'Speech added!', 'success');
      }
      navigate(`/meetings/${encodeURIComponent(form.meetingId)}`);
    } catch (e) {
      console.error('Failed to save speech', e);
      Swal.fire('Error', 'Failed to save speech.', 'error');
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="fw-bold">{isEdit ? 'Edit Speech' : 'Add Speech'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Meeting</label>
            <select className="form-control" name="meetingId" value={String(form.meetingId)} onChange={handleChange} disabled={!!preselectedMeetingId} required>
              <option value="">Select a Meeting</option>
              {meetings.map(m => (
                <option key={m.meetingId} value={String(m.meetingId)}>{m.date} - {m.theme}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Member</label>
            <input type="text" className="form-control" value={form.memberName || (members.find(m=>String(m.memberId)===String(form.memberId))?.memberName)|| ''} readOnly style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }} />
            <input type="hidden" name="memberId" value={form.memberId} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Pathways Track</label>
            <input className="form-control" name="pathwaysTrack" value={form.pathwaysTrack} onChange={handleChange} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Level</label>
            <input type="number" className="form-control" name="level" value={form.level} onChange={handleChange} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Project No</label>
            <input type="number" className="form-control" name="projectNo" value={form.projectNo} onChange={handleChange} />
          </div>
          <div className="col-md-12">
            <label className="form-label">Project Title</label>
            <input className="form-control" name="projectTitle" value={form.projectTitle} onChange={handleChange} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Min Speech Time (min)</label>
            <input type="number" className="form-control" name="minSpeechTime" value={form.minSpeechTime} onChange={handleChange} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Max Speech Time (min)</label>
            <input type="number" className="form-control" name="maxSpeechTime" value={form.maxSpeechTime} onChange={handleChange} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Speech Title</label>
            <input className="form-control" name="speechTitle" value={form.speechTitle} onChange={handleChange} />
          </div>
          <div className="col-md-12">
            <label className="form-label">Speech Objectives</label>
            <textarea className="form-control" rows={4} name="speechObjectives" value={form.speechObjectives} onChange={handleChange} />
          </div>
          <div className="col-12 mt-3">
            <button type="submit" className="btn btn-primary me-2">{isEdit ? 'Update' : 'Submit'}</button>
            <button type="button" className="btn btn-secondary" onClick={()=>navigate(-1)}>Cancel</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default SpeakerDataForm;
