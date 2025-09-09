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
  // Drag-and-drop state for Meeting Agenda rows
  const [dragIndex, setDragIndex] = useState(null);
  // Drag-and-drop state for Speech block rows
  const [speechDragIndex, setSpeechDragIndex] = useState(null);
  const [speechesInsertIndex, setSpeechesInsertIndex] = useState(null); // where to inject speeches
  const [selectedRowRef, setSelectedRowRef] = useState(null); // { zone: 'before'|'after'|'speech', index: number|null }
  const agendaRef = useRef(null);

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

  const handleDownloadPDF = async () => {
    if (!agendaRef.current) {
      Swal.fire('Error', 'Agenda content not found', 'error');
      return;
    }

    const loadingSwal = Swal.fire({
      title: 'Generating PDF',
      html: 'Preparing document...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // Load scripts from CDN
      await loadingSwal.update({ html: 'Loading PDF tools...' });
      
      await Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
        loadScript('https://html2canvas.hertzen.com/dist/html2canvas.min.js')
      ]);

      const { jsPDF } = window.jspdf;
      const html2canvas = window.html2canvas;

      // Create a clean container for the PDF content
      const printContainer = document.createElement('div');
      printContainer.style.width = '210mm';
      printContainer.style.padding = '15mm';
      printContainer.style.margin = '0 auto';
      printContainer.style.backgroundColor = 'white';
      printContainer.style.boxSizing = 'border-box';
      printContainer.style.fontFamily = 'Arial, sans-serif';

      // Clone the agenda content
      const element = agendaRef.current.cloneNode(true);
      
      // Remove interactive elements
      const elementsToRemove = element.querySelectorAll(
        'button, .btn, .no-print, .edit-btn, [onclick], .action-buttons, .drag-handle, .speech-actions, .agenda-actions, .agenda-controls, .print-hide'
      );
      elementsToRemove.forEach(el => el.remove());

      // Add print-specific styles
      const style = document.createElement('style');
      style.textContent = `
        @page { 
          margin: 0;
          size: A4 portrait;
        }
        body { 
          margin: 0; 
          padding: 0; 
          background: white;
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
        }
        .agenda-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .agenda-header h2 {
          margin: 0;
          color: #2c3e50;
        }
        .agenda-date {
          font-size: 1.1em;
          color: #555;
          margin: 10px 0;
        }
      `;

      // Create a temporary container
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '210mm';
      tempDiv.appendChild(printContainer);
      printContainer.appendChild(element);
      document.body.appendChild(tempDiv);
      document.head.appendChild(style);

      try {
        await loadingSwal.update({ html: 'Generating PDF...' });
        
        // Calculate content height for proper scaling
        const contentHeight = element.scrollHeight;
        const pageHeight = 297; // A4 height in mm
        const scale = (pageHeight - 30) / (contentHeight * 0.35); // Convert px to mm with some padding
        
        const canvas = await html2canvas(element, {
          scale: 1.5, // Slightly higher resolution
          useCORS: true,
          logging: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          width: element.offsetWidth,
          height: contentHeight,
          windowWidth: element.scrollWidth,
          windowHeight: contentHeight,
          backgroundColor: '#FFFFFF'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        // Calculate dimensions to fit page
        const pageWidth = pdf.internal.pageSize.getWidth() - 20; // 10mm margins
        const pageHeightPdf = pdf.internal.pageSize.getHeight() - 20;
        const imgProps = pdf.getImageProperties(imgData);
        const pdfHeight = (imgProps.height * pageWidth) / imgProps.width;

        // Add first page
        pdf.addImage(imgData, 'PNG', 10, 10, pageWidth, pdfHeight);
        
        // Add additional pages if needed
        let heightLeft = pdfHeight - pageHeightPdf;
        let position = 10 - pageHeightPdf;
        
        while (heightLeft > 0) {
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 10, position, pageWidth, pdfHeight);
          heightLeft -= pageHeightPdf;
          position -= pageHeightPdf;
        }

        const meetingDate = meetingData?.meetingDate 
          ? new Date(meetingData.meetingDate).toISOString().split('T')[0]
          : 'agenda';
        
        pdf.save(`Toastmasters-Agenda-${meetingDate}.pdf`);
        
      } finally {
        // Clean up
        document.body.removeChild(tempDiv);
        document.head.removeChild(style);
      }
      
      await loadingSwal.close();
      
    } catch (error) {
      console.error('PDF Generation Error:', error);
      
      if (Swal.isVisible()) {
        await Swal.fire({
          icon: 'error',
          title: 'PDF Generation Failed',
          text: 'An error occurred while generating the PDF. Please try again.',
          footer: error.message ? `Error: ${error.message}` : ''
        });
      }
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
    
        // Normalize to numeric minutes for backend
        copy.minTime = hasMin ? toBackendMinutes(copy.minTime) : null;
        copy.avgTime = hasAvg || count === 1 ? toBackendMinutes(copy.avgTime) : null;
        copy.maxTime = hasMax ? toBackendMinutes(copy.maxTime) : null;
    
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
        // Normalize to numeric minutes for backend
        copy.minSpeechTime = hasMinS ? toBackendMinutes(copy.minSpeechTime) : null;
        copy.avgSpeechTime = hasAvgS || countS === 1 ? toBackendMinutes(copy.avgSpeechTime) : null;
        copy.maxSpeechTime = hasMaxS ? toBackendMinutes(copy.maxSpeechTime) : null;
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
  // Enhanced duration helpers (support mm or mm:ss)
  const parseDurationToSeconds = (val) => {
    if (val == null || val === '') return 0;
    if (typeof val === 'number') return Math.round(val * 60); // minutes -> seconds
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
  const formatDurationMMSS = (val) => {
    const secs = parseDurationToSeconds(val);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  // Convert UI value to backend minutes (integer). If seconds present, round up to nearest minute.
  const toBackendMinutes = (val) => {
    const secs = parseDurationToSeconds(val);
    if (!secs) return null; // treat empty as null
    return Math.ceil(secs / 60);
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

  const deleteSpeech = (index) => {
    setAgendaJoinData((prev) => {
      const updated = [...prev.speakerSpeech];
      updated.splice(index, 1);
      return { ...prev, speakerSpeech: updated };
    });
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
        {member.memberName}
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
        <div className="btn-group shadow-sm me-2">
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate("/agenda-list")}
        >
          <i className="fas fa-arrow-left me-2"></i>Back
        </button>
      </div>
      <div className="btn-group shadow-sm">
        <button
          className="btn btn-outline-primary"
          onClick={handleDownloadPDF}
          disabled={!meetingData}
          title="Download PDF"
        >
          <i className="bi bi-file-earmark-pdf me-2"></i>Download PDF
        </button>
        {user?.role === "vp education" && (
          <button
            className="btn btn-primary"
            onClick={handleSaveAgenda}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save me-2"></i>Save All
              </>
            )}
          </button>
        )}
        </div>
      </div>

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
    {user?.role === "vp education" && (
      <div>
        <button
          className={`btn btn-sm ${editSection === "agenda" ? "btn-outline-danger" : "btn-outline-primary"} me-2`}
          onClick={() =>
            setEditSection(editSection === "agenda" ? null : "agenda")
          }
        >
          <i className={`fas ${editSection === "agenda" ? "fa-times" : "fa-edit"} me-1`}></i>
          {editSection === "agenda" ? "Cancel" : "Edit"}
        </button>
        {editSection === "agenda" && (
          <button
            className="btn btn-sm btn-success"
            onClick={addAgendaItem}
          >
            <i className="fas fa-plus me-1"></i>Add New
          </button>
        )}
        {editSection === "agenda" && (
          <span className="ms-3">
            <label className="me-2 text-muted small">Speeches after row:</label>
            <select
              className="form-select d-inline-block w-auto"
              value={speechesInsertIndex ?? 0}
              onChange={(e)=> setSpeechesInsertIndex(Number(e.target.value))}
            >
              {Array.from({length: (agendaJoinData.agenda?.length ?? 0) + 1}).map((_,i)=> (
                <option key={`idx-${i}`} value={i}>{i}</option>
              ))}
            </select>
          </span>
        )}
        {editSection === "agenda" && (
          <>
            <button className="btn btn-sm btn-outline-primary ms-2" onClick={addRowAfterSelected}>
              <i className="fas fa-plus me-1"></i>Add Row
            </button>
            <button className="btn btn-sm btn-outline-secondary ms-2" onClick={addSectionAfterSelected}>
              <i className="fas fa-heading me-1"></i>Add Section
            </button>
          </>
        )}
      </div>
    )}
  </div>
  <div className="card-body">
    <div className="table-responsive">
      <table className="table table-bordered agenda-grid">
        <thead>
          <tr>
            <th width="120">TIME</th>
            <th width="80" className="text-center">MIN</th>
            <th width="80" className="text-center">AVG</th>
            <th width="80" className="text-center">MAX</th>
            <th>ACTIVITY</th>
            <th width="220">PRESENTER</th>
            {editSection === "agenda" && <th width="60">Action</th>}
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
                    key={`sec-${idx}`}
                    className={`table-secondary ${selectedRowRef?.zone === zone && selectedRowRef?.index === idx ? 'table-warning' : ''}`}
                    onClick={()=> setSelectedRowRef({ zone, index: idx })}
                    draggable={editSection === 'agenda'}
                    onDragStart={() => handleAgendaDragStart(idx)}
                    onDragOver={handleAgendaDragOver}
                    onDrop={() => handleAgendaDrop(idx)}
                    style={{ cursor: editSection === 'agenda' ? 'move' : 'pointer' }}
                  >
                    <td className="text-center" colSpan={editSection === 'agenda' ? 7 : 6}>
                      {editSection === 'agenda' ? (
                        <input
                          className="form-control text-center fw-bold"
                          value={a.activity || ''}
                          placeholder="SECTION TITLE"
                          onChange={(e)=>{
                            const updated = [...agendaJoinData.agenda];
                            updated[idx].activity = e.target.value;
                            setAgendaJoinData({ ...agendaJoinData, agenda: updated });
                          }}
                        />
                      ) : (
                        <strong>{(a.activity || '').toUpperCase()}</strong>
                      )}
                    </td>
                  </tr>
                );
                return;
              }
              const min = isSpeech ? (a.minSpeechTime || "") : (a.minTime || "");
              const avg = isSpeech ? (a.avgSpeechTime || "") : (a.avgTime || "");
              const max = isSpeech ? (a.maxSpeechTime || "") : (a.maxTime || "");
              const useDurSec = parseDurationToSeconds(max || avg || min || 0) || 0;
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
                  key={`ag-${isSpeech ? 'sp' : 'ag'}-${idx}`}
                  className={`fade-in ${selectedRowRef?.zone === zone && selectedRowRef?.index === idx ? 'table-warning' : ''}`}
                  onClick={()=> setSelectedRowRef({ zone: isSpeech ? 'speech' : zone, index: isSpeech ? null : idx })}
                  draggable={editSection === 'agenda'}
                  onDragStart={() => (isSpeech ? handleSpeechDragStart(idx) : handleAgendaDragStart(idx))}
                  onDragOver={(e) => (isSpeech ? handleSpeechDragOver(e) : handleAgendaDragOver(e))}
                  onDrop={() => (isSpeech ? handleSpeechDrop(idx) : handleAgendaDrop(idx))}
                  style={{ cursor: editSection === 'agenda' ? 'move' : 'pointer' }}
                >
                  <td>{timeStr}</td>
                  {editSection === 'agenda' && !isSpeech ? (
                    <>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm text-center"
                          placeholder="mm or mm:ss"
                          value={min || ''}
                          onChange={(e)=>{
                            const updated = [...agendaJoinData.agenda];
                            updated[idx].minTime = e.target.value;
                            setAgendaJoinData({ ...agendaJoinData, agenda: updated });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm text-center"
                          placeholder="mm or mm:ss"
                          value={avg || ''}
                          onChange={(e)=>{
                            const updated = [...agendaJoinData.agenda];
                            updated[idx].avgTime = e.target.value;
                            setAgendaJoinData({ ...agendaJoinData, agenda: updated });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm text-center"
                          placeholder="mm or mm:ss"
                          value={max || ''}
                          onChange={(e)=>{
                            const updated = [...agendaJoinData.agenda];
                            updated[idx].maxTime = e.target.value;
                            setAgendaJoinData({ ...agendaJoinData, agenda: updated });
                          }}
                        />
                      </td>
                    </>
                  ) : (
                    hasOnlyOne ? (
                      <td colSpan={3} className="text-center fw-bold">{formatDurationMMSS(avg || min || max)}</td>
                    ) : (
                      <>
                        <td className="text-center">{formatDurationMMSS(min)}</td>
                        <td className="text-center">{formatDurationMMSS(avg)}</td>
                        <td className="text-center">{formatDurationMMSS(max)}</td>
                      </>
                    )
                  )}
                  <td>
                    {editSection === 'agenda' && !isSpeech && a.rowType !== 'section' ? (
                      <input
                        className="form-control"
                        value={a.activity || ''}
                        placeholder="Activity"
                        onChange={(e)=>{
                          const updated = [...agendaJoinData.agenda];
                          updated[idx].activity = e.target.value;
                          setAgendaJoinData({ ...agendaJoinData, agenda: updated });
                        }}
                      />
                    ) : (
                      <strong>{activityText}</strong>
                    )}
                  </td>
                  <td className="presenter-cell">
                    {editSection === 'agenda' && !isSpeech && a.rowType !== 'break' && a.rowType !== 'section' ? (
                      <select
                      className="form-select presenter-select"
                      value={a.member?.memberId || ''}
                      onChange={(e) => {
                        const updated = [...agendaJoinData.agenda];
                        const val = e.target.value;
                        updated[idx].member = val ? { memberId: Number(val) } : null;
                        setAgendaJoinData({ ...agendaJoinData, agenda: updated });
                      }}
                    >
                        <option value="">Select presenter</option>

                       {/* ✅ Available members with assigned roles */}
{members.filter(member => {
  const isAvailable = availableMembers.some(am => am.memberId === member.memberId);
  const hasRoles = assignedRoles[member.memberId]?.length > 0;
  return isAvailable && hasRoles;
}).length > 0 && (
  <optgroup label="Available with Assigned Roles">
    {members
      .filter(member => {
        const isAvailable = availableMembers.some(am => am.memberId === member.memberId);
        const hasRoles = assignedRoles[member.memberId]?.length > 0;
        return isAvailable && hasRoles;
      })
      .sort((a, b) => a.memberName.localeCompare(b.memberName))   
      .map(member => {
        const memberRoles = assignedRoles[member.memberId] || [];
        const roleNames = getRoleNames(memberRoles);
        const roleText = roleNames.join(', ');
        
        return (
          <option 
            key={`avail-with-roles-${member.memberId}`}
            value={member.memberId}
            title={`Assigned roles: ${roleText}`}
          >
            {member.memberName} ({roleText})
          </option>
        );
      })}
  </optgroup>
)}

{/* ✅ Available members with no role assignments */}
{members.filter(member => {
  const isAvailable = availableMembers.some(am => am.memberId === member.memberId);
  const hasNoRoles = !assignedRoles[member.memberId]?.length;
  const hasMarkedAvailability = availableMembers.some(am => 
    am.memberId === member.memberId && 
    am.roles && 
    am.roles.length > 0
  );
  return isAvailable && hasNoRoles && !hasMarkedAvailability;
}).length > 0 && (
  <optgroup label="Available (No Role Assignments)">
    {members
      .filter(member => {
        const isAvailable = availableMembers.some(am => am.memberId === member.memberId);
        const hasNoRoles = !assignedRoles[member.memberId]?.length;
        const hasMarkedAvailability = availableMembers.some(am => 
          am.memberId === member.memberId && 
          am.roles && 
          am.roles.length > 0
        );
        return isAvailable && hasNoRoles && !hasMarkedAvailability;
      })
      .sort((a, b) => a.memberName.localeCompare(b.memberName))   
      .map(member => (
        <option 
          key={`avail-no-assignments-${member.memberId}`}
          value={member.memberId}
          title="Available but not assigned any roles"
        >
          {member.memberName}
        </option>
      ))}
  </optgroup>
)}

{/* ✅ Available members with preferred roles */}
{members.filter(member => {
  const isAvailable = availableMembers.some(am => am.memberId === member.memberId);
  const hasNoAssignedRoles = !assignedRoles[member.memberId]?.length;
  const hasMarkedAvailability = availableMembers.some(am => 
    am.memberId === member.memberId && 
    am.roles && 
    am.roles.length > 0
  );
  return isAvailable && hasNoAssignedRoles && hasMarkedAvailability;
}).length > 0 && (
  <optgroup label="Available with Preferred Roles">
    {members
      .filter(member => {
        const isAvailable = availableMembers.some(am => am.memberId === member.memberId);
        const hasNoAssignedRoles = !assignedRoles[member.memberId]?.length;
        const hasMarkedAvailability = availableMembers.some(am => 
          am.memberId === member.memberId && 
          am.roles && 
          am.roles.length > 0
        );
        return isAvailable && hasNoAssignedRoles && hasMarkedAvailability;
      })
      .sort((a, b) => a.memberName.localeCompare(b.memberName))   
      .map(member => {
        const memberAvailability = availableMembers.find(am => am.memberId === member.memberId);
        const preferredRoles = memberAvailability?.roles || [];
        const roleText = preferredRoles.join(', ');
        
        return (
          <option 
            key={`avail-preferred-${member.memberId}`}
            value={member.memberId}
            title={roleText ? `Preferred roles: ${roleText}` : 'No preferred roles'}
          >
            {member.memberName} ({roleText || 'No preferred roles'})
          </option>
        );
      })}
  </optgroup>
)}

{/* ✅ Unavailable members */}
{members.filter(member => {
  const isUnavailable = !availableMembers.some(am => am.memberId === member.memberId);
  return isUnavailable;
}).length > 0 && (
  <optgroup label="Unavailable Members">
    {members
      .filter(member => !availableMembers.some(am => am.memberId === member.memberId))
      .sort((a, b) => a.memberName.localeCompare(b.memberName))   
      .map(member => {
        const memberRoles = assignedRoles[member.memberId] || [];
        const roleNames = getRoleNames(memberRoles);
        const roleText = roleNames.join(', ');
        
        return (
          <option 
            key={`unavailable-${member.memberId}`}
            value={member.memberId}
            title={roleText ? `Assigned roles: ${roleText}` : 'No roles assigned'}
            className="unavailable-option"
          >
            {member.memberName} (Not available){roleText && ` - ${roleText}`}
          </option>
        );
      })}
  </optgroup>
)}
</select>
                    ) : (
                      <div className="presenter-name">
                        {presenterName || (a.rowType !== 'break' ? 'TBD' : '')}
                      </div>
                    )}
                  </td>
                  {editSection === "agenda" && (
                    <td>
                      {!isSpeech ? (
                        <button
                          className="btn btn-sm btn-outline-danger delete-btn"
                          onClick={() => deleteAgendaItem(idx)}
                          title="Delete agenda item"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      ) : null}
                    </td>
                  )}
                </tr>
              );
            };

            const agendaList = agendaJoinData.agenda || [];
            const spList = agendaJoinData.speakerSpeech || [];
            const insertAt = Math.min(Math.max(0, speechesInsertIndex ?? agendaList.length), agendaList.length);

            agendaList.slice(0, insertAt).forEach((a, idx) => pushRow(a, idx, false));
            if (spList.length > 0) {
              const isSelectedHeader = selectedRowRef?.zone === 'speech' && selectedRowRef?.index == null;
              rows.push(
                <tr
                  key="ps-header"
                  className={`table-secondary ${isSelectedHeader ? 'table-warning' : ''}`}
                  onClick={()=> setSelectedRowRef({ zone: 'speech', index: null, header: true })}
                  style={{ cursor: 'pointer' }}
                  title="Click to insert after speeches"
                >
                  <td className="text-center" colSpan={editSection === 'agenda' ? 7 : 6}><strong>PREPARED SPEECHES SESSION</strong></td>
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

    {user?.role === "vp education" && editSection === "agenda" && (
      <div className="d-flex justify-content-end mt-3">
        <button
          className="btn btn-primary"
          onClick={handleSaveAgenda}
          disabled={saving}
          title="Save changes to Meeting Agenda"
        >
          <i className="fas fa-save me-2"></i>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    )}
  </div>
</div>

      
    
      {/* === Grammarian === */}
      <div className="card mb-4 agenda-card slide-up">
        <div className="card-header agenda-card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-spell-check me-2 text-purple"></i>Word of the Day / Phrase of the Day
          </h5>
          {/* Edit controls removed as requested */}
        </div>
        <div className="card-body">
          {agendaJoinData.grammarian.length === 0 ? (
            <div className="text-center text-muted py-4">
              <i className="fas fa-book fa-3x mb-3"></i>
              <p>No words of the day added yet</p>
            </div>
          ) : (
            agendaJoinData.grammarian.map((g, idx) => (
              <div key={g.grammarianId} className="grammarian-card">
                {editSection === "grammarian" ? (
                  <div className="edit-form">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Grammarian</label>
                        <select
                          className="form-select"
                          value={g.member?.memberId || ""}
                          onChange={(e) => {
                            const updated = [...agendaJoinData.grammarian];
                            const val = e.target.value;
                            updated[idx].member = val ? { memberId: Number(val) } : null;
                            setAgendaJoinData({ ...agendaJoinData, grammarian: updated });
                          }}
                        >
                          <option value="">Select grammarian</option>
                          {members.map(m => (
                            <option key={m.memberId} value={m.memberId}>{m.memberName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label">Word</label>
                        <input
                          className="form-control"
                          placeholder="Word of the day"
                          value={g.word}
                          onChange={(e) => {
                            const updated = [...agendaJoinData.grammarian];
                            updated[idx].word = e.target.value;
                            setAgendaJoinData({
                              ...agendaJoinData,
                              grammarian: updated,
                            });
                          }}
                        />
                      </div>
                      <div className="col-md-8 mb-3">
                        <label className="form-label">Meaning</label>
                        <input
                          className="form-control"
                          placeholder="Definition of the word"
                          value={g.meaning}
                          onChange={(e) => {
                            const updated = [...agendaJoinData.grammarian];
                            updated[idx].meaning = e.target.value;
                            setAgendaJoinData({
                              ...agendaJoinData,
                              grammarian: updated,
                            });
                          }}
                        />
                      </div>
                      <div className="col-12 mb-3">
                        <label className="form-label">Example</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          placeholder="Example sentence using the word"
                          value={g.example}
                          onChange={(e) => {
                            const updated = [...agendaJoinData.grammarian];
                            updated[idx].example = e.target.value;
                            setAgendaJoinData({
                              ...agendaJoinData,
                              grammarian: updated,
                            });
                          }}
                        />
                      </div>
                    </div>
                    <div className="d-flex justify-content-end">
                      <button
                        className="btn btn-sm btn-outline-danger delete-btn"
                        onClick={() => deleteGrammarian(idx)}
                        title="Delete word"
                      >
                        <i className="fas fa-trash me-1"></i>Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="d-flex align-items-center mb-2">
                      <i className="fas fa-quote-left text-primary me-2"></i>
                      <h6 className="mb-0">
                        <strong className="text-primary">{g.word || "Word"}</strong>
                        <span className="text-muted ms-2">– {g.meaning || "Definition"}</span>
                      </h6>
                    </div>
                    <p className="text-muted mb-0 ps-4">
                      <i className="fas fa-lightbulb me-2"></i>
                      <em>{g.example || "Example sentence"}</em>
                    </p>
                    <div className="text-end mt-2">
                      <small className="text-muted">
                        <i className="fas fa-user me-1"></i>
                        Grammarian: {getMemberNameById(g.member?.memberId) || "TBD"}
                      </small>
                    </div>
                  </div>
                )}
              </div>
            ))
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
    </div>
  );
};

export default CompleteAgenda;
