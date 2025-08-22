// src/components/availablemember/AvailableMembersTable.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

  useEffect(() => {
    fetchData();
  }, []);

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

      const availableMembers = availableMembersRes.data;
      const meetingsData = meetingsRes.data.data;
      const membersData = membersRes.data.data;
      const allRolesData = rolesRes.data.data;
      
      // Sort meetings by date (oldest first)
      const sortedMeetings = meetingsData.sort((a, b) => {
        try {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA - dateB; // Ascending order (oldest first)
        } catch (error) {
          console.error("Error sorting meetings by date:", error);
          return 0;
        }
      });
      setMeetings(sortedMeetings);
      setMembers(membersData);
      setAllRoles(allRolesData);

      const grouped = availableMembers.reduce((acc, am) => {
        const meeting = meetingsData.find(m => m.meetingId === am.meetingId);
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
      
      const assignedRolesMap = assignedRolesResults.reduce((acc, res) => {
        if (res.data && res.data.length > 0) {
          res.data.forEach(role => {
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
        
        // Check if this is a past meeting error
        if (errorMessage.toLowerCase().includes('past meeting') || 
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
    const member = members.find((m) => m.memberId === memberId);
    return member ? member.memberName : "Unknown Member";
  };

  const getRoleName = (roleId) => {
      const role = allRoles.find((r) => r.roleId === roleId);
      return role ? role.roleName : "Unknown Role";
  }

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

  return (
    <div className="container mt-4">
      {Object.keys(groupedAvailability).length > 0 ? (
        Object.keys(groupedAvailability)
          .sort((a, b) => {
            try {
              const meetingA = groupedAvailability[a].meeting;
              const meetingB = groupedAvailability[b].meeting;
              const dateA = new Date(meetingA.date);
              const dateB = new Date(meetingB.date);
              return dateA - dateB; // Ascending order (oldest first)
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
                    {groupedAvailability[currentMeetingId].members.map((am) => {
                      const assigned = assignedRoles[currentMeetingId]?.[am.memberId];
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
                                      <div key={index}>
                                        {role.roleName}
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