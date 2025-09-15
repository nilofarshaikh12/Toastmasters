import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import agendaService from "../../api/agendaService";
import meetingService from "../../api/meetingservice";
import apiService from "../../api/api";
import availableMemberService from "../../api/availableMemberService";
import assignedRoleService from "../../api/assignedRoleService";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";
// PDF generation will be handled directly in the component
import './CompleteAgenda.css';
import toastmastersLogo from '../../assets/img/image.png';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


const CompleteAgenda = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meetingData, setMeetingData] = useState(null);
  const [agendaJoinData, setAgendaJoinData] = useState({
    agendaConstantInfo: [],
    clubOfficers: [],
    agenda: [],
    speakerSpeech: [],
    grammarian: [],
    abbreviations: [],
  });

  const [members, setMembers] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [assignedRoles, setAssignedRoles] = useState({});

  const [editSection, setEditSection] = useState(null);
  // Modal visibility for full Agenda editing
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  // Draft agenda data used only inside the modal so main page doesn't update while editing
  const [agendaDraft, setAgendaDraft] = useState(null);
  // Drag-and-drop state for Meeting Agenda rows
  const [dragIndex, setDragIndex] = useState(null);
  // Drag-and-drop state for Speech block rows
  const [speechDragIndex, setSpeechDragIndex] = useState(null);
  const [speechesInsertIndex, setSpeechesInsertIndex] = useState(null); // where to inject speeches
  const [selectedRowRef, setSelectedRowRef] = useState(null); // { zone: 'before'|'after'|'speech', index: number|null }
  const agendaRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isPublished, setIsPublished] = useState(() => {
    try {
      const mid = (typeof meetingId !== 'undefined' && meetingId) ? meetingId : null;
      const key = mid ? `agenda_publish_${mid}` : null;
      if (!key) return false;
      const stored = localStorage.getItem(key);
      return stored != null ? JSON.parse(stored) : false;
    } catch { return false; }
  });
  const [publishing, setPublishing] = useState(false);
  const publishStorageKey = meetingId ? `agenda_publish_${meetingId}` : null;
  const [publishLoaded, setPublishLoaded] = useState(false);

  // Lock background scroll when the full agenda modal is open
  useEffect(() => {
    if (showAgendaModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showAgendaModal]);

  // On mount/load, ensure we have the latest publish state from backend for all users
  useEffect(() => {
    let ignore = false;
    const loadMeetingIfNeeded = async () => {
      try {
        if (!meetingId) return;
        // Always fetch latest meeting data on mount to avoid stale publish state for non-VP users
        let data = null;
        if (typeof meetingService?.getMeetingById === 'function') {
          data = await meetingService.getMeetingById(meetingId);
        } else {
          try {
            const res = await fetch(`/api/meetings/${meetingId}`);
            if (res.ok) data = await res.json();
          } catch {}
        }
        if (!ignore && data) {
          setMeetingData(data);
          const val = !!(data.isPublish ?? data.published);
          if (val !== undefined) {
            setIsPublished(val);
            if (publishStorageKey) try { localStorage.setItem(publishStorageKey, JSON.stringify(val)); } catch {}
          }
          setPublishLoaded(true);
        }
      } catch (e) {
        console.warn('Initial publish state fetch failed:', e);
        setPublishLoaded(true);
      }
    };
    loadMeetingIfNeeded();
    return () => { ignore = true; };
  }, [meetingId]);

  // Initialize publish flag from backend or localStorage (fallback)
  useEffect(() => {
    if (!meetingData) return;
    
    // Check for publish status in the response data structure
    const getPublishStatus = (data) => {
      // Check nested data first (response.data.data)
      if (data?.data?.publish !== undefined) return data.data.publish;
      // Then check direct properties
      if (data?.publish !== undefined) return data.publish;
      // Fallback to older field names if needed
      if (data?.data?.isPublish !== undefined) return data.data.isPublish;
      if (data?.isPublish !== undefined) return data.isPublish;
      if (data?.data?.published !== undefined) return data.data.published;
      if (data?.published !== undefined) return data.published;
      return null;
    };

    const publishStatus = getPublishStatus(meetingData);
    
    if (publishStatus !== null) {
      console.log('Initializing publish status from backend:', publishStatus);
      setIsPublished(!!publishStatus);
      if (publishStorageKey) {
        try {
          localStorage.setItem(publishStorageKey, JSON.stringify(!!publishStatus));
        } catch (e) {
          console.warn('Failed to update localStorage:', e);
        }
      }
    } else if (publishStorageKey) {
      // Fallback to localStorage if no status in backend response
      try {
        const stored = localStorage.getItem(publishStorageKey);
        if (stored != null) {
          const storedValue = JSON.parse(stored);
          console.log('Initializing publish status from localStorage:', storedValue);
          setIsPublished(storedValue);
        }
      } catch (e) {
        console.warn('Failed to read from localStorage:', e);
      }
    }
    
    setPublishLoaded(true);
  }, [meetingData, publishStorageKey]);

  // Poll for publish status for non-VP users until published
  useEffect(() => {
    if (user?.role === 'vp education') return; // VP sees draft regardless
    if (isPublished) return; // already published
    if (!meetingId) return;
    let timer = setInterval(async () => {
      try {
        let data = null;
        if (typeof meetingService?.getMeetingById === 'function') {
          data = await meetingService.getMeetingById(meetingId);
        } else {
          const res = await fetch(`/api/meetings/${meetingId}`);
          if (res.ok) data = await res.json();
        }
        if (data) {
          const val = !!(data.isPublish ?? data.published);
          if (val) {
            setIsPublished(true);
            setMeetingData(data);
            if (publishStorageKey) try { localStorage.setItem(publishStorageKey, JSON.stringify(true)); } catch {}
            clearInterval(timer);
          }
        }
      } catch {}
    }, 15000); // 15s
    return () => clearInterval(timer);
  }, [user?.role, isPublished, meetingId, publishStorageKey]);

  const handleTogglePublish = async () => {
    if (publishing) return;
    const current = !!isPublished;
    const next = !current;
    
    // Confirmation dialog
    const confirm = await Swal.fire({
      title: next ? 'Publish Agenda?' : 'Unpublish Agenda?',
      text: next 
        ? 'This will make the agenda visible to all members.'
        : 'This will hide the agenda from members.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: next ? 'Yes, publish it!' : 'Yes, unpublish it',
      cancelButtonText: 'Cancel'
    });
    
    if (!confirm.isConfirmed) return;

    // Optimistic update
    setIsPublished(next);
    setMeetingData(prev => prev ? { ...prev, isPublish: next, published: next } : prev);
    
    // Update local storage immediately for better UX
    if (publishStorageKey) { 
      try { 
        localStorage.setItem(publishStorageKey, JSON.stringify(next)); 
      } catch (e) {
        console.warn('Failed to update localStorage:', e);
      }
    }

    try {
      setPublishing(true);
      console.log('Toggling publish ->', next, 'for meetingId:', meetingData?.meetingId || meetingId);
      
      // Create a clean update payload with only the fields the backend expects
      const updatePayload = {
        theme: meetingData.theme,
        date: meetingData.date,
        startTime: meetingData.startTime,
        endTime: meetingData.endTime,
        venue: meetingData.venue,
        category: meetingData.category,
        publish: next, // Changed from isPublish to publish to match backend
        // Include roles if they exist
        ...(meetingData.roles && { roles: meetingData.roles })
      };
      
      console.log('Prepared update payload:', JSON.stringify(updatePayload, null, 2));

      let response;
      // Try existing meetingService if present
      if (typeof meetingService !== 'undefined' && meetingData?.meetingId) {
        console.log('Sending update request with payload:', {
          meetingId: meetingData.meetingId,
          payload: updatePayload
        });
        
        try {
          response = await meetingService.updateMeeting(meetingData.meetingId, updatePayload);
          console.log('Update response:', {
            status: response.status,
            statusText: response.statusText,
            data: response.data
          });
        } catch (error) {
          console.error('Update error:', {
            message: error.message,
            response: error.response ? {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data
            } : 'No response',
            request: error.request
          });
          throw error;
        }
      } else if (meetingData?.meetingId) {
        // Fallback generic fetch
        console.log('Using fallback fetch with payload:', updatePayload);
        const fetchResponse = await fetch(`/api/meetings/${meetingData.meetingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });
        
        const responseData = await fetchResponse.json();
        console.log('Fallback fetch response:', {
          status: fetchResponse.status,
          ok: fetchResponse.ok,
          data: responseData
        });
        
        if (!fetchResponse.ok) {
          throw new Error(`Failed to update meeting status: ${fetchResponse.status} ${fetchResponse.statusText}`);
        }
        
        response = { data: responseData };
      } else {
        throw new Error('No meeting ID available');
      }
      
      // Update local state with the response
      if (response?.data) {
        // Get the published status from the response (using 'publish' field)
        const publishedStatus = response.data.publish ?? false;
        console.log('Updating local state with published status from backend:', publishedStatus);
        
        // Update both the meeting data and local state
        setMeetingData(prev => ({
          ...prev,
          ...response.data,
          isPublish: publishedStatus,  // For backward compatibility
          publish: publishedStatus     // New field name
        }));
        
        // Update the published state
        setIsPublished(publishedStatus);
        
        // Update local storage if needed
        if (publishStorageKey) {
          try {
            localStorage.setItem(publishStorageKey, JSON.stringify(publishedStatus));
          } catch (e) {
            console.warn('Failed to update localStorage:', e);
          }
        }
      }
      
      Swal.fire('Success', `Agenda ${next ? 'published' : 'unpublished'} successfully.`, 'success');
    } catch (err) {
      console.error('Publish toggle failed', err);
      // Revert optimistic update on error
      setIsPublished(!next);
      setMeetingData(prev => prev ? { ...prev, isPublish: !next, published: !next } : prev);
      Swal.fire('Error', 'Failed to update publish status. Please try again.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Utility: Ensure each word of a name is Title Cased
  const toTitleCase = (str) => {
    if (!str) return '';
    // Handle multiple spaces and hyphenated names gracefully
    return String(str)
      .split(' ')
      .map(part => part
        .split('-')
        .map(seg => seg ? seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase() : seg)
        .join('-')
      )
      .join(' ');
  };

  // === TimeInput: preserves caret and formats to mm:ss / hh:mm:ss while typing ===
  const TimeInput = React.memo(({ value, onChange, onBlur, placeholder, className, stopRowHandlers = true }) => {
    const [focused, setFocused] = useState(false);
    const [val, setVal] = useState(formatDurationForInput(value) || '');
    const ref = useRef(null);

    useEffect(() => {
      if (!focused) {
        setVal(formatDurationForInput(value) || '');
      }
    }, [value, focused]);

    const formatPartial = (raw) => {
      const digits = (raw || '').replace(/[^0-9]/g, '');
      if (digits.length <= 2) return digits; // s or ss (we treat as mm when complete)
      if (digits.length <= 4) {
        const mm = digits.slice(0, digits.length - 2);
        const ss = digits.slice(-2);
        return `${mm}:${ss}`;
      }
      const hh = digits.slice(0, digits.length - 4);
      const mm = digits.slice(-4, -2);
      const ss = digits.slice(-2);
      return `${hh}:${mm}:${ss}`;
    };

    const handleChange = (e) => {
      const prev = val;
      const caret = e.target.selectionStart ?? prev.length;
      const typed = e.target.value;
      const formatted = formatPartial(typed);
      setVal(formatted);
      if (onChange) onChange({ target: { value: formatted } });
      requestAnimationFrame(() => {
        if (ref.current) {
          const delta = formatted.length - prev.length;
          const pos = Math.min(formatted.length, Math.max(0, (caret + delta)));
          try { ref.current.setSelectionRange(pos, pos); } catch {}
        }
      });
    };

    const handleBlur = () => {
      const formatted = formatDurationForInput(val) || val;
      setVal(formatted);
      if (onBlur) onBlur({ target: { value: formatted } });
      setFocused(false);
      setIsTyping(false);
    };

    return (
      <input
        ref={ref}
        type="text"
        className={className}
        placeholder={placeholder}
        value={val}
        onFocus={() => { setFocused(true); setIsTyping(true); }}
        onChange={handleChange}
        onBlur={handleBlur}
        onClick={stopRowHandlers ? (e)=> e.stopPropagation() : undefined}
        onMouseDown={stopRowHandlers ? (e)=> e.stopPropagation() : undefined}
        onKeyDown={stopRowHandlers ? (e)=> e.stopPropagation() : undefined}
      />
    );
  });

  // Renders the Meeting Agenda table. Pass editing=true to enable full editing controls.
  const AgendaTable = ({ editing = false }) => {
    // Use draft only when editing; use live data for read-only view
    const currentAgenda = editing ? (agendaDraft ?? agendaJoinData) : agendaJoinData;
    const setCurrentAgenda = (next) => {
      if (editing) {
        setAgendaDraft(typeof next === 'function' ? next(agendaDraft ?? agendaJoinData) : next);
      } else {
        setAgendaJoinData(typeof next === 'function' ? next(agendaJoinData) : next);
      }
    };

    // Local helpers to add rows/sections that operate on the current agenda source (draft while editing)
    const addRowAfterIndexLocal = (idx) => {
      setCurrentAgenda((prev) => {
        const base = prev || {};
        const list = [...(base.agenda || [])];
        const insertIdx = Math.min(Math.max(0, idx + 1), list.length);
        const row = {
          agendaId: null,
          clientKey: `ag-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
          minTime: '',
          avgTime: '',
          maxTime: '',
          activity: '',
          member: { memberId: null, memberName: '' },
        };
        list.splice(insertIdx, 0, row);
        return { ...base, agenda: list };
      });
    };

    const addSectionAfterIndexLocal = (idx) => {
      setCurrentAgenda((prev) => {
        const base = prev || {};
        const list = [...(base.agenda || [])];
        const insertIdx = Math.min(Math.max(0, idx + 1), list.length);
        const section = makeSectionHeader('');
        // ensure section has a persistent clientKey
        section.clientKey = section.clientKey || `sec-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        list.splice(insertIdx, 0, section);
        return { ...base, agenda: list };
      });
    };
    return (
      <div className={`table-responsive ${editing ? 'editing-mode' : ''}`}>
        <table className="table table-bordered agenda-grid">
          <thead>
            <tr>
              <th width="120">TIME</th>
              <th width="80" className="text-center">MIN</th>
              <th width="80" className="text-center">AVG</th>
              <th width="80" className="text-center">MAX</th>
              <th>ACTIVITY</th>
              <th width="220">PRESENTER</th>
              {editing && <th width="60">Action</th>}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const start = parseHMToDate(meetingData?.startTime);
              let cursor = start ? new Date(start) : null;
              const rows = [];

              const pushRow = (a, idx, isSpeech = false, zone = 'before') => {
                if (a.rowType === 'section') {
                  rows.push(
                    <tr
                      key={`sec-${a.clientKey ?? a.agendaId ?? idx}`}
                      className={`table-secondary ${selectedRowRef?.zone === zone && selectedRowRef?.index === idx ? 'table-warning' : ''}`}
                      onClick={()=> setSelectedRowRef({ zone, index: idx })}
                      draggable={editing}
                      onDragStart={() => handleAgendaDragStart(idx)}
                      onDragOver={handleAgendaDragOver}
                      onDrop={() => handleAgendaDrop(idx)}
                      style={{ cursor: editing ? 'move' : 'pointer' }}
                    >
                      {editing ? (
                        <>
                          <td className="text-center position-relative" colSpan={6}>
                            <input
                              className="form-control text-center fw-bold"
                              defaultValue={a.activity || ''}
                              placeholder="SECTION TITLE"
                              onClick={(e)=> e.stopPropagation()}
                              onMouseDown={(e)=> e.stopPropagation()}
                              onKeyDown={(e)=> e.stopPropagation()}
                              onFocus={()=> setIsTyping(true)}
                              onBlur={(e)=>{
                                const updated = [...currentAgenda.agenda];
                                updated[idx].activity = e.target.value;
                                setCurrentAgenda({ ...currentAgenda, agenda: updated });
                                setIsTyping(false);
                              }}
                            />
                          </td>
                          <td>
                            <i
                              className="bi bi-trash text-danger delete-icon"
                              title="Delete section"
                              role="button"
                              onClick={(ev)=>{ ev.stopPropagation(); confirmDeleteSection(idx); }}
                            ></i>
                          </td>
                        </>
                      ) : (
                        <td className="text-center position-relative" colSpan={6}>
                          <strong>{(a.activity || '').toUpperCase()}</strong>
                        </td>
                      )}
                    </tr>
                  );
                  return;
                }
                const min = isSpeech ? (a.minSpeechTime || "") : (a.minTime || "");
                let avg = isSpeech ? (a.avgSpeechTime || "") : (a.avgTime || "");
                const max = isSpeech ? (a.maxSpeechTime || "") : (a.maxTime || "");
                if (isSpeech && !editing) {
                  const minSecs = parseDurationToSeconds(min);
                  const maxSecs = parseDurationToSeconds(max);
                  if (minSecs > 0 && maxSecs > 0) {
                    avg = Math.round((minSecs + maxSecs) / 2);
                  }
                }
                // While typing in any input, avoid changing the computed time columns to prevent row reflows
                const useDurSec = (editing && isTyping)
                  ? 0
                  : (parseDurationToSeconds(max || avg || min || 0) || 0);
                const timeStr = cursor ? fmtClock(cursor) : "";
                if (cursor) cursor = addSecondsDate(cursor, useDurSec);

                const hasOnlyOne = (!!min + !!avg + !!max) === 1;
                const presenterName = a.rowType === 'break' ? '' : (isSpeech
                  ? getMemberNameById(a.member?.memberId)
                  : getMemberNameById(a.member?.memberId));
                const activityText = isSpeech
                  ? (() => {
                      const L = a.level ? `L${a.level}` : "";
                      const P = a.projectNo ? `P${a.projectNo}` : "";
                      const bits = [L, P, a.speechTitle].filter(Boolean);
                      return bits.join("  ");
                    })()
                  : a.activity;

                rows.push(
                  <tr
                    key={`ag-${isSpeech ? 'sp' : 'ag'}-${a.clientKey ?? a.agendaId ?? a.speakerSpeechId ?? idx}`}
                    className={`${editing ? '' : 'fade-in'} ${selectedRowRef?.zone === zone && selectedRowRef?.index === idx ? 'table-warning' : ''}`}
                    onClick={(e)=> {
                      const tag = e.target.tagName;
                      if (isTyping || ['SELECT','OPTION','INPUT','BUTTON','TEXTAREA','I','SPAN'].includes(tag)) return;
                      setSelectedRowRef({ zone: isSpeech ? 'speech' : zone, index: isSpeech ? null : idx });
                    }}
                    onMouseDown={(e)=>{
                      const tag = e.target.tagName;
                      if (isTyping || ['SELECT','OPTION','INPUT','BUTTON','TEXTAREA','I','SPAN'].includes(tag)) return;
                    }}
                    draggable={editing && !isTyping}
                    onDragStart={(e) => {
                      const tag = e.target.tagName;
                      if (['SELECT','OPTION','INPUT','BUTTON','TEXTAREA'].includes(tag)) { e.preventDefault(); return; }
                      return isSpeech ? handleSpeechDragStart(idx) : handleAgendaDragStart(idx);
                    }}
                    onDragOver={(e) => (isSpeech ? handleSpeechDragOver(e) : handleAgendaDragOver(e))}
                    onDrop={() => (isSpeech ? handleSpeechDrop(idx) : handleAgendaDrop(idx))}
                    style={{ cursor: editing ? 'move' : 'pointer' }}
                  >
                    <td>{timeStr}</td>
                    {editing && isSpeech ? (
                      <>
                        <td>
                          <TimeInput
                            className="form-control form-control-sm text-center"
                            placeholder="mm:ss or hh:mm:ss"
                            value={min || ''}
                            onChange={() => { /* defer commit to onBlur to avoid rerenders */ }}
                            onBlur={(e)=>{
                              const updated = [...(currentAgenda.speakerSpeech || [])];
                              const listIdx = Math.min(Math.max(0, idx), updated.length - 1);
                              if (!updated[listIdx]) return;
                              updated[listIdx].minSpeechTime = e.target.value;
                              setCurrentAgenda({ ...currentAgenda, speakerSpeech: updated });
                              setIsTyping(false);
                            }}
                          />
                        </td>
                        <td>
                          <TimeInput
                            className="form-control form-control-sm text-center"
                            placeholder="mm:ss or hh:mm:ss"
                            value={avg || ''}
                            onChange={() => { /* defer commit to onBlur to avoid rerenders */ }}
                            onBlur={(e)=>{
                              const updated = [...(currentAgenda.speakerSpeech || [])];
                              const listIdx = Math.min(Math.max(0, idx), updated.length - 1);
                              if (!updated[listIdx]) return;
                              updated[listIdx].avgSpeechTime = e.target.value;
                              setCurrentAgenda({ ...currentAgenda, speakerSpeech: updated });
                              setIsTyping(false);
                            }}
                          />
                        </td>
                        <td>
                          <TimeInput
                            className="form-control form-control-sm text-center"
                            placeholder="mm:ss or hh:mm:ss"
                            value={max || ''}
                            onChange={() => { /* defer commit to onBlur to avoid rerenders */ }}
                            onBlur={(e)=>{
                              const updated = [...(currentAgenda.speakerSpeech || [])];
                              const listIdx = Math.min(Math.max(0, idx), updated.length - 1);
                              if (!updated[listIdx]) return;
                              updated[listIdx].maxSpeechTime = e.target.value;
                              setCurrentAgenda({ ...currentAgenda, speakerSpeech: updated });
                              setIsTyping(false);
                            }}
                          />
                        </td>
                      </>
                    ) : editing && !isSpeech ? (
                      <>
                        <td>
                          <TimeInput
                            className="form-control form-control-sm text-center"
                            placeholder="mm or mm:ss"
                            value={min || ''}
                            onChange={() => { /* defer commit to onBlur to avoid rerenders */ }}
                            onBlur={(e)=>{
                              const updated = [...currentAgenda.agenda];
                              updated[idx].minTime = e.target.value;
                              setCurrentAgenda({ ...currentAgenda, agenda: updated });
                              setIsTyping(false);
                            }}
                          />
                        </td>
                        <td>
                          <TimeInput
                            className="form-control form-control-sm text-center"
                            placeholder="mm or mm:ss"
                            value={avg || ''}
                            onChange={() => { /* defer commit to onBlur to avoid rerenders */ }}
                            onBlur={(e)=>{
                              const updated = [...currentAgenda.agenda];
                              updated[idx].avgTime = e.target.value;
                              setCurrentAgenda({ ...currentAgenda, agenda: updated });
                              setIsTyping(false);
                            }}
                          />
                        </td>
                        <td>
                          <TimeInput
                            className="form-control form-control-sm text-center"
                            placeholder="mm or mm:ss"
                            value={max || ''}
                            onChange={() => { /* defer commit to onBlur to avoid rerenders */ }}
                            onBlur={(e)=>{
                              const updated = [...currentAgenda.agenda];
                              updated[idx].maxTime = e.target.value;
                              setCurrentAgenda({ ...currentAgenda, agenda: updated });
                              setIsTyping(false);
                            }}
                          />
                        </td>
                      </>
                    ) : (
                      hasOnlyOne ? (
                        <td colSpan={3} className="text-center fw-bold">{formatDurationHMS(avg || min || max)}</td>
                      ) : (
                        <>
                          <td className="text-center time-min">{formatDurationHMS(min)}</td>
                          <td className="text-center time-avg">{formatDurationHMS(avg)}</td>
                          <td className="text-center time-max">{formatDurationHMS(max)}</td>
                        </>
                      )
                    )}
                    <td>
                      {editing && !isSpeech && a.rowType !== 'section' ? (
                        <input
                          className="form-control"
                          defaultValue={a.activity || ''}
                          placeholder="Activity"
                          onFocus={()=> setIsTyping(true)}
                          onBlur={(e)=>{
                            const updated = [...currentAgenda.agenda];
                            updated[idx].activity = e.target.value;
                            setCurrentAgenda({ ...currentAgenda, agenda: updated });
                            setIsTyping(false);
                          }}
                          onClick={(e)=> e.stopPropagation()}
                          onMouseDown={(e)=> e.stopPropagation()}
                          onKeyDown={(e)=> e.stopPropagation()}
                        />
                      ) : (
                        <strong>{activityText}</strong>
                      )}
                    </td>
                    <td className="presenter-cell">
                      {editing && !isSpeech && a.rowType !== 'break' && a.rowType !== 'section' ? (
                        <select
                          className="form-select presenter-select"
                          value={a.member?.memberId || ''}
                          onChange={(e) => {
                            const updated = [...currentAgenda.agenda];
                            const val = e.target.value;
                            updated[idx].member = val ? { memberId: Number(val) } : null;
                            setCurrentAgenda({ ...currentAgenda, agenda: updated });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <option value="">Select presenter</option>

                          {/* Available with Assigned Roles */}
                          {members.filter(m => {
                            const isAvailable = availableMembers.some(am => am.memberId === m.memberId);
                            const hasAssigned = (assignedRoles[m.memberId]?.length || 0) > 0;
                            return isAvailable && hasAssigned;
                          }).length > 0 && (
                            <optgroup label="Available with Assigned Roles">
                              {members
                                .filter(m => {
                                  const isAvailable = availableMembers.some(am => am.memberId === m.memberId);
                                  const hasAssigned = (assignedRoles[m.memberId]?.length || 0) > 0;
                                  return isAvailable && hasAssigned;
                                })
                                .sort((a, b) => a.memberName.localeCompare(b.memberName))
                                .map(member => {
                                  const memberRoles = assignedRoles[member.memberId] || [];
                                  const roleText = getRoleNames(memberRoles).join(', ');
                                  return (
                                    <option key={`avail-with-roles-${member.memberId}`} value={member.memberId} title={`Assigned roles: ${roleText}`}>
                                      {toTitleCase(member.memberName)} ({roleText})
                                    </option>
                                  );
                                })}
                            </optgroup>
                          )}

                          {/* Available (No Role Assignments) */}
                          {members.filter(m => {
                            const isAvailable = availableMembers.some(am => am.memberId === m.memberId);
                            const hasAssigned = (assignedRoles[m.memberId]?.length || 0) > 0;
                            const hasPrefs = availableMembers.some(am => am.memberId === m.memberId && ((am.roles && am.roles.length) || (am.preferredRoles && am.preferredRoles.length)));
                            return isAvailable && !hasAssigned && !hasPrefs;
                          }).length > 0 && (
                            <optgroup label="Available (No Role Assignments)">
                              {members
                                .filter(m => {
                                  const isAvailable = availableMembers.some(am => am.memberId === m.memberId);
                                  const hasAssigned = (assignedRoles[m.memberId]?.length || 0) > 0;
                                  const hasPrefs = availableMembers.some(am => am.memberId === m.memberId && ((am.roles && am.roles.length) || (am.preferredRoles && am.preferredRoles.length)));
                                  return isAvailable && !hasAssigned && !hasPrefs;
                                })
                                .sort((a, b) => a.memberName.localeCompare(b.memberName))
                                .map(member => (
                                  <option key={`avail-no-assignments-${member.memberId}`} value={member.memberId} title="Available but not assigned any roles">
                                    {toTitleCase(member.memberName)}
                                  </option>
                                ))}
                            </optgroup>
                          )}

                          {/* Available with Preferred Roles */}
                          {members.filter(m => {
                            const isAvailable = availableMembers.some(am => am.memberId === m.memberId);
                            const hasAssigned = (assignedRoles[m.memberId]?.length || 0) > 0;
                            const hasPrefs = availableMembers.some(am => am.memberId === m.memberId && ((am.roles && am.roles.length) || (am.preferredRoles && am.preferredRoles.length)));
                            return isAvailable && !hasAssigned && hasPrefs;
                          }).length > 0 && (
                            <optgroup label="Available Members (No role assigned)">
                              {members
                                .filter(m => {
                                  const isAvailable = availableMembers.some(am => am.memberId === m.memberId);
                                  const hasAssigned = (assignedRoles[m.memberId]?.length || 0) > 0;
                                  const hasPrefs = availableMembers.some(am => am.memberId === m.memberId && ((am.roles && am.roles.length) || (am.preferredRoles && am.preferredRoles.length)));
                                  return isAvailable && !hasAssigned && hasPrefs;
                                })
                                .sort((a, b) => a.memberName.localeCompare(b.memberName))
                                .map(member => (
                                  <option key={`avail-preferred-${member.memberId}`} value={member.memberId}>
                                    {toTitleCase(member.memberName)}
                                  </option>
                                ))}
                            </optgroup>
                          )}

                          {/* Unavailable Members */}
                          {members.filter(m => !availableMembers.some(am => am.memberId === m.memberId)).length > 0 && (
                            <optgroup label="Unavailable Members">
                              {members
                                .filter(member => !availableMembers.some(am => am.memberId === member.memberId))
                                .sort((a, b) => a.memberName.localeCompare(b.memberName))
                                .map(member => {
                                  const memberRoles = assignedRoles[member.memberId] || [];
                                  const roleText = getRoleNames(memberRoles).join(', ');
                                  return (
                                    <option key={`unavailable-${member.memberId}`} value={member.memberId} className="unavailable-option" title={roleText ? `Assigned roles: ${roleText}` : 'No roles assigned'}>
                                      {toTitleCase(member.memberName)} (Not available){roleText && ` - ${roleText}`}
                                    </option>
                                  );
                                })}
                            </optgroup>
                          )}
                        </select>
                      ) : (
                        <div className="presenter-name">
                          {toTitleCase(presenterName) || (a.rowType !== 'break' ? 'TBD' : '')}
                        </div>
                      )}
                    </td>
                    {editing && (
                      <td>
                        {!isSpeech && (
                          <>
                            <i
                              className="bi bi-plus-circle text-primary me-2 delete-icon"
                              title="Add row after"
                              role="button"
                              onClick={(e) => { e.stopPropagation(); addRowAfterIndexLocal(idx); }}
                            ></i>
                            <i
                              className="bi bi-card-heading text-secondary me-2 delete-icon"
                              title="Add section after"
                              role="button"
                              onClick={(e) => { e.stopPropagation(); addSectionAfterIndexLocal(idx); }}
                            ></i>
                          </>
                        )}
                        {isSpeech ? (
                          <i className="bi bi-trash text-danger delete-icon" onClick={() => confirmDeleteSpeech(idx)} title="Delete prepared speech" role="button"></i>
                        ) : (
                          <i className="bi bi-trash text-danger delete-icon" onClick={() => confirmDeleteAgendaRow(idx)} title="Delete agenda item" role="button"></i>
                        )}
                      </td>
                    )}
                  </tr>
                );
              };

              const agendaList = currentAgenda.agenda || [];
              const spList = currentAgenda.speakerSpeech || [];
              const insertAt = Math.min(Math.max(0, speechesInsertIndex ?? agendaList.length), agendaList.length);

              agendaList.slice(0, insertAt).forEach((a, idx) => pushRow(a, idx, false));
              if (spList.length > 0) {
                const isSelectedHeader = selectedRowRef?.zone === 'speech' && selectedRowRef?.index == null;
                rows.push(
                  <tr key="ps-header" className={`table-secondary ${isSelectedHeader ? 'table-warning' : ''}`} onClick={()=> setSelectedRowRef({ zone: 'speech', index: null, header: true })} style={{ cursor: 'pointer' }} title="Click to insert after speeches">
                    <td className="text-center" colSpan={editing ? 7 : 6}><strong>PREPARED SPEECHES SESSION</strong></td>
                  </tr>
                );
                spList.forEach((s, i) => pushRow(s, i, true));
              }
              agendaList.slice(insertAt).forEach((a, idx) => pushRow(a, insertAt + idx, false));

              return rows;
            })()}
          </tbody>
        </table>
      </div>
    );
  };

  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  };

  const handleDownloadPDF = () => {
    if (!agendaJoinData || !meetingData) {
      Swal.fire('Error', 'Agenda data not loaded yet', 'warning');
      return;
    }

    console.log('agendaJoinData:', JSON.stringify(agendaJoinData, null, 2)); // Debug log

    const addHeader = (pdf, pageNumber) => {
      const logoWidth = 25;
      const logoHeight = 25;
      pdf.addImage(toastmastersLogo, 'PNG', 14, 10, logoWidth, logoHeight);
      
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Toastmasters Club Agenda', 105, 20, { align: 'center' });
      
      const meetingDate = meetingData?.meetingDate
        ? new Date(meetingData.meetingDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : 'N/A';
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Meeting Date: ${meetingDate}`, 105, 26, { align: 'center' });
      
      // Add page number
      pdf.setFontSize(8);
      pdf.text(`Page ${pageNumber}`, 200, 10, { align: 'right' });
      
      // Add a line under header
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(14, 32, 196, 32);
      
      return 35; // Return the Y position after header
    };

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      let currentY = 0;
      let pageNumber = 1;
      
      currentY = addHeader(pdf, pageNumber);

    // Club Officers Section
    if (agendaJoinData.clubOfficers && agendaJoinData.clubOfficers.length) {
      // Check if we need a new page
      if (currentY > 250) {
        pdf.addPage();
        pageNumber++;
        currentY = addHeader(pdf, pageNumber);
      }
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Club Officers', 14, currentY);
      currentY += 8;
      
      autoTable(pdf, {
        startY: currentY,
        head: [['Role', 'Name']],
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        body: agendaJoinData.clubOfficers.map(officer => ({
          'Role': officer.role || 'N/A',
          'Name': officer.member?.memberName || officer.name || 'Unassigned'
        })),
        theme: 'grid',
        styles: { 
          fontSize: 10,
          cellPadding: 3,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Handle page breaks
          if (data.cursor.y > 250) {
            pdf.addPage();
            pageNumber++;
            currentY = addHeader(pdf, pageNumber);
          } else {
            currentY = data.cursor.y + 10;
          }
        }
      });
      currentY = pdf.lastAutoTable.finalY + 10;
    }

    // Agenda Items Section
    if (agendaJoinData.agenda && agendaJoinData.agenda.length) {
      // Check if we need a new page
      if (currentY > 230) {
        pdf.addPage();
        pageNumber++;
        currentY = addHeader(pdf, pageNumber);
      }
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Meeting Agenda', 14, currentY);
      currentY += 8;
      
      // Group agenda items by time slot for better organization
      const timeSlots = {};
      agendaJoinData.agenda.forEach(item => {
        const time = item.time || 'Unspecified Time';
        if (!timeSlots[time]) {
          timeSlots[time] = [];
        }
        timeSlots[time].push(item);
      });
      
      // Process each time slot
      Object.entries(timeSlots).forEach(([time, items]) => {
        // Check if we need a new page before adding time slot
        if (currentY > 230) {
          pdf.addPage();
          pageNumber++;
          currentY = addHeader(pdf, pageNumber);
        }
        
        // Add time slot header
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(time, 14, currentY);
        currentY += 5;
        
        // Add items for this time slot
        items.forEach((item, index) => {
          if (currentY > 250) {
            pdf.addPage();
            pageNumber++;
            currentY = addHeader(pdf, pageNumber);
          }
          
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          
          // Activity in bold
          pdf.setFont('helvetica', 'bold');
          pdf.text(`• ${item.activity || 'Activity'}`, 20, currentY);
          
          // Assigned to in normal weight on the same line if space, otherwise on next line
          const assignedTo = item.member?.memberName || item.assignedTo || '';
          const activityWidth = pdf.getStringUnitWidth(item.activity || '') * 9 / pdf.internal.scaleFactor;
          
          if (activityWidth < 100 && assignedTo) {
            pdf.setFont('helvetica', 'normal');
            pdf.text(` - ${assignedTo}`, 21 + activityWidth, currentY);
          } else if (assignedTo) {
            currentY += 4;
            pdf.text(`  (${assignedTo})`, 21, currentY);
          }
          
          currentY += 5;
        });
        
        currentY += 3; // Extra space between time slots
      });
      
      currentY += 5; // Extra space after section
    }

    // Speaker Speeches Section
    if (agendaJoinData.speakerSpeech && agendaJoinData.speakerSpeech.length) {
      // Check if we need a new page
      if (currentY > 220) {
        pdf.addPage();
        pageNumber++;
        currentY = addHeader(pdf, pageNumber);
      }
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Prepared Speeches', 14, currentY);
      currentY += 8;
      
      // Process each speech
      agendaJoinData.speakerSpeech.forEach((speech, index) => {
        // Check if we need a new page before adding speech
        if (currentY > 250) {
          pdf.addPage();
          pageNumber++;
          currentY = addHeader(pdf, pageNumber);
        }
        
        const speakerName = speech.member?.memberName || speech.speakerName || 'Speaker';
        const speechTitle = speech.title || 'Untitled Speech';
        const speechLevel = speech.level ? `L${speech.level}` : '';
        const speechProject = speech.project ? `P${speech.project}` : '';
        const speechInfo = [speechLevel, speechProject].filter(Boolean).join(' / ');
        
        // Speech title in bold
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`• ${speechTitle}`, 20, currentY);
        currentY += 5;
        
        // Speaker and project info
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        
        // First line: Speaker name and speech info (level/project)
        pdf.text(`  ${speakerName}`, 22, currentY);
        if (speechInfo) {
          const nameWidth = pdf.getStringUnitWidth(speakerName) * 9 / pdf.internal.scaleFactor;
          pdf.text(` (${speechInfo})`, 22 + nameWidth + 2, currentY);
        }
        currentY += 4;
        
        // Evaluator if exists
        if (speech.evaluatorName) {
          pdf.text(`  Evaluator: ${speech.evaluatorName}`, 22, currentY);
          currentY += 4;
        }
        
        // Speech description if exists
        if (speech.description) {
          const descLines = pdf.splitTextToSize(speech.description, 170);
          pdf.text(descLines, 22, currentY);
          currentY += descLines.length * 5;
        }
        
        currentY += 6; // Space between speeches
      });
      
      currentY += 5; // Extra space after section
    }

    // Grammarian Section
    if (agendaJoinData.grammarian && agendaJoinData.grammarian.length) {
      // Check if we need a new page
      if (currentY > 240) {
        pdf.addPage();
        pageNumber++;
        currentY = addHeader(pdf, pageNumber);
      }
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Word of the Day', 14, currentY);
      currentY += 8;
      
      agendaJoinData.grammarian.forEach(word => {
        // Check if we need a new page before adding word
        if (currentY > 250) {
          pdf.addPage();
          pageNumber++;
          currentY = addHeader(pdf, pageNumber);
        }
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`• ${word.word || 'Word of the Day'}`, 20, currentY);
        currentY += 5;
        
        if (word.meaning) {
          pdf.setFont('helvetica', 'normal');
          const meaningLines = pdf.splitTextToSize(word.meaning, 170);
          pdf.text(meaningLines, 22, currentY);
          currentY += meaningLines.length * 5;
        }
        
        if (word.example) {
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(9);
          pdf.setTextColor(100, 100, 100);
          const exampleText = `Example: ${word.example}`;
          const exampleLines = pdf.splitTextToSize(exampleText, 165);
          pdf.text(exampleLines, 24, currentY);
          currentY += exampleLines.length * 5;
          pdf.setTextColor(0, 0, 0); // Reset color
        }
        
        currentY += 6; // Space between words
      });
    }

    // Abbreviations Section
    if (agendaJoinData.abbreviations && agendaJoinData.abbreviations.length) {
      // Check if we need a new page
      if (currentY > 240) {
        pdf.addPage();
        pageNumber++;
        currentY = addHeader(pdf, pageNumber);
      }
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Abbreviations', 14, currentY);
      currentY += 8;
      
      // Calculate how many columns we can fit
      const pageWidth = 180; // mm
      const colWidth = 85; // mm per column
      const maxCols = Math.floor(pageWidth / colWidth);
      const itemsPerCol = Math.ceil(agendaJoinData.abbreviations.length / maxCols);
      
      // Create columns for abbreviations
      let col = 0;
      let colX = 14; // Starting X position
      let colY = currentY;
      
      agendaJoinData.abbreviations.forEach((abbr, index) => {
        // Check if we need a new column
        if (index > 0 && index % itemsPerCol === 0) {
          col++;
          colX = 14 + (col * colWidth);
          colY = currentY;
        }
        
        // Check if we need a new page
        if (colY > 250) {
          pdf.addPage();
          pageNumber++;
          currentY = addHeader(pdf, pageNumber);
          colY = currentY;
          // Reset column positions
          col = 0;
          colX = 14;
        }
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        
        // Abbreviation in bold
        pdf.text(abbr.abbreviation || 'Abbr', colX, colY);
        
        // Description in normal weight
        const abbrWidth = pdf.getStringUnitWidth(abbr.abbreviation || 'Abbr') * 9 / pdf.internal.scaleFactor;
        pdf.setFont('helvetica', 'normal');
        
        // Split description into multiple lines if needed
        const descLines = pdf.splitTextToSize(abbr.description || '', colWidth - abbrWidth - 10);
        
        if (descLines.length === 1) {
          // Single line, put on same line as abbreviation
          pdf.text(`: ${descLines[0]}`, colX + abbrWidth + 2, colY);
          colY += 5; // Line height
        } else {
          // Multiple lines, put description on new line
          pdf.text(`: ${descLines[0]}`, colX + abbrWidth + 2, colY);
          for (let i = 1; i < descLines.length; i++) {
            colY += 4;
            pdf.text(descLines[i], colX + abbrWidth + 2, colY);
          }
          colY += 6; // Extra space after multi-line description
        }
        
        colY += 4; // Space between items
      });
      
      currentY = Math.max(currentY, colY) + 5; // Ensure we're at the bottom of the tallest column
    }

    // Add footer to last page
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Generated by Toastmasters Agenda Manager', 105, 287, { align: 'center' });
    
    // Save PDF with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    pdf.save(`Toastmasters-Agenda-${meetingData?.meetingId || 'meeting'}-${timestamp}.pdf`);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    Swal.fire({
      icon: 'error',
      title: 'PDF Generation Failed',
      text: 'An error occurred while generating the PDF.',
      footer: error.message ? `Error: ${error.message}` : ''
    });
  }
};
   
  
  useEffect(() => {
    if (meetingId) {
      console.log('Meeting ID from URL params:', meetingId);
      fetchCompleteAgendaData();
      fetchAvailableMembers();
      fetchAssignedRoles();
    }
  }, [meetingId]);

  // Fetch available members for the meeting (robust method)
const fetchAvailableMembers = async () => {
  try {
    console.log('Fetching available members for meeting:', meetingId);
    const response = await availableMemberService
      .getAvailableMembersByMeetingRobust(meetingId)
      .catch(() => null);

    if (!response) {
      console.log('Available members endpoint not available');
      return;
    }

    console.log('Available members response:', response);

    // Handle both array and object responses
    let members = [];
    if (Array.isArray(response)) {
      members = response;
    } else if (Array.isArray(response?.data)) {
      members = response.data;
    }

    console.log('Parsed available members:', members);

    // Transform the response to match the expected format
    const formattedMembers = members.map((member) => ({
      memberId: member.memberId,
      memberName: member.memberName || `Member ${member.memberId}`,
      availabilityStatus: member.availabilityStatus || 'UNKNOWN',
      preferredRoles: Array.isArray(member.preferredRoles)
        ? member.preferredRoles
        : [],
    }));

    console.log('Setting available members:', formattedMembers);
    setAvailableMembers(formattedMembers);
  } catch (error) {
    console.error('Error in fetchAvailableMembers:', error);
  }
};

// Helper function to get role names from role objects or strings
const getRoleNames = (roles) => {
  if (!roles) return [];
  if (Array.isArray(roles)) {
    return roles
      .map((role) => {
        if (typeof role === 'string') return role;
        if (role.roleName) return role.roleName;
        if (role.name) return role.name;
        return '';
      })
      .filter(Boolean);
  }
  // Handle case where roles is an object with role names as values
  if (typeof roles === 'object') {
    return Object.values(roles).flat().filter(Boolean);
  }
  return [];
};

// Fetch assigned roles for the meeting
const fetchAssignedRoles = async () => {
  try {
    console.log('Fetching assigned roles for meeting:', meetingId);
    const response = await assignedRoleService
      .getAssignedRolesByMeeting(meetingId)
      .catch(() => null);

    if (!response) {
      console.log(
        'Assigned roles endpoint not available, falling back to preferred roles'
      );
      return;
    }

    console.log('Assigned roles response:', response);

    // The response is an object with a data property containing the array
    const roles = Array.isArray(response.data) ? response.data : [];
    console.log('Parsed assigned roles:', roles);

    const rolesByMember = {};
    roles.forEach((role) => {
      if (role.memberId) {
        if (!rolesByMember[role.memberId]) {
          rolesByMember[role.memberId] = [];
        }
        // Handle both object and string role formats
        if (role.roleName) {
          rolesByMember[role.memberId].push(role.roleName);
        } else if (role.role) {
          rolesByMember[role.memberId].push(role.role);
        } else if (role.name) {
          rolesByMember[role.memberId].push(role.name);
        } else if (typeof role === 'string') {
          rolesByMember[role.memberId].push(role);
        }
      }
    });

    // Only update if we found roles
    if (Object.keys(rolesByMember).length > 0) {
      console.log('Setting assigned roles:', rolesByMember);
      setAssignedRoles((prevRoles) => ({
        ...prevRoles,
        ...rolesByMember,
      }));
    } else {
      console.log('No roles found in the response');
    }
  } catch (error) {
    console.error('Error fetching assigned roles:', error);
  }
};

// Format member name with their roles (🚀 shows only assigned roles)
const getMemberWithRoles = (memberId) => {
  const member = members.find((m) => m.memberId === memberId);
  if (!member) return 'Unknown Member';

  const roles = assignedRoles[memberId];
  return roles && roles.length > 0
    ? `${member.memberName} (${getRoleNames(roles).join(', ')})`
    : member.memberName;
};

// Load roster for member selectors
useEffect(() => {
  const loadMembers = async () => {
    try {
      const res = await apiService.getMembers();
      const data = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
        ? res.data
        : [];
      // Normalize minimal structure
      const roster = (data || []).map((m) => ({
        memberId: Number(m.memberId || m.id),
        memberName: m.memberName || m.name || '',
      }));
      setMembers(roster);
    } catch (e) {
      console.error('Failed to load members', e);
    }
  };

  loadMembers();
}, []);

// Convenience: add at top (row 0)
const addAgendaAtTop = () => {
  setAgendaJoinData((prev) => {
    const list = [...(prev.agenda || [])];
    const row = {
      agendaId: null,
      clientKey: Date.now(),
      minTime: '',
      avgTime: '',
      maxTime: '',
      activity: '',
      member: { memberId: null, memberName: '' },
    };
    list.splice(0, 0, row);
    setSpeechesInsertIndex((speechesInsertIndex ?? 0) + 1);
    return { ...prev, agenda: list };
  });
};


  const addSectionAtTop = () => {
    setAgendaJoinData((prev) => {
      const list = [...(prev.agenda || [])];
      list.splice(0, 0, makeSectionHeader(''));
      setSpeechesInsertIndex(((speechesInsertIndex ?? 0) + 1));
      return { ...prev, agenda: list };
    });
  };

  // Special rows: Section Header and Break
  const makeSectionHeader = (title = "") => ({
    agendaId: null,
    clientKey: Date.now(),
    rowType: 'section',
    activity: title || 'SECTION',
    minTime: '', avgTime: '', maxTime: '',
    member: null,
  });
  const makeBreakRow = (title = "5 MINUTES BREAK") => ({
    agendaId: null,
    clientKey: Date.now(),
    rowType: 'break',
    activity: title,
    // default duration 5 in max to match clock usage (max -> avg -> min)
    minTime: '', avgTime: '', maxTime: '5',
    member: null,
  });

  const addSectionHeaderBeforeSpeeches = () => {
    setAgendaJoinData((prev) => {
      const list = [...(prev.agenda || [])];
      const idx = Math.min(Math.max(0, speechesInsertIndex ?? list.length), list.length);
      list.splice(idx, 0, makeSectionHeader('EVALUATION SESSION'));
      setSpeechesInsertIndex(idx + 1);
      return { ...prev, agenda: list };
    });
  };
  const addSectionHeaderAfterSpeeches = () => {
    setAgendaJoinData((prev) => {
      const list = [...(prev.agenda || [])];
      const idx = Math.min(Math.max(0, speechesInsertIndex ?? list.length), list.length);
      list.splice(idx, 0, makeSectionHeader('EVALUATION SESSION'));
      return { ...prev, agenda: list };
    });
  };
  const addBreakBeforeSpeeches = () => {
    setAgendaJoinData((prev) => {
      const list = [...(prev.agenda || [])];
      const idx = Math.min(Math.max(0, speechesInsertIndex ?? list.length), list.length);
      list.splice(idx, 0, makeBreakRow('M I N U T E S   B R E A K'));
      setSpeechesInsertIndex(idx + 1);
      return { ...prev, agenda: list };
    });
  };
  const addBreakAfterSpeeches = () => {
    setAgendaJoinData((prev) => {
      const list = [...(prev.agenda || [])];
      const idx = Math.min(Math.max(0, speechesInsertIndex ?? list.length), list.length);
      list.splice(idx, 0, makeBreakRow('M I N U T E S   B R E A K'));
      return { ...prev, agenda: list };
    });
  };

  // Generic: add a section row (user can type any title). Insert at speeches index and shift index forward
  const addSectionGeneric = () => {
    const title = window.prompt('Section title', '') ?? '';
    setAgendaJoinData((prev) => {
      const list = [...(prev.agenda || [])];
      const idx = Math.min(Math.max(0, speechesInsertIndex ?? list.length), list.length);
      list.splice(idx, 0, makeSectionHeader(title));
      setSpeechesInsertIndex(idx + 1);
      return { ...prev, agenda: list };
    });
  };

  // Insert helpers based on selected row
  const ensureSelection = () => {
    if (!selectedRowRef) {
      window.alert('Click on a row first, then use Add Row or Add Section.');
      return false;
    }
    return true;
  };

  const insertIntoAgendaAt = (list, insertIdx, newRow, shiftSpeeches = true) => {
    const idx = Math.min(Math.max(0, insertIdx), list.length);
    list.splice(idx, 0, newRow);
    // Shift speeches index if insertion is before speeches
    if (shiftSpeeches && (speechesInsertIndex ?? 0) >= idx) {
      setSpeechesInsertIndex((speechesInsertIndex ?? 0) + 1);
    }
    return list;
  };

  // === Drag-and-Drop handlers for Meeting Agenda (non-speech rows) ===
  const handleAgendaDragStart = (idx) => {
    if (editSection !== 'agenda') return;
    setDragIndex(idx);
  };

  const handleAgendaDragOver = (e) => {
    if (editSection !== 'agenda') return;
    e.preventDefault();
  };

  const handleAgendaDrop = (targetIdx) => {
    if (editSection !== 'agenda') return;
    if (dragIndex === null || dragIndex === targetIdx) return;
    setAgendaJoinData((prev) => {
      const list = [...(prev.agenda || [])];
      const from = Math.min(Math.max(0, dragIndex), list.length - 1);
      const to = Math.min(Math.max(0, targetIdx), list.length - 1);
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return { ...prev, agenda: list };
    });
    // Keep speeches block location consistent relative to rows
    setSpeechesInsertIndex((oldIdx) => {
      const oldVal = oldIdx ?? 0;
      let newVal = oldVal;
      if (dragIndex < oldVal && targetIdx >= oldVal) newVal = oldVal - 1; // row moved from before -> after
      else if (dragIndex >= oldVal && targetIdx < oldVal) newVal = oldVal + 1; // row moved from after -> before
      return Math.max(0, newVal);
    });
    setDragIndex(null);
  };

  // === Drag-and-Drop handlers for Speeches (within speech block only) ===
  const handleSpeechDragStart = (idx) => {
    if (editSection !== 'agenda') return;
    setSpeechDragIndex(idx);
  };

  const handleSpeechDragOver = (e) => {
    if (editSection !== 'agenda') return;
    e.preventDefault();
  };

  const handleSpeechDrop = (targetIdx) => {
    if (editSection !== 'agenda') return;
    if (speechDragIndex === null || speechDragIndex === targetIdx) return;
    setAgendaJoinData((prev) => {
      const list = [...(prev.speakerSpeech || [])];
      const from = Math.min(Math.max(0, speechDragIndex), list.length - 1);
      const to = Math.min(Math.max(0, targetIdx), list.length - 1);
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return { ...prev, speakerSpeech: list };
    });
    setSpeechDragIndex(null);
  };

  const addRowAfterSelected = () => {
    if (!ensureSelection()) return;
    const { zone, index } = selectedRowRef;
    setAgendaJoinData((prev) => {
      const list = [...(prev.agenda || [])];
      const baseRow = {
        agendaId: null,
        clientKey: Date.now(),
        minTime: '', avgTime: '', maxTime: '',
        activity: '',
        member: { memberId: null, memberName: '' },
      };
      if (zone === 'speech') {
        // Insert at start of after-slice (i.e., right after speeches block)
        // Do NOT shift speeches index here, otherwise it moves above the new row
        insertIntoAgendaAt(list, (speechesInsertIndex ?? list.length), baseRow, false);
        return { ...prev, agenda: list };
      }
      // zone 'before' or 'after' -> index is actual agenda index
      insertIntoAgendaAt(list, (index ?? list.length) + 1, baseRow);
      return { ...prev, agenda: list };
    });
  };

  const addSectionAfterSelected = () => {
    if (!ensureSelection()) return;
    const { zone, index } = selectedRowRef;
    setAgendaJoinData((prev) => {
      const list = [...(prev.agenda || [])];
      const newRow = makeSectionHeader('');
      if (zone === 'speech') {
        insertIntoAgendaAt(list, (speechesInsertIndex ?? list.length), newRow, false);
        return { ...prev, agenda: list };
      }
      insertIntoAgendaAt(list, (index ?? list.length) + 1, newRow);
      return { ...prev, agenda: list };
    });
  };

  const getMemberNameById = (id) => {
    if (!id) return "";
    const m = members.find(x => Number(x.memberId) === Number(id));
    return m?.memberName || "";
  };

  const fetchCompleteAgendaData = async () => {
    try {
      setLoading(true);
      const normalize = (res) => res?.data?.data ?? res?.data ?? res ?? null;

      const mRes = await meetingService.getMeetingById(meetingId);
      setMeetingData(normalize(mRes));

      const ajRes = await agendaService.getCompleteAgenda(meetingId);
      const raw = normalize(ajRes) || {};
      const constants = raw?.agendaConstantInfo || [];
      // reconstruct sections from constants
      let reconstructedAgenda = [...(raw.agenda || [])];
      try {
        const sectionsConst = constants.find(ci => (ci.infoName || '').toLowerCase() === 'sections');
        const arr = sectionsConst ? JSON.parse(sectionsConst.infoDetail || '[]') : [];
        if (Array.isArray(arr) && arr.length) {
          // insert in ascending order of index
          arr.sort((a,b)=> (a?.index||0) - (b?.index||0)).forEach(sec => {
            const idx = Math.min(Math.max(0, parseInt(sec?.index ?? 0, 10) || 0), reconstructedAgenda.length);
            reconstructedAgenda.splice(idx, 0, {
              agendaId: null,
              clientKey: `sec-${idx}-${Date.now()}`,
              rowType: 'section',
              activity: sec?.title || 'SECTION',
              minTime: '', avgTime: '', maxTime: '',
              member: null,
            });
          });
        }
      } catch (e) { console.warn('Failed to reconstruct sections', e); }

      const data = { ...raw, agenda: reconstructedAgenda };
      setAgendaJoinData(data);
      // restore speeches insertion index from constants if present, else default to end
      const speechIdxConst = constants.find(ci => (ci.infoName || '').toLowerCase() === 'speechesafterrow');
      const parsedIdx = speechIdxConst ? parseInt(speechIdxConst.infoDetail || '0', 10) : NaN;
      const fallbackIdx = Array.isArray(data?.agenda) ? data.agenda.length : 0;
      setSpeechesInsertIndex(Number.isFinite(parsedIdx) && parsedIdx >= 0 ? parsedIdx : fallbackIdx);
    } catch (err) {
      console.error("Error fetching agenda:", err);
      Swal.fire("Error", "Failed to load agenda data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Transform data to ensure proper backend format
  const transformDataForBackend = (data) => {
    const transformedData = { ...data };

    // Transform agenda items - ensure member has proper structure and squash single time
    if (transformedData.agenda) {
      // Remove UI-only rows that backend doesn't support (no member allowed): section headers and breaks
      const agendaFiltered = transformedData.agenda.filter(item => item.rowType !== 'section' && item.rowType !== 'break');
    
      transformedData.agenda = agendaFiltered.map((item, idx) => {
        const copy = { ...item };
        delete copy.clientKey;
        delete copy.rowType; // client-only
    
        if (copy.agendaId == null || copy.agendaId === 0) {
          copy.agendaId = null;
        } else {
          copy.agendaId = Number(copy.agendaId);
          if (copy.version != null) copy.version = Number(copy.version);
        }
    
        copy.member = (item.member && item.member.memberId)
          ? { memberId: Number(item.member.memberId) }
          : null;
    
        const hasMin = !!(copy.minTime ?? '').toString().trim();
        const hasAvg = !!(copy.avgTime ?? '').toString().trim();
        const hasMax = !!(copy.maxTime ?? '').toString().trim();
        const count = (hasMin ? 1 : 0) + (hasAvg ? 1 : 0) + (hasMax ? 1 : 0);
    
        if (count === 1) {
          const val = (copy.avgTime || copy.minTime || copy.maxTime) || '';
          copy.minTime = null;
          copy.maxTime = null;
          copy.avgTime = val;
        }
    
        // Normalize to numeric seconds for backend
        copy.minTime = hasMin ? toBackendSeconds(copy.minTime) : null;
        copy.avgTime = hasAvg || count === 1 ? toBackendSeconds(copy.avgTime) : null;
        copy.maxTime = hasMax ? toBackendSeconds(copy.maxTime) : null;
    
        // <-- Add orderIndex for drag-and-drop persistence
        copy.orderIndex = idx;
    
        return copy;
      });
    }    

    // Transform speaker speeches - squash single time
    if (transformedData.speakerSpeech) {
      transformedData.speakerSpeech = transformedData.speakerSpeech.map((s) => {
        const copy = { ...s };
        delete copy.clientKey;
        if (copy.speakerId == null || copy.speakerId === 0) copy.speakerId = null;
        else copy.speakerId = Number(copy.speakerId);
        copy.member = (s.member && s.member.memberId)
          ? { memberId: Number(s.member.memberId) }
          : null;
        const hasMinS = !!(copy.minSpeechTime ?? '').toString().trim();
        const hasAvgS = !!(copy.avgSpeechTime ?? '').toString().trim();
        const hasMaxS = !!(copy.maxSpeechTime ?? '').toString().trim();
        const countS = (hasMinS ? 1 : 0) + (hasAvgS ? 1 : 0) + (hasMaxS ? 1 : 0);
        if (countS === 1) {
          const valS = (copy.avgSpeechTime || copy.minSpeechTime || copy.maxSpeechTime) || '';
          copy.minSpeechTime = null;
          copy.maxSpeechTime = null;
          copy.avgSpeechTime = valS;
        }
        // If avg is missing but both min and max present, compute average in seconds
        if (!copy.avgSpeechTime && copy.minSpeechTime && copy.maxSpeechTime) {
          const minS = parseDurationToSeconds(copy.minSpeechTime);
          const maxS = parseDurationToSeconds(copy.maxSpeechTime);
          if (minS > 0 && maxS > 0) {
            copy.avgSpeechTime = Math.round((minS + maxS) / 2);
          }
        }
        // Normalize to numeric seconds for backend
        copy.minSpeechTime = hasMinS ? toBackendSeconds(copy.minSpeechTime) : null;
        copy.avgSpeechTime = hasAvgS || countS === 1 ? toBackendSeconds(copy.avgSpeechTime) : null;
        copy.maxSpeechTime = hasMaxS ? toBackendSeconds(copy.maxSpeechTime) : null;
        return copy;
      });
    }

    // Transform grammarian entries
    if (transformedData.grammarian) {
      transformedData.grammarian = transformedData.grammarian.map((item) => {
        const copy = { ...item };
        delete copy.clientKey;
        if (copy.grammarianId == null || copy.grammarianId === 0) {
          copy.grammarianId = null;
        } else {
          copy.grammarianId = Number(copy.grammarianId);
          if (copy.version != null) copy.version = Number(copy.version);
        }
        copy.member = (item.member && item.member.memberId)
          ? { memberId: Number(item.member.memberId) }
          : null;
        return copy;
      });
    }

    // Transform club officers - ensure member has proper structure
    if (transformedData.clubOfficers) {
      transformedData.clubOfficers = transformedData.clubOfficers.map((item) => {
        const copy = { ...item };
        delete copy.clientKey;
        if ('clubOfficerId' in copy) {
          if (copy.clubOfficerId == null || copy.clubOfficerId === 0) {
            copy.clubOfficerId = null;
          } else {
            copy.clubOfficerId = Number(copy.clubOfficerId);
            if (copy.version != null) copy.version = Number(copy.version);
          }
        }
        copy.member = (item.member && item.member.memberId)
          ? { memberId: Number(item.member.memberId) }
          : null;
        return copy;
      });
    }

    return transformedData;
  };

  const handleSaveAgenda = async () => {
    setSaving(true);
    try {
      const transformedData = transformDataForBackend(agendaJoinData);
      await agendaService.saveCompleteAgenda(meetingId, transformedData);
      Swal.fire("Success!", "Agenda saved successfully!", "success");
    } catch (error) {
      console.error("Error saving agenda:", error);
      Swal.fire("Error!", "Failed to save agenda. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const getConstant = (key) =>
    agendaJoinData.agendaConstantInfo.find(
      (ci) => (ci.infoName || "").toLowerCase() === key.toLowerCase()
    )?.infoDetail || "";

  const upsertConstant = (key, detail) => {
    setAgendaJoinData((prev) => {
      const list = [...prev.agendaConstantInfo];
      const idx = list.findIndex(
        (ci) => (ci.infoName || "").toLowerCase() === key.toLowerCase()
      );
      if (idx >= 0) list[idx] = { ...list[idx], infoDetail: detail };
      else list.push({ infoName: key, infoDetail: detail });
      return { ...prev, agendaConstantInfo: list };
    });
  };

  // Persist speechesInsertIndex into agendaConstantInfo so it survives refresh
  useEffect(() => {
    if (speechesInsertIndex == null) return;
    upsertConstant('SpeechesAfterRow', String(speechesInsertIndex));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechesInsertIndex]);

  // Persist section markers from agenda into constants so they survive refresh
  useEffect(() => {
    const sections = (agendaJoinData.agenda || [])
      .map((item, i) => item?.rowType === 'section' ? { index: i, title: item.activity || '' } : null)
      .filter(Boolean);
    try {
      upsertConstant('Sections', JSON.stringify(sections));
    } catch (e) {
      console.warn('Failed to persist Sections constant', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaJoinData.agenda]);

  const formatTime = (minutes) => {
    if (!minutes) return "-";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Clock helpers for agenda grid
  const parseHMToDate = (hm) => {
    if (!hm) return null;
    // hm expected 'HH:MM' 24h; fallback
    const [hh, mm] = String(hm).split(":").map((x) => parseInt(x || 0, 10));
    const d = new Date();
    d.setHours(isNaN(hh) ? 0 : hh, isNaN(mm) ? 0 : mm, 0, 0);
    return d;
  };
  const addMinutesDate = (d, mins) => {
    const nd = new Date(d);
    nd.setMinutes(nd.getMinutes() + (parseInt(mins || 0, 10) || 0));
    return nd;
  };
  // Enhanced duration helpers (support mm, mm:ss, or hh:mm:ss)
  const parseDurationToSeconds = (val) => {
    if (val == null || val === '') return 0;
    // If backend provides a number, it is already seconds
    if (typeof val === 'number') return Math.round(val);
    const s = String(val).trim();
    if (!s.includes(':')) {
      const mins = parseFloat(s);
      return isNaN(mins) ? 0 : Math.round(mins * 60);
    }
    const parts = s.split(':').map(x => parseInt(x || 0, 10));
    if (parts.length === 2) {
      const [mm, ss] = parts;
      return (isNaN(mm) ? 0 : mm) * 60 + (isNaN(ss) ? 0 : ss);
    }
    // hh:mm:ss fallback
    const [hh, mm, ss] = [parts[0]||0, parts[1]||0, parts[2]||0];
    return (hh*3600) + (mm*60) + ss;
  };
  const addSecondsDate = (d, secs) => {
    const nd = new Date(d);
    nd.setSeconds(nd.getSeconds() + (parseInt(secs || 0, 10) || 0));
    return nd;
  };
  // Use the same format shown in read-only cells for editing inputs
  const formatDurationForInput = (val) => formatDurationHMS(val);
  const formatDurationHMS = (val) => {
    const secs = parseDurationToSeconds(val);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    // Exact minute without hours -> display as plain minutes (e.g., 240s => 4)
    if (h === 0 && s === 0) {
      return String(m);
    }
    if (h > 0) {
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  // Convert UI value to backend seconds (integer)
  const toBackendSeconds = (val) => {
    const secs = parseDurationToSeconds(val);
    return secs ? Math.max(0, Math.round(secs)) : null;
  };
  const fmtClock = (d) => {
    if (!d) return "";
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12; if (h === 0) h = 12;
    const mm = m.toString().padStart(2, '0');
    return `${h}:${mm} ${ampm}`;
  };

  // === Meeting Info helpers ===
  const ordinal = (n) => {
    const s = ["th","st","nd","rd"], v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  };
  const parseMeetingDate = () => {
    const str = meetingData?.date || meetingData?.meetingDate || meetingData?.meeting_date || meetingData?.meetingDay;
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };
  const formatLongDate = (d) => {
    if (!d) return "";
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const dayName = days[d.getDay()];
    const date = d.getDate();
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();
    return `${dayName}, ${ordinal(date)} ${monthName}, ${year}`;
  };
  const getStartHM = () => meetingData?.startTime || meetingData?.start_time || meetingData?.time || "";
  const getEndHM = () => meetingData?.endTime || meetingData?.end_time || "";

  // === Club Officers helpers (fixed-role layout) ===
  const findOfficer = (roleName) =>
    (agendaJoinData.clubOfficers || []).find(
      (o) => String(o.leadershipRole || '').toLowerCase() === String(roleName).toLowerCase()
    ) || null;

  const getOfficerName = (roleName) => {
    const entry = findOfficer(roleName);
    return entry?.member?.memberId ? getMemberNameById(entry.member.memberId) : '';
  };

  const setOfficerMember = (roleName, memberId) => {
    setAgendaJoinData((prev) => {
      const list = [...(prev.clubOfficers || [])];
      const idx = list.findIndex(
        (o) => String(o.leadershipRole || '').toLowerCase() === String(roleName).toLowerCase()
      );
      const payload = memberId ? { memberId: Number(memberId) } : null;
      if (idx >= 0) {
        list[idx] = { ...list[idx], leadershipRole: roleName, member: payload };
      } else {
        list.push({ leadershipRole: roleName, member: payload });
      }
      return { ...prev, clubOfficers: list };
    });
  };

  // === Add New row helpers ===
  const addOfficer = () => {
    setAgendaJoinData((prev) => ({
      ...prev,
      clubOfficers: [
        ...prev.clubOfficers,
        { leadershipRole: "", member: { memberId: null, memberName: "" } },
      ],
    }));
  };

  // Quick add helpers at a specific index (after a given row)
  const addRowAfterIndex = (index) => {
    setAgendaJoinData((prev) => {
      const list = [...(prev.agenda || [])];
      const baseRow = {
        agendaId: null,
        clientKey: Date.now(),
        minTime: "",
        avgTime: "",
        maxTime: "",
        activity: "",
        member: { memberId: null, memberName: "" },
      };
      insertIntoAgendaAt(list, (index ?? list.length) + 1, baseRow);
      return { ...prev, agenda: list };
    });
  };

  const addSectionAfterIndex = (index) => {
    setAgendaJoinData((prev) => {
      const list = [...(prev.agenda || [])];
      const newRow = makeSectionHeader("");
      insertIntoAgendaAt(list, (index ?? list.length) + 1, newRow);
      return { ...prev, agenda: list };
    });
  };

  const deleteOfficer = (index) => {
    setAgendaJoinData((prev) => {
      const updated = [...prev.clubOfficers];
      updated.splice(index, 1);
      return { ...prev, clubOfficers: updated };
    });
  };

  const addAgendaItem = () => {
    setAgendaJoinData((prev) => ({
      ...prev,
      agenda: [
        ...prev.agenda,
        {
          agendaId: null, // let backend assign
          clientKey: Date.now(),
          minTime: "",
          avgTime: "",
          maxTime: "",
          activity: "",
          member: { memberId: null, memberName: "" },
        },
      ],
    }));
  };

  const addAgendaBeforeSpeeches = () => {
    setAgendaJoinData((prev) => {
      const list = [...(prev.agenda || [])];
      const idx = Math.min(Math.max(0, speechesInsertIndex ?? list.length), list.length);
      const row = {
        agendaId: null,
        clientKey: Date.now(),
        minTime: "",
        avgTime: "",
        maxTime: "",
        activity: "",
        member: { memberId: null, memberName: "" },
      };
      list.splice(idx, 0, row);
      // Shift speeches index forward so speeches still start after the inserted row
      setSpeechesInsertIndex(idx + 1);
      return { ...prev, agenda: list };
    });
  };

  const addAgendaAfterSpeeches = () => {
    setAgendaJoinData((prev) => {
      const list = [...(prev.agenda || [])];
      const idx = Math.min(Math.max(0, speechesInsertIndex ?? list.length), list.length);
      // Insert immediately after speeches header (i.e., at the start of the after-slice)
      const row = {
        agendaId: null,
        clientKey: Date.now(),
        minTime: "",
        avgTime: "",
        maxTime: "",
        activity: "",
        member: { memberId: null, memberName: "" },
      };
      list.splice(idx, 0, row);
      // Do NOT change speechesInsertIndex so speeches remain before this new row
      return { ...prev, agenda: list };
    });
  };

  const addSpeech = () => {
    setAgendaJoinData((prev) => ({
      ...prev,
      speakerSpeech: [
        ...prev.speakerSpeech,
        {
          speakerId: null, // let backend assign
          clientKey: Date.now(),
          speechTitle: "",
          minSpeechTime: "",
          maxSpeechTime: "",
          projectTitle: "",
          member: { memberId: null, memberName: "" },
        },
      ],
    }));
  };

  const addGrammarian = () => {
    setAgendaJoinData((prev) => ({
      ...prev,
      grammarian: [
        ...prev.grammarian,
        {
          grammarianId: null, // let backend assign
          clientKey: Date.now(),
          word: "",
          meaning: "",
          example: "",
          member: { memberId: null, memberName: "" },
        },
      ],
    }));
  };

  const addAbbreviation = () => {
    setAgendaJoinData((prev) => ({
      ...prev,
      abbreviations: [
        ...prev.abbreviations,
        { abbreviation: "", description: "" },
      ],
    }));
  };

  const deleteAgendaItem = (index) => {
    setAgendaJoinData((prev) => {
      const updated = [...prev.agenda];
      updated.splice(index, 1);
      return { ...prev, agenda: updated };
    });
  };

  const deleteSectionAtIndex = (index) => {
    setAgendaJoinData((prev) => {
      const updated = [...prev.agenda];
      if (updated[index]?.rowType === 'section') {
        updated.splice(index, 1);
      }
      return { ...prev, agenda: updated };
    });
  };

  const deleteSpeech = (index) => {
    setAgendaJoinData((prev) => {
      const updated = [...prev.speakerSpeech];
      updated.splice(index, 1);
      return { ...prev, speakerSpeech: updated };
    });
  };

  // Confirm delete helpers
  const confirmDeleteAgendaRow = async (index) => {
    const res = await Swal.fire({
      title: 'Delete agenda item?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel'
    });
    if (res.isConfirmed) deleteAgendaItem(index);
  };

  const confirmDeleteSpeech = async (index) => {
    const res = await Swal.fire({
      title: 'Delete prepared speech?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel'
    });
    if (res.isConfirmed) deleteSpeech(index);
  };

  const confirmDeleteSection = async (index) => {
    const res = await Swal.fire({
      title: 'Delete section?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel'
    });
    if (res.isConfirmed) deleteSectionAtIndex(index);
  };

  const deleteGrammarian = (index) => {
    setAgendaJoinData((prev) => {
      const updated = [...prev.grammarian];
      updated.splice(index, 1);
      return { ...prev, grammarian: updated };
    });
  };

  const deleteAbbreviation = (index) => {
    setAgendaJoinData((prev) => {
      const updated = [...prev.abbreviations];
      updated.splice(index, 1);
      return { ...prev, abbreviations: updated };
    });
  };

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <div className="d-flex justify-content-end mb-3">
          <button 
            className="btn btn-outline-primary"
            disabled
            title="Please wait while the agenda loads..."
          >
            <i className="bi bi-file-earmark-pdf me-2"></i>Download PDF
          </button>
        </div>
        <div className="loading-container">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading complete agenda...</p>
        </div>
      </div>
    );
  }

  const renderMemberOption = (member) => {
    const memberRoles = Array.isArray(assignedRoles[member.memberId]) 
      ? assignedRoles[member.memberId] 
      : [];
    const roleNames = getRoleNames(memberRoles);
    const roleText = roleNames.join(', ');
    const isAvailable = availableMembers.some(am => am.memberId === member.memberId);
    
    return (
      <option 
        key={member.memberId} 
        value={member.memberId}
        title={roleText ? `Assigned roles: ${roleText}` : 'No roles assigned'}
        className={isAvailable ? '' : 'unavailable-option'}
      >
        {toTitleCase(member.memberName)}
        {!isAvailable && ' (Not available)'}
        {roleText && ` (${roleText})`}
      </option>
    );
  };

  return (
    <div className="container-fluid mt-4 agenda-container" ref={agendaRef}>
      {/* Top Actions */}
      <div className="agenda-header d-flex justify-content-between align-items-center mb-4">
        <div className="header-title">
          <h2 className="mb-1">
            <i className="fas fa-calendar-alt me-2 text-primary"></i>
            Complete Meeting Agenda
          </h2>
          <p className="text-muted mb-0">Manage all aspects of your meeting agenda</p>
        </div>
        <div className="btn-group btn-group-sm shadow-sm">
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate("/agenda-list")}
            title="Back"
          >
            <i className="fas fa-arrow-left me-1"></i>Back
          </button>

          {user?.role === 'vp education' && (
            <button
              className={`btn ${isPublished ? 'btn-outline-warning' : 'btn-outline-success'}`}
              onClick={handleTogglePublish}
              disabled={publishing}
              title={isPublished ? 'Unpublish agenda' : 'Publish agenda'}
            >
              <i className={`me-1 ${isPublished ? 'fas fa-eye-slash' : 'fas fa-upload'}`}></i>
              {isPublished ? 'Unpublish' : 'Publish'}
            </button>
          )}

          <button
            className="btn btn-outline-primary"
            onClick={handleDownloadPDF}
            disabled={!meetingData || (!isPublished && user?.role !== 'vp education')}
            title={(!isPublished && user?.role !== 'vp education') ? 'Publish the agenda to enable PDF download' : 'Download PDF'}
          >
            <i className="bi bi-file-earmark-pdf me-1"></i>Download PDF
          </button>

          {user?.role === "vp education" && (
            <button
              className="btn btn-primary"
              onClick={handleSaveAgenda}
              disabled={saving}
              title="Save all changes"
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-1"></i>Save All
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {publishLoaded ? ((isPublished || user?.role === 'vp education') ? (
        <>
      {/* === Agenda Header === */}
      <div className="card mb-4 agenda-card">
        <div className="card-header agenda-card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-heading me-2 text-info"></i>Agenda Header
          </h5>
          {user?.role === "vp education" && (
            <button
              className={`btn btn-sm ${editSection === "header" ? "btn-outline-danger" : "btn-outline-primary"}`}
              onClick={() =>
                setEditSection(editSection === "header" ? null : "header")
              }
            >
              <i className={`fas ${editSection === "header" ? "fa-times" : "fa-edit"} me-1`}></i>
              {editSection === "header" ? "Cancel" : "Edit"}
            </button>
          )}
        </div>
        <div className="card-body text-center">
          {editSection === "header" ? (
            <div className="edit-form">
              <input
                className="form-control mb-3 form-control-lg"
                placeholder="Main header line"
                value={getConstant("header_line_1")}
                onChange={(e) => upsertConstant("header_line_1", e.target.value)}
              />
              <input
                className="form-control"
                placeholder="Subtitle or description"
                value={getConstant("header_line_2")}
                onChange={(e) => upsertConstant("header_line_2", e.target.value)}
              />
            </div>
          ) : (
            <div className="agenda-header-display">
              <h3 className="mb-2 text-primary">{getConstant("header_line_1") || "Club Meeting Agenda"}</h3>
              <p className="text-muted mb-0">{getConstant("header_line_2") || "Welcome to our Toastmasters meeting"}</p>
            </div>
          )}
        </div>
      </div>

      {/* === Meeting Info === */}
      {/*
      {meetingData && (
        <div className="card mb-4 agenda-card">
          <div className="card-header agenda-card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="fas fa-info-circle me-2 text-success"></i>Meeting Information
            </h5>
            {user?.role === "vp education" && (
              <button
                className={`btn btn-sm ${editSection === "meeting" ? "btn-outline-danger" : "btn-outline-primary"}`}
                onClick={() =>
                  setEditSection(editSection === "meeting" ? null : "meeting")
                }
              >
                <i className={`fas ${editSection === "meeting" ? "fa-times" : "fa-edit"} me-1`}></i>
                {editSection === "meeting" ? "Cancel" : "Edit"}
              </button>
            )}
          </div>
          <div className="card-body">
            {editSection === "meeting" ? (
              <div className="edit-form">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Theme</label>
                    <input
                      className="form-control"
                      placeholder="Meeting theme"
                      value={meetingData.theme}
                      onChange={(e) =>
                        setMeetingData({ ...meetingData, theme: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={meetingData.date}
                      onChange={(e) =>
                        setMeetingData({ ...meetingData, date: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      className="form-control"
                      value={meetingData.startTime}
                      onChange={(e) =>
                        setMeetingData({
                          ...meetingData,
                          startTime: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      className="form-control"
                      value={meetingData.endTime}
                      onChange={(e) =>
                        setMeetingData({
                          ...meetingData,
                          endTime: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="meeting-info-display">
                <div className="row">
                  <div className="col-md-6">
                    <div className="info-item">
                      <i className="fas fa-lightbulb text-warning me-2"></i>
                      <strong>Theme:</strong> {meetingData.theme}
                    </div>
                    <div className="info-item">
                      <i className="fas fa-calendar text-primary me-2"></i>
                      <strong>Date:</strong> {meetingData.date}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="info-item">
                      <i className="fas fa-clock text-info me-2"></i>
                      <strong>Time:</strong> {meetingData.startTime} - {meetingData.endTime}
                    </div>
                    <div className="info-item">
                      <i className="fas fa-map-marker-alt text-danger me-2"></i>
                      <strong>Venue:</strong> {meetingData.venue}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}  */}

      <div className="text-center my-3">
        <img src={toastmastersLogo} alt="Toastmasters Logo" width="250" className="mx-auto d-block" />
      </div>

      
      {/* === Meeting Information (header) === */}
      <div className="card mb-4 agenda-card fade-in">
        <div className="card-body text-center">
          <div className="mb-1 text-muted">
            <strong>Meeting Theme:</strong>{" "}
            <span className="fst-italic">{meetingData?.theme || getConstant("Meeting Theme") || "-"}</span>
          </div>
          <div className="fs-5 fw-bold">
            {getConstant("chapter_title") || `Chapter Meeting, ${formatLongDate(parseMeetingDate())}`}
          </div>
          <div className="fw-semibold">
            {meetingData?.category || meetingData?.meetingCategory || getConstant("meeting_category") || ""}
          </div>
          <div className="fst-italic">
            Time: {(() => {
              const s = parseHMToDate(getStartHM());
              const e = parseHMToDate(getEndHM());
              const startStr = s ? fmtClock(s) : "";
              const endStr = e ? fmtClock(e) : "";
              return endStr ? `${startStr} to ${endStr}` : startStr;
            })()}
          </div>
        </div>
      </div>

      {/* === Our Club Mission === */}
      <div className="card mb-4 agenda-card fade-in">
        <div className="card-header agenda-card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-bullseye me-2 text-warning"></i>Our Club Mission
          </h5>
          {user?.role === "vp education" && (
            <button
              className={`btn btn-sm ${editSection === "mission" ? "btn-outline-danger" : "btn-outline-primary"}`}
              onClick={() =>
                setEditSection(editSection === "mission" ? null : "mission")
              }
            >
              <i className={`fas ${editSection === "mission" ? "fa-times" : "fa-edit"} me-1`}></i>
              {editSection === "mission" ? "Cancel" : "Edit"}
            </button>
          )}
        </div>
        <div className="card-body">
          {editSection === "mission" ? (
            <div className="edit-form">
              <textarea
                className="form-control"
                rows={4}
                placeholder="Enter your club's mission statement..."
                value={getConstant("Our Club Mission")}
                onChange={(e) =>
                  upsertConstant("Our Club Mission", e.target.value)
                }
              />
            </div>
          ) : (
            <div className="mission-display">
              <p style={{ whiteSpace: "pre-line", fontSize: "1.1rem", lineHeight: "1.6" }}>
                {getConstant("Our Club Mission") || "We provide a supportive and positive learning experience in which members are empowered to develop communication and leadership skills, resulting in greater self-confidence and personal growth."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* === Club Officers === */}
      <div className="card mb-4 agenda-card slide-up">
        <div className="card-header agenda-card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-users me-2 text-primary"></i>Club Officers
          </h5>
          {user?.role === "vp education" && (
            <div>
              <button
                className={`btn btn-sm ${editSection === "officers" ? "btn-outline-danger" : "btn-outline-primary"} me-2`}
                onClick={() =>
                  setEditSection(editSection === "officers" ? null : "officers")
                }
              >
                <i className={`fas ${editSection === "officers" ? "fa-times" : "fa-edit"} me-1`}></i>
                {editSection === "officers" ? "Cancel" : "Edit"}
              </button>
              {editSection === "officers" && (
                <button className="btn btn-sm btn-success" onClick={addOfficer}>
                  <i className="fas fa-plus me-1"></i>Add New
                </button>
              )}
            </div>
          )}
        </div>
        <div className="card-body">
          {/* Centered title line like: - Club Officers - */}
          <div className="text-center mb-2"><strong>- Club Officers -</strong></div>
          {/* President line */}
          <div className="text-center mb-2">
            <span><strong>President:</strong> {editSection === 'officers' ? (
              <select
                className="form-select d-inline-block w-auto ms-1"
                value={findOfficer('President')?.member?.memberId || ''}
                onChange={(e)=> setOfficerMember('President', e.target.value)}
              >
                <option value="">Select member</option>
                {members.map(m => (
                  <option key={m.memberId} value={m.memberId}>{m.memberName}</option>
                ))}
              </select>
            ) : (
              getOfficerName('President') || 'TBD'
            )}</span>
          </div>

          {/* Two-column 3-row bordered grid for the six roles */}
          <div className="table-responsive">
            <table className="table table-bordered">
              <tbody>
                {[
                  ['VP Education', 'VP Membership'],
                  ['VP Public Relations', 'SAA'],
                  ['Secretary', 'Treasurer'],
                ].map((pair, rIdx) => (
                  <tr key={`row-${rIdx}`}>
                    {pair.map((role) => (
                      <td key={role}>
                        {editSection === 'officers' ? (
                          <div className="d-flex align-items-center justify-content-between">
                            <strong className="me-2">{role}:</strong>
                            <select
                              className="form-select w-auto"
                              value={findOfficer(role)?.member?.memberId || ''}
                              onChange={(e)=> setOfficerMember(role, e.target.value)}
                            >
                              <option value="">Select member</option>
                              {members.map(m => (
                                <option key={m.memberId} value={m.memberId}>{m.memberName}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span><strong>{role}:</strong> {getOfficerName(role) || 'TBD'}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Immediate Past President line */}
          <div className="text-center mt-2">
            <span><strong>Immediate Past President:</strong> {editSection === 'officers' ? (
              <select
                className="form-select d-inline-block w-auto ms-1"
                value={findOfficer('Immediate Past President')?.member?.memberId || ''}
                onChange={(e)=> setOfficerMember('Immediate Past President', e.target.value)}
              >
                <option value="">Select member</option>
                {members.map(m => (
                  <option key={m.memberId} value={m.memberId}>{m.memberName}</option>
                ))}
              </select>
            ) : (
              getOfficerName('Immediate Past President') || 'TBD'
            )}</span>
          </div>
        </div>
      </div>


      

      {/* === Meeting Agenda === */}
      <div className="card mb-4 agenda-card slide-up">
        <div className="card-header agenda-card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-list-ol me-2 text-info"></i>Meeting Agenda
          </h5>
          <div className="d-flex align-items-center gap-2">
            {user?.role === "vp education" && (
              <div>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => { setEditSection('agenda'); setAgendaDraft(JSON.parse(JSON.stringify(agendaJoinData))); setShowAgendaModal(true); }}
                >
                  <i className="fas fa-edit me-1"></i>
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="card-body">
          {/* Read-only agenda table on the page */}
          {isPublished || user?.role === 'vp education' ? (
            <AgendaTable editing={false} />
          ) : (
            <div className="alert alert-info mb-0">
              The agenda is not yet published. Please check back later.
            </div>
          )}
        </div>
      </div>

      {/* === Full Agenda Edit Modal === */}
      {showAgendaModal && (
        <div
          className="agenda-modal-backdrop"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => { setShowAgendaModal(false); setEditSection(null); setAgendaDraft(null); }}
        >
          <div
            className="agenda-modal-dialog"
            style={{ background: '#fff', width: '95%', maxWidth: 1200, maxHeight: '90vh', borderRadius: 8, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', position: 'relative', zIndex: 1060 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="agenda-modal-header d-flex justify-content-between align-items-center p-3 border-bottom">
              <h5 className="mb-0"><i className="fas fa-pen-to-square me-2"></i>Edit Meeting Agenda</h5>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => { setShowAgendaModal(false); setEditSection(null); setAgendaDraft(null); }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="agenda-modal-toolbar d-flex flex-wrap align-items-center gap-2 p-3 border-bottom">
              <button className="btn btn-sm btn-success me-2" onClick={addAgendaItem}>
                <i className="fas fa-plus me-1"></i>Add New Row
              </button>
              <button className="btn btn-sm btn-outline-primary me-2" onClick={addRowAfterSelected}>
                <i className="fas fa-plus me-1"></i>Add Row After Selection
              </button>
              <button className="btn btn-sm btn-outline-secondary me-2" onClick={addSectionAfterSelected}>
                <i className="fas fa-heading me-1"></i>Add Section After Selection
              </button>
              <div className="ms-auto d-flex align-items-center">
                <label className="me-2 text-muted small">Speeches after row:</label>
                <select
                  className="form-select form-select-sm w-auto"
                  value={speechesInsertIndex ?? 0}
                  onChange={(e)=> setSpeechesInsertIndex(Number(e.target.value))}
                >
                  {Array.from({ length: (agendaJoinData.agenda?.length ?? 0) + 1 }).map((_, i) => (
                    <option key={`idx-${i}`} value={i}>{i}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="agenda-modal-body p-3" style={{ overflow: 'auto', maxHeight: 'calc(90vh - 150px)' }}>
              {/* Editable agenda table inside modal */}
              <AgendaTable editing={true} />
            </div>
            <div className="agenda-modal-footer d-flex justify-content-end gap-2 p-3 border-top">
              <button className="btn btn-secondary" onClick={() => { setShowAgendaModal(false); setEditSection(null); setAgendaDraft(null); }}>Back</button>
              <button className="btn btn-primary" onClick={() => { if (agendaDraft) setAgendaJoinData(agendaDraft); handleSaveAgenda(); setShowAgendaModal(false); setEditSection(null); setAgendaDraft(null); }} disabled={saving} title="Save changes to Meeting Agenda">
                <i className="fas fa-save me-2"></i>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* === Grammarian === */}
      <div className="card mb-4 agenda-card slide-up">
  <div className="card-header agenda-card-header d-flex justify-content-between align-items-center">
    <h5 className="mb-0">
      <i className="fas fa-spell-check me-2 text-purple"></i>Word & Phrase of the Day
    </h5>
  </div>

  <div className="card-body">
    {agendaJoinData.grammarian.length === 0 ? (
      <div className="text-center text-muted py-4">
        <i className="fas fa-book fa-3x mb-3"></i>
        <p>No words or phrases added yet</p>
      </div>
    ) : (
      <div className="row g-3 align-items-stretch">
        {(() => {
          const wodList = agendaJoinData.grammarian.filter(g => g.type === "WOD");
          const podList = agendaJoinData.grammarian.filter(g => g.type === "POD");
          return (
            <>
              {/* === Left: WOD === */}
              <div className="col-md-6 d-flex flex-column">
                <div className="flex-fill d-flex flex-column">
                  {wodList.length === 0 ? (
                    <p className="text-muted">No Word of the Day added</p>
                  ) : (
                    wodList.map((g) => (
                      <div key={g.grammarianId} className="card mb-3 shadow-sm flex-fill">
                        <div className="card-header bg-light"><strong>WOD</strong></div>
                        <div className="card-body">
                          <p><strong>Word:</strong> {g.word || '-'}</p>
                          <p><strong>Meaning:</strong> {g.meaning || '-'}</p>
                          <p><strong>Example:</strong> {g.example || '-'}</p>
                          <p><strong>Grammarian:</strong> {getMemberNameById(g.member?.memberId) || 'TBD'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* === Right: POD === */}
              <div className="col-md-6 d-flex flex-column">
                <div className="flex-fill d-flex flex-column">
                  {podList.length === 0 ? (
                    <p className="text-muted">No Phrase of the Day added</p>
                  ) : (
                    podList.map((g) => (
                      <div key={g.grammarianId} className="card mb-3 shadow-sm flex-fill">
                        <div className="card-header bg-light"><strong>POD</strong></div>
                        <div className="card-body">
                          <p><strong>Phrase:</strong> {g.word || '-'}</p>
                          <p><strong>Meaning:</strong> {g.meaning || '-'}</p>
                          <p><strong>Example:</strong> {g.example || '-'}</p>
                          <p><strong>Grammarian:</strong> {getMemberNameById(g.member?.memberId) || 'TBD'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          );
        })()}
      </div>
    )}
  </div>
</div>


      {/* === Abbreviations === */}
      <div className="card mb-4 agenda-card fade-in">
        <div className="card-header agenda-card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-list-alt me-2 text-secondary"></i>Abbreviations
          </h5>
          {user?.role === "vp education" && (
            <div>
              <button
                className={`btn btn-sm ${editSection === "abbr" ? "btn-outline-danger" : "btn-outline-primary"} me-2`}
                onClick={() =>
                  setEditSection(editSection === "abbr" ? null : "abbr")
                }
              >
                <i className={`fas ${editSection === "abbr" ? "fa-times" : "fa-edit"} me-1`}></i>
                {editSection === "abbr" ? "Cancel" : "Edit"}
              </button>
              {editSection === "abbr" && (
                <button
                  className="btn btn-sm btn-success"
                  onClick={addAbbreviation}
                >
                  <i className="fas fa-plus me-1"></i>Add New
                </button>
              )}
            </div>
          )}
        </div>
        <div className="card-body">
          <div className="table-responsive">
            {editSection === 'abbr' ? (
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th width="150"><i className="fas fa-font me-2"></i>Abbreviation</th>
                    <th><i className="fas fa-info-circle me-2"></i>Description</th>
                    <th width="50">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(agendaJoinData.abbreviations.length ? agendaJoinData.abbreviations : [{ abbreviation: '', description: '' }]).map((abbr, idx) => (
                    <tr key={idx} className="fade-in">
                      <td>
                        <input
                          className="form-control"
                          placeholder="e.g. TM"
                          value={abbr.abbreviation}
                          onChange={(e) => {
                            const list = agendaJoinData.abbreviations.length ? [...agendaJoinData.abbreviations] : [{ abbreviation: '', description: '' }];
                            list[idx].abbreviation = e.target.value;
                            setAgendaJoinData({ ...agendaJoinData, abbreviations: list });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className="form-control"
                          placeholder="Full description"
                          value={abbr.description}
                          onChange={(e) => {
                            const list = agendaJoinData.abbreviations.length ? [...agendaJoinData.abbreviations] : [{ abbreviation: '', description: '' }];
                            list[idx].description = e.target.value;
                            setAgendaJoinData({ ...agendaJoinData, abbreviations: list });
                          }}
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger delete-btn"
                          onClick={() => deleteAbbreviation(idx)}
                          title="Delete abbreviation"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              (() => {
                const list = agendaJoinData.abbreviations && agendaJoinData.abbreviations.length
                  ? agendaJoinData.abbreviations
                  : [{ abbreviation: '', description: '' }];
                const mid = Math.ceil(list.length / 2);
                const cols = [list.slice(0, mid), list.slice(mid)];
                return (
                  <div className="row g-3">
                    {cols.map((col, cidx) => (
                      <div className="col-md-6" key={`abbr-col-${cidx}`}>
                        <table className="table table-bordered">
                          <tbody>
                            {col.map((abbr, idx) => (
                              <tr key={`abbr-${cidx}-${idx}`} className="fade-in">
                                <td width="220"><strong>{abbr.abbreviation}</strong></td>
                                <td>{abbr.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}

             {/* === Footer (from constants) — after Club Officers, before Meeting Agenda === */}
      <div className="card mb-4 mt-3 agenda-card fade-in">
        <div className="card-body text-center agenda-footer">
          <div className="agenda-footer-line1" style={{ whiteSpace: 'pre-line' }}>
            {getConstant('footer_line_1') || ''}
          </div>
          <div className="agenda-footer-line2" style={{ whiteSpace: 'pre-line' }}>
            {getConstant('footer_line_2') || ''}
          </div>
        </div>

      </div>
          </div>
        </div>

      </div>
        </>
      ) : (
        <div className="alert alert-info">
          The agenda is not yet published. Please check back later.
        </div>
      )) : (
        <div className="text-center text-muted my-4">
          <span className="spinner-border spinner-border-sm me-2"></span>
          Loading agenda status...
        </div>
      )}
    </div>
  );
};

export default CompleteAgenda;
