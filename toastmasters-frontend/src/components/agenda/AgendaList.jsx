import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import meetingService from '../../api/meetingservice';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';

const AgendaList = () => {
  const [meetings, setMeetings] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchId, setSearchId] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMeetings();
  }, []);

  const toDateTime = (m) => {
    try {
      // Meeting date may be in different keys; normalize
      const raw = m.date || m.meetingDate || m.meeting_day || m.meetingDay;
      const startStr = m.startTime || m.start_time || m.time;
      if (!raw) return null;
      const dateStr = String(raw).trim();

      const buildFromYMD = (y, mo, d) => {
        const dt = new Date(Number(y), Number(mo) - 1, Number(d));
        return dt;
      };

      let dObj = new Date(dateStr);
      if (isNaN(dObj.getTime())) {
        // Try custom parsing for common formats
        const norm = dateStr.replace(/\//g, '-');
        const parts = norm.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            // YYYY-MM-DD
            dObj = buildFromYMD(parts[0], parts[1], parts[2]);
          } else if (parts[2].length === 4) {
            // DD-MM-YYYY
            dObj = buildFromYMD(parts[2], parts[1], parts[0]);
          }
        }
      }

      if (isNaN(dObj.getTime())) return null;

      if (startStr) {
        const [hh, mm] = String(startStr).split(':');
        dObj.setHours(parseInt(hh || 0, 10), parseInt(mm || 0, 10), 0, 0);
      }
      return dObj;
    } catch {
      return null;
    }
  };

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const res = await meetingService.getAllMeetings();
      const data = res?.data?.data ?? res?.data ?? [];
      const list = Array.isArray(data) ? data : [];
      // Sort strictly by date/time descending (latest/newest first). Items without date go last.
      const withDt = list.map(m => ({ ...m, __dt: toDateTime(m) }));
      const withKey = withDt.map(m => ({ ...m, __key: m.__dt ? m.__dt.getTime() : -Infinity }));
      const sorted = withKey
        .sort((a,b) => b.__key - a.__key)
        .map(({__dt, __key, ...rest}) => rest);
      setMeetings(sorted);
      // Default selection: first upcoming else first item
      if (sorted.length > 0) {
        setSelectedMeetingId(sorted[0].meetingId);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      Swal.fire('Error', 'Failed to load meetings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedMeeting = meetings.find(m => m.meetingId === selectedMeetingId);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <i className="fas fa-clipboard-list me-2 text-primary"></i>
          Agenda Management
        </h2>
        <span className="text-muted small">Sorted: Latest → Oldest</span>
      </div>

      {/* Meeting Selector */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center g-3">
            <div className="col-md-6">
              <label htmlFor="meetingSelect" className="form-label">
                Select Meeting:
              </label>
              <select
                id="meetingSelect"
                className="form-select"
                value={selectedMeetingId}
                onChange={(e) => setSelectedMeetingId(e.target.value)}
                disabled={loading}
              >
                <option value="">Choose a meeting...</option>
                {meetings.map((meeting) => {
                  const dt = toDateTime(meeting);
                  const now = new Date();
                  const isUpcoming = dt ? dt.getTime() >= now.getTime() : false;
                  const tag = isUpcoming ? 'Upcoming' : 'Past';
                  return (
                    <option key={meeting.meetingId} value={meeting.meetingId}>
                      [{tag}] {meeting.theme} — {meeting.date} ({meeting.startTime})
                    </option>
                  );
                })}
              </select>
              <div className="form-text">Newest meetings appear at the top.</div>
            </div>
            <div className="col-md-3">
              <label htmlFor="searchMeetingId" className="form-label">
                Search by Meeting ID:
              </label>
              <div className="input-group">
                <span className="input-group-text"><i className="fas fa-hashtag"></i></span>
                <input
                  id="searchMeetingId"
                  type="text"
                  className="form-control"
                  placeholder="e.g. 123"
                  value={searchId}
                  onChange={(e)=> setSearchId(e.target.value)}
                  onKeyDown={(e)=>{
                    if (e.key === 'Enter') {
                      const target = meetings.find(m => String(m.meetingId) === searchId.trim());
                      if (target) setSelectedMeetingId(target.meetingId);
                      else Swal.fire('Not found', `No meeting with ID ${searchId}`, 'info');
                    }
                  }}
                  disabled={loading}
                />
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={()=> setSearchId('')}
                  disabled={loading || !searchId}
                  title="Clear"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="form-text">Type a Meeting ID and press Enter or click Find.</div>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <button
                className="btn btn-outline-primary w-100"
                disabled={loading || !searchId.trim()}
                onClick={() => {
                  const target = meetings.find(m => String(m.meetingId) === searchId.trim());
                  if (target) setSelectedMeetingId(target.meetingId);
                  else Swal.fire('Not found', `No meeting with ID ${searchId}`, 'info');
                }}
              >
                <i className="fas fa-search me-2"></i>Find Meeting
              </button>
            </div>
            {selectedMeeting && (
              <div className="col-md-6">
                <div className="meeting-info">
                  <h6 className="mb-1">Meeting Details:</h6>
                  <p className="mb-0 text-muted">
                    {(() => {
                      const dt = toDateTime(selectedMeeting);
                      const upcoming = dt && dt >= new Date();
                      const cls = `badge ${upcoming ? 'bg-success' : 'bg-secondary'} me-2`;
                      const label = upcoming ? 'Upcoming' : 'Past';
                      return <span className={cls}>{label}</span>;
                    })()}
                    <strong>Theme:</strong> {selectedMeeting.theme}<br />
                    <strong>Date:</strong> {selectedMeeting.date}<br />
                    <strong>Time:</strong> {selectedMeeting.startTime} - {selectedMeeting.endTime}<br />
                    <strong>Venue:</strong> {selectedMeeting.venue}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action */}
      {selectedMeetingId && (
        <div className="card">
          <div className="card-body text-center">
            {user?.role === 'vp education' ? (
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/agenda/complete/${selectedMeetingId}`)}
              >
                <i className="fas fa-edit me-2"></i>View / Edit Complete Agenda
              </button>
            ) : (
              <button
                className="btn btn-outline-info"
                onClick={() => navigate(`/agenda/complete/${selectedMeetingId}`)}
              >
                <i className="fas fa-eye me-2"></i>View Complete Agenda
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaList;
