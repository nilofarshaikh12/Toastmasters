// src/components/availablemember/AvailableMembersTable.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import availableMemberService from "../../api/availableMemberService.js";
import meetingService from "../../api/meetingservice.js";
import apiService from "../../api/api.js";
import roleService from "../../api/roleService.js";
import assignedRoleService from "../../api/assignedRoleService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROLE_CATEGORIES, getApplicableRoleCategories } from "../../constants/meetingCategories.js";

function AvailableMembersTable() {
  const [groupedAvailability, setGroupedAvailability] = useState({});
  const [meetings, setMeetings] = useState([]);
  const [members, setMembers] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const { isVPEducation } = useAuth();
  const [assignedRoles, setAssignedRoles] = useState({});
  const [memberHistory, setMemberHistory] = useState({});
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const queryMeetingIdRaw = searchParams.get('meetingId');
  const normalizeMid = (v) => String(v ?? '').trim().replace(/^M/i, '');
  const queryMeetingId = queryMeetingIdRaw ? normalizeMid(queryMeetingIdRaw) : '';
  const [infoBanner, setInfoBanner] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  useEffect(() => {
    fetchData();
  }, [location.search]);

  const fetchData = async () => {
    try {
      const [
        availableMembersRes,
        meetingsRes,
        membersRes,
        rolesRes,
      ] = await Promise.all([
        availableMemberService.getAllAvailableMembers(),
        meetingService.getAllMeetings(),
        apiService.getMembers(),
        roleService.getAllRoles(),
      ]);

      // Normalize different API response shapes
      const availableMembers =
        availableMembersRes?.data?.data ?? availableMembersRes?.data ?? availableMembersRes ?? [];
      const meetingsData =
        meetingsRes?.data?.data ?? meetingsRes?.data ?? meetingsRes ?? [];
      const membersData =
        membersRes?.data?.data ?? membersRes?.data ?? membersRes ?? [];
      // roleService.getAllRoles() already returns an array per implementation
      const allRolesData = Array.isArray(rolesRes)
        ? rolesRes
        : (rolesRes?.data?.data ?? rolesRes?.data ?? rolesRes ?? []);

      console.log('[AvailableMembers] Sizes:', {
        availableMembers: Array.isArray(availableMembers) ? availableMembers.length : 'n/a',
        meetings: Array.isArray(meetingsData) ? meetingsData.length : 'n/a',
        members: Array.isArray(membersData) ? membersData.length : 'n/a',
        roles: Array.isArray(allRolesData) ? allRolesData.length : 'n/a',
      });
      
      // Filter to upcoming/ongoing meetings and sort by start datetime DESC (most upcoming first)
      const normalizeTime = (t) => {
        if (!t) return t;
        if (t.includes(":")) {
          const parts = t.split(":");
          return parts.length === 2 ? `${t}:00` : t;
        }
        return t;
      };

      const getStartEnd = (m) => {
        try {
          if (!m || !m.date) return { start: new Date(NaN), end: new Date(NaN) };
          if (String(m.date).includes("T")) {
            const d = new Date(m.date);
            return { start: d, end: d };
          }
          const start = new Date(`${m.date}T${normalizeTime(m.startTime || "00:00:00")}`);
          const end = new Date(`${m.date}T${normalizeTime(m.endTime || "23:59:59")}`);
          return { start, end };
        } catch (e) {
          console.warn("Failed to parse meeting times", e, m);
          return { start: new Date(NaN), end: new Date(NaN) };
        }
      };

      const now = new Date();
      // If a meetingId is provided and it's a past meeting, we still want to show a banner.
      let selectedMeetingFromAll = null;
      if (queryMeetingId) {
        selectedMeetingFromAll = (meetingsData || []).find(m => normalizeMid(m.meetingId) === queryMeetingId);
      }

      // Determine banner for past meeting selection and store selected meeting
      setSelectedMeeting(selectedMeetingFromAll || null);
      if (selectedMeetingFromAll) {
        const { end } = getStartEnd(selectedMeetingFromAll);
        if (!isNaN(end.getTime()) && end < now) {
          setInfoBanner('This meeting has already occurred. You can review availability, but assigning roles to past meetings may be restricted.');
        } else {
          setInfoBanner('');
        }
      } else {
        setInfoBanner('');
      }

      const upcomingMeetings = (meetingsData || [])
        .filter((m) => {
          const { end } = getStartEnd(m);
          return !isNaN(end.getTime()) && end >= now; // upcoming or ongoing
        })
        .sort((a, b) => {
          const { start: aStart } = getStartEnd(a);
          const { start: bStart } = getStartEnd(b);
          return bStart - aStart; // DESC
        });

      // Include selected past meeting if any
      let meetingsToInclude = [...upcomingMeetings];
      if (selectedMeetingFromAll) {
        const { end } = getStartEnd(selectedMeetingFromAll);
        const isPast = !isNaN(end.getTime()) && end < now;
        if (isPast) {
          const exists = meetingsToInclude.some(m => normalizeMid(m.meetingId) === normalizeMid(selectedMeetingFromAll.meetingId));
          if (!exists) {
            meetingsToInclude = [selectedMeetingFromAll, ...meetingsToInclude];
          }
        }
      }

      setMeetings(meetingsToInclude);
      setMembers(membersData);
      setAllRoles(allRolesData);

      const grouped = availableMembers.reduce((acc, am) => {
        // Group against the meetings we decided to include (upcoming + selected past if any)
        const meeting = meetingsToInclude.find(m => m.meetingId === am.meetingId);
        if (meeting) {
          if (!acc[meeting.meetingId]) {
            acc[meeting.meetingId] = {
              meeting,
              members: [],
            };
          }
          acc[meeting.meetingId].members.push(am);
        }
        return acc;
      }, {});
      setGroupedAvailability(grouped);
      
      // Fetch assigned roles for all meetings to display them
      const assignedRolesPromises = Object.keys(grouped).map(meetingId => 
        assignedRoleService.getAssignedRolesByMeeting(meetingId)
      );
      const assignedRolesResults = await Promise.all(assignedRolesPromises);
      
      // Debug: Log the structure of assigned roles
      console.log('Assigned roles results:', assignedRolesResults);
      if (assignedRolesResults.length > 0 && assignedRolesResults[0].data) {
        console.log('First assigned role item:', assignedRolesResults[0].data[0]);
      }
      
      const assignedRolesMap = assignedRolesResults.reduce((acc, res) => {
        if (res.data && res.data.length > 0) {
          res.data.forEach(role => {
            console.log('Processing role:', role); // Debug log
            if (!acc[role.meetingId]) {
              acc[role.meetingId] = {};
            }
            if (!acc[role.meetingId][role.memberId]) {
              acc[role.meetingId][role.memberId] = [];
            }
            acc[role.meetingId][role.memberId].push(role);
          });
        }
        return acc;
      }, {});
      
      console.log('Assigned roles map:', assignedRolesMap); // Debug log
      setAssignedRoles(assignedRolesMap);

      // Fetch role history for all members - handle empty database gracefully
      try {
        const allMemberIds = [...new Set(availableMembers.map(am => am.memberId))];
        const historyPromises = allMemberIds.map(async (memberId) => {
          try {
            const historyRes = await assignedRoleService.getMemberRoleHistory(memberId);
            return { memberId, history: historyRes.data || [] };
          } catch (error) {
            console.warn(`No history found for member ${memberId}, using empty array:`, error.message);
            return { memberId, history: [] };
          }
        });

        const historyResults = await Promise.all(historyPromises);
        const historyMap = historyResults.reduce((acc, res) => {
          acc[res.memberId] = res.history;
          return acc;
        }, {});
        setMemberHistory(historyMap);
      } catch (error) {
        console.warn("Error fetching member history, continuing without history data:", error);
        setMemberHistory({});
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
      Swal.fire("Error", "Failed to fetch data. Please try again.", "error");
    }
  };

  const deleteAvailableMember = async (id) => {
    if (window.confirm("Are you sure you want to delete this available member?")) {
      try {
        await availableMemberService.deleteAvailableMember(id);
        Swal.fire("Deleted!", "Available member has been deleted.", "success");
        fetchData(); // Refresh the list
      } catch (error) {
        console.error("Error deleting available member:", error);
        Swal.fire("Error", "Failed to delete available member.", "error");
      }
    }
  };

  // Helper function to check if role was assigned in past 3 meetings
  const checkRoleHistory = (memberId, roleId) => {
    const history = memberHistory[memberId] || [];
    
    // If no history data (empty database), skip history check
    if (!history || history.length === 0) {
      console.log(`No history found for member ${memberId}, skipping history check`);
      return false;
    }
    
    const roleName = getRoleName(parseInt(roleId));
    
    // Get last 3 meetings for this member (sorted by date descending)
    const recentHistory = history
      .sort((a, b) => new Date(b.meetingDate) - new Date(a.meetingDate))
      .slice(0, 3);
    
    // Check if this role was assigned in any of the last 3 meetings
    return recentHistory.some(record => record.roleName === roleName);
  };

  const handleAssignRole = async (meetingId, memberId, roleId) => {
    if (!roleId) return;

    // Keep original string IDs for API calls
    const payload = {
      meetingId: meetingId,  // Keep as M4 format
      memberId: memberId,
      roleId: roleId,        // Keep as R11 format
      forceAssign: false     // Will be set to true if user confirms
    };
    
    console.log('Initial payload:', JSON.stringify(payload, null, 2));

    try {
      // Check if meeting is in the past
      const meeting = meetings.find(m => m.meetingId === meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }
      
      if (new Date(meeting.meetingDate) < new Date()) {
        // Find role by ID (handling both string and numeric IDs)
        const role = allRoles.find(r => r.roleId === roleId || r.roleId === `R${roleId}` || r.roleId === parseInt(roleId.replace('R', '')));
        const roleName = role?.roleName || 'this role';
        const memberName = getMemberName(memberId);
        
        const result = await Swal.fire({
          title: 'Assign Role in Past Meeting',
          html: `The meeting on ${new Date(meeting.meetingDate).toLocaleDateString()} has already occurred.<br><br>Do you still want to assign ${memberName} as ${roleName}?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Yes, assign anyway',
          cancelButtonText: 'No, cancel',
          reverseButtons: true
        });

        if (!result.isConfirmed) {
          return; // User cancelled the assignment
        }
        
        // Add a flag to indicate this is an override
        payload.forceAssign = true;
      }
      // Skip history check if database was cleared
      if (Object.keys(memberHistory).length > 0) {
        const hasRecentRole = checkRoleHistory(memberId, roleId);
        
        if (hasRecentRole) {
          const roleName = getRoleName(parseInt(roleId));
          const memberName = getMemberName(parseInt(memberId));
          
          const result = await Swal.fire({
            title: 'Role Recently Assigned',
            text: `${memberName} was assigned the role "${roleName}" in one of the past 3 meetings. Do you still want to assign this role?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, assign role',
            cancelButtonText: 'No, cancel'
          });

          if (!result.isConfirmed) {
            return; // User cancelled, don't assign the role
          }
        }
      } else {
        console.log("No member history data available, skipping history validation");
      }


      console.log("Sending payload to backend:", JSON.stringify(payload, null, 2));
      
      // Check if meeting exists in our meetings array
      const meetingExists = meetings.some(m => m.meetingId === meetingId);
      if (!meetingExists) {
        console.warn("Meeting not found in frontend data, but proceeding with API call");
      }

      try {
        console.log('Sending payload to API:', JSON.stringify(payload, null, 2));
        const response = await assignedRoleService.assignRole(payload);
        console.log('API Response:', response);
        Swal.fire("Success", "Role assigned successfully!", "success");
        fetchData(); // Refresh the data to show the new assignment
      } catch (error) {
        console.error('Error assigning role:', {
          error: error,
          response: error.response,
          message: error.message,
          data: error.response?.data
        });
        
        const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred';
        console.log('Error message to check:', errorMessage);
        
        // Check if this is a role already assigned in last 3 meetings error
        if (errorMessage.toLowerCase().includes('role already assigned in last 3 meetings')) {
          // Get member and role names for better error message
          const memberName = getMemberName(payload.memberId);
          const role = allRoles.find(r => r.roleId === payload.roleId || r.roleId === `R${payload.roleId}` || r.roleId === parseInt(payload.roleId?.replace('R', '')));
          const roleName = role?.roleName || 'the selected role';
          
          // Show confirmation dialog for role already assigned
          const result = await Swal.fire({
            title: 'Role Recently Assigned',
            html: `This role (${roleName}) was already performed by ${memberName} in the past 3 meetings.<br><br>Do you still want to assign this role?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, assign anyway',
            cancelButtonText: 'No, cancel',
            reverseButtons: true
          });

          if (result.isConfirmed) {
            try {
              // Try again with forceAssign set to true
              const updatedPayload = { ...payload, forceAssign: true };
              await assignedRoleService.assignRole(updatedPayload);
              Swal.fire("Success", "Role assigned successfully!", "success");
              fetchData();
            } catch (retryError) {
              const retryErrorMessage = retryError.response?.data?.message || retryError.message || 'Failed to assign role';
              Swal.fire("Error", retryErrorMessage, "error");
            }
            return;
          }
        }
        // Check if this is a past meeting error
        else if (errorMessage.toLowerCase().includes('past meeting') || 
                errorMessage.toLowerCase().includes('forceassign')) {
          // Get member and role names for better error message
          const memberName = getMemberName(payload.memberId);
          // Find role by ID (handling both string and numeric IDs)
          const role = allRoles.find(r => r.roleId === payload.roleId || r.roleId === `R${payload.roleId}` || r.roleId === parseInt(payload.roleId?.replace('R', '')));
          const roleName = role?.roleName || 'the selected role';
          
          // Show confirmation dialog for past meeting
          const result = await Swal.fire({
            title: 'Assign Role in Past Meeting',
            html: `The meeting has already occurred. Do you want to assign ${memberName} as ${roleName} anyway?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, assign anyway',
            cancelButtonText: 'No, cancel',
            reverseButtons: true,
            allowOutsideClick: false
          });

          if (result.isConfirmed) {
            try {
              // Try again with forceAssign set to true
              const updatedPayload = { ...payload, forceAssign: true };
              await assignedRoleService.assignRole(updatedPayload);
              Swal.fire("Success", "Role assigned successfully!", "success");
              fetchData();
            } catch (retryError) {
              const retryErrorMessage = retryError.response?.data?.message || retryError.message || 'Failed to assign role';
              Swal.fire("Error", retryErrorMessage, "error");
            }
            return;
          }
        } else {
          // Show other errors
          Swal.fire({
            title: 'Error',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#3085d6',
          });
        }
      }
    } catch (error) {
      console.error("=== DETAILED ERROR INFO ===");
      console.error("Error object:", error);
      console.error("Error response:", error.response);
      console.error("Error response data:", JSON.stringify(error.response?.data, null, 2));
      console.error("Error response status:", error.response?.status);
      
      // Handle specific error for past meetings
      const errorMessage = error.response?.data?.message || error.message;
      
      if (errorMessage && errorMessage.toLowerCase().includes('past meeting')) {
        // Extract the meeting date from the error message if available
        const meetingDateMatch = errorMessage.match(/\d{4}-\d{2}-\d{2}/);
        const meetingDate = meetingDateMatch ? new Date(meetingDateMatch[0]).toLocaleDateString() : 'a past date';
        
        Swal.fire({
          title: 'Cannot Assign to Past Meeting',
          html: `The meeting on ${meetingDate} has already occurred and roles cannot be assigned to past meetings.`,
          icon: 'error',
          confirmButtonColor: '#3085d6',
        });
      } else {
        // For other errors, show a generic error message
        Swal.fire("Error", `Failed to assign role: ${errorMessage || 'Please try again.'}`, "error");
      }
    }
  };
  
  const getMemberName = (memberId) => {
    const member = members.find(m => m.memberId === memberId);
    return member ? member.memberName : 'Unknown Member';
  };

  const getRoleName = (roleId) => {
    const role = allRoles.find(r => r.roleId === roleId);
    return role ? role.roleName : 'Unknown Role';
  };

  // Helper function to get applicable roles for a meeting
  const getApplicableRolesForMeeting = (meetingId) => {
    const meeting = meetings.find(m => m.meetingId === meetingId);
    if (!meeting || !meeting.category) return allRoles;
    
    // Get applicable role categories for this meeting type
    const applicableCategories = getApplicableRoleCategories(meeting.category);
    
    // Filter roles to show only those applicable to this meeting type
    return allRoles.filter(role => {
      // Only show roles that have a category set
      if (!role.category) return false;
      return applicableCategories.includes(role.category) || 
             role.category === ROLE_CATEGORIES.SHARED_ALL_MEETINGS;
    });
  };

  const handleDeleteAssignedRole = async (assignedRole, memberId, roleName) => {
    console.log('Deleting assigned role:', assignedRole);
    console.log('All keys in assignedRole:', Object.keys(assignedRole));
    
    const result = await Swal.fire({
      title: 'Remove Assigned Role',
      text: `Are you sure you want to remove ${roleName} from this member?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove it',
      cancelButtonText: 'No, keep it',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      try {
        // Try all possible ID properties
        const assignmentId = assignedRole.assignedRoleId || 
                           assignedRole.id || 
                           assignedRole.assignmentId ||
                           assignedRole.assignedRoleID;
        
        console.log('Attempting to delete with ID:', assignmentId);
        
        if (!assignmentId) {
          const errorMsg = `No valid assignment ID found in role object. Available keys: ${Object.keys(assignedRole).join(', ')}`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        console.log(`Calling delete API with URL: http://localhost:8080/assigned_roles/${assignmentId}`);
        await assignedRoleService.deleteAssignedRole(assignmentId);
        Swal.fire('Deleted!', 'The role assignment has been removed.', 'success');
        fetchData();
      } catch (error) {
        console.error('Error deleting assigned role:', error);
        Swal.fire('Error', `Failed to remove the role assignment: ${error.message}`, 'error');
      }
    }
  };

  return (
    <div className="container mt-4">
      {/* Header actions when coming from a meeting */}
      {(queryMeetingId || infoBanner) && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="flex-grow-1">
            {infoBanner && (
              <div className="alert alert-warning mb-0" role="alert">
                {infoBanner}
              </div>
            )}
          </div>
          {selectedMeeting && (
            <div className="ms-3 d-flex gap-2">
              <Link to={`/meetings/${selectedMeeting.meetingId}`} className="btn btn-outline-secondary btn-sm">
                Back to Meeting
              </Link>
            </div>
          )}
        </div>
      )}
      {Object.keys(groupedAvailability).length > 0 ? (
        Object.keys(groupedAvailability)
          // If meetingId is provided in query, only show that meeting group
          .filter((key) => {
            if (!queryMeetingId) return true;
            const kNorm = normalizeMid(key);
            return kNorm === queryMeetingId;
          })
          .sort((a, b) => {
            try {
              const ma = groupedAvailability[a].meeting;
              const mb = groupedAvailability[b].meeting;
              const { start: aStart } = (function(m){
                if (!m || !m.date) return { start: new Date(NaN) };
                if (String(m.date).includes('T')) return { start: new Date(m.date) };
                const s = `${m.date}T${(m.startTime && m.startTime.includes(':') && m.startTime.split(':').length===2) ? m.startTime+':00' : (m.startTime || '00:00:00')}`;
                return { start: new Date(s) };
              })(ma);
              const { start: bStart } = (function(m){
                if (!m || !m.date) return { start: new Date(NaN) };
                if (String(m.date).includes('T')) return { start: new Date(m.date) };
                const s = `${m.date}T${(m.startTime && m.startTime.includes(':') && m.startTime.split(':').length===2) ? m.startTime+':00' : (m.startTime || '00:00:00')}`;
                return { start: new Date(s) };
              })(mb);
              return bStart - aStart; // DESC
            } catch (error) {
              console.error("Error sorting grouped meetings:", error);
              return 0;
            }
          })
          .map((currentMeetingId) => (
          <div key={currentMeetingId} className="card shadow-sm mb-4">
            <div className="card-header bg-dark text-white fw-bold d-flex justify-content-between align-items-center">
              <span>Meeting: {groupedAvailability[currentMeetingId].meeting.date} - {groupedAvailability[currentMeetingId].meeting.theme}</span>
              <span className="small">
                {(() => {
                  const m = groupedAvailability[currentMeetingId].meeting;
                  const now = new Date();
                  
                  // Use the same robust date parsing logic as MeetingsTable
                  let status = "Unknown";
                  
                  try {
                    if (!m.date || !m.startTime || !m.endTime) {
                      status = "Invalid";
                    } else {
                      let parsedStart, parsedEnd;
                      
                      // Handle different date formats
                      if (m.date.includes('T')) {
                        // If date already includes time (ISO format)
                        parsedStart = new Date(m.date);
                        parsedEnd = new Date(m.date);
                      } else {
                        // If separate date and time
                        const dateStr = m.date;
                        const startTimeStr = m.startTime;
                        const endTimeStr = m.endTime;
                        
                        // Try different time formats
                        let startTime, endTime;
                        
                        // Handle time with or without seconds
                        if (startTimeStr.includes(':')) {
                          const timeParts = startTimeStr.split(':');
                          if (timeParts.length === 2) {
                            startTime = `${startTimeStr}:00`;
                          } else {
                            startTime = startTimeStr;
                          }
                        } else {
                          startTime = startTimeStr;
                        }
                        
                        if (endTimeStr.includes(':')) {
                          const timeParts = endTimeStr.split(':');
                          if (timeParts.length === 2) {
                            endTime = `${endTimeStr}:00`;
                          } else {
                            endTime = endTimeStr;
                          }
                        } else {
                          endTime = endTimeStr;
                        }
                        
                        parsedStart = new Date(`${dateStr}T${startTime}`);
                        parsedEnd = new Date(`${dateStr}T${endTime}`);
                      }
                      
                      // Check if dates are valid
                      if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
                        status = "Invalid";
                      } else {
                        // Determine meeting status
                        if (now < parsedStart) {
                          status = "Upcoming";
                        } else if (now >= parsedStart && now <= parsedEnd) {
                          status = "Ongoing";
                        } else {
                          status = "Closed";
                        }
                      }
                    }
                  } catch (error) {
                    console.error(`Error parsing meeting date:`, error, m);
                    status = "Error";
                  }
                  
                  return status;
                })()}
              </span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Member Name</th>
                      <th>Availability Status</th>
                      <th>Preferred Roles</th>
                      <th>Assigned Roles</th>
                      <th>Actions</th>
                      {isVPEducation && <th>Assign Role</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {groupedAvailability[currentMeetingId].members
                      .filter((am) => String(am.availabilityStatus || '').toUpperCase() === 'AVAILABLE')
                      .map((am) => {
                      const assigned = assignedRoles[currentMeetingId]?.[am.memberId];
                      const meetingForRow = groupedAvailability[currentMeetingId].meeting;
                      const { end: rowEnd } = (function(m){
                        try {
                          if (!m || !m.date) return { end: new Date(NaN) };
                          if (String(m.date).includes('T')) return { end: new Date(m.date) };
                          const n = (t) => (t && t.includes(':') && t.split(':').length===2) ? t+':00' : (t || '23:59:59');
                          return { end: new Date(`${m.date}T${n(m.endTime)}`) };
                        } catch { return { end: new Date(NaN) } }
                      })(meetingForRow);
                      const isPastMeeting = !isNaN(rowEnd.getTime()) && rowEnd < new Date();
                      return (
                        <tr key={am.id}>
                          <td>{getMemberName(am.memberId)}</td>
                          <td>{am.availabilityStatus}</td>
                          <td>
                            {am.preferredRoles && am.preferredRoles.length > 0 ? (
                              <div>
                                {am.preferredRoles.map((role, index) => (
                                  <div key={role.roleId} className="mb-1">
                                    <small className="badge bg-secondary me-2">
                                      {index === 0 ? '1st' : index === 1 ? '2nd' : '3rd'}
                                    </small>
                                    <span>{role.roleName}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted">No preferences</span>
                            )}
                          </td>
                          <td>
                            {assigned && assigned.length > 0 
                              ? (
                                  <div>
                                    {assigned.map((role, index) => (
                                      <div key={index} className="d-flex justify-content-between align-items-center">
                                        <span>{role.roleName}</span>
                                        {isVPEducation && !isPastMeeting && (
                                          <button 
                                            className="btn btn-sm btn-outline-danger ms-2 p-0"
                                            style={{ width: '24px', height: '24px' }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteAssignedRole(role, am.memberId, role.roleName);
                                            }}
                                            title="Remove role"
                                          >
                                            <i className="bi bi-trash" style={{ fontSize: '0.75rem' }}></i>
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )
                              : "Not Assigned"
                            }
                          </td>
                          <td>
                            {isVPEducation ? (
                              <>
                                <Link
                                  to={`/available-members/edit/${am.id}`}
                                  className="btn btn-sm btn-outline-primary me-2"
                                >
                                  Edit
                                </Link>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => deleteAvailableMember(am.id)}
                                >
                                  Delete
                                </button>
                              </>
                            ) : (
                              <span className="text-muted">No actions available</span>
                            )}
                          </td>
{isVPEducation && (
                            <td>
                              <select
                                className="form-select me-2"
                                value=""
                                disabled={isPastMeeting}
                                onChange={(e) => {
                                  console.log("Dropdown changed - meetingId:", currentMeetingId, "memberId:", am.memberId, "roleId:", e.target.value);
                                  handleAssignRole(currentMeetingId, am.memberId, e.target.value);
                                }}
                                >
                                <option value="">Select a Role</option>
                                {getApplicableRolesForMeeting(currentMeetingId).map((role) => (
                                  <option key={role.roleId} value={role.roleId}>
                                    {role.roleName}
                                  </option>
                                ))}
                              </select>
                              {isPastMeeting && (
                                <small className="text-muted">Assignment disabled for past meetings.</small>
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
        ))
      ) : (
        <div className="alert alert-info text-center">
          No availability records found.
        </div>
      )}
    </div>
  );
}

export default AvailableMembersTable;