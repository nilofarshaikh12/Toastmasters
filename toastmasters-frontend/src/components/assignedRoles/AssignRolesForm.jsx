// src/components/assignedRoles/AssignRolesForm.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

// Import services
import assignedRoleService from "../../api/assignedRoleService.js";
import availableMemberService from "../../api/availableMemberService.js";
import meetingService from "../../api/meetingservice.js";
import roleService from "../../api/roleService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  ROLE_CATEGORIES,
  MEETING_CATEGORY_LABELS,
  getApplicableRoleCategories,
  canRoleBeDuplicated,
  getMaxRoleCount,
  formatRoleName
} from "../../constants/meetingCategories.js";


const AssignRolesForm = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [assignedRoles, setAssignedRoles] = useState({});
  const [memberHistory, setMemberHistory] = useState({});
  const [initialPreferences, setInitialPreferences] = useState({}); // cache for user’s original preferences
  const [preferredDisplayNames, setPreferredDisplayNames] = useState({}); // string display of preferences
  const [roleAssignmentCounts, setRoleAssignmentCounts] = useState({});
  const [meetingRoles, setMeetingRoles] = useState([]); // Add state to track meeting roles
  const { isVPEducation } = useAuth();

  useEffect(() => {
    fetchData();
  }, [meetingId]);

  useEffect(() => {
    // reset cache when meeting changes
    setInitialPreferences({});
    setPreferredDisplayNames({});
  }, [meetingId]);

  useEffect(() => {
    const fetchMeetingRoles = async () => {
      try {
        const response = await meetingService.getMeetingById(meetingId);
        setMeetingRoles(response.data.data?.roles || []);
      } catch (error) {
        console.error('Error fetching meeting roles:', error);
        setMeetingRoles([]);
      }
    };

    if (meetingId) fetchMeetingRoles();
  }, [meetingId]);

  const fetchData = async () => {
    try {
      const [meetingRes, assignedRolesRes, allRolesRes] =
        await Promise.all([
          meetingService.getMeetingById(meetingId),
          assignedRoleService.getAssignedRolesByMeeting(meetingId),
          roleService.getAllRoles(),
        ]);

      // Use robust fetch for available members (handles M prefix and fallbacks)
      const availableMembersRes = await availableMemberService.getAvailableMembersByMeetingRobust(meetingId);

      setMeeting(meetingRes.data.data);
      // Only include members who are AVAILABLE
      const normalizeStatus = (s) => String(s || '').toUpperCase();
      const resolvedAM = Array.isArray(availableMembersRes)
        ? availableMembersRes
        : (Array.isArray(availableMembersRes?.data)
            ? availableMembersRes.data
            : (Array.isArray(availableMembersRes?.data?.data) ? availableMembersRes.data.data : []));
      const availableOnly = (resolvedAM || []).filter(
        (am) => normalizeStatus(am.availabilityStatus) === 'AVAILABLE'
      );
      setAvailableMembers(availableOnly);
      setAllRoles(allRolesRes.data.data);

      // Cache immutable preferences snapshot
      const prefMap = {};
      const displayMap = {};
      (availableOnly || []).forEach((am) => {
        const key = String(am.memberId);
        const stored = localStorage.getItem(`tm_initial_prefs_${key}`);
        let prefs = [];

        if (stored) {
          try {
            prefs = JSON.parse(stored);
          } catch {
            prefs = [];
          }
        } else {
          prefs = Array.isArray(am.preferredRoles)
            ? am.preferredRoles.map((r) => ({
                roleId: r.roleId,
                roleName: r.roleName,
              }))
            : [];
          try {
            localStorage.setItem(`tm_initial_prefs_${key}`, JSON.stringify(prefs));
          } catch {}
        }

        prefMap[key] = prefs;
        displayMap[key] = prefs.map((r) => r.roleName).join(", ");
      });

      setInitialPreferences(prefMap);
      setPreferredDisplayNames(displayMap);

      // Group assigned roles
      const assignedRolesMap = assignedRolesRes.data.reduce((acc, role) => {
        if (!acc[role.memberId]) acc[role.memberId] = [];
        acc[role.memberId].push(role);
        return acc;
      }, {});
      setAssignedRoles(assignedRolesMap);

      // Role counts (using string IDs)
      const roleCounts = assignedRolesRes.data.reduce((acc, role) => {
        const roleIdStr = String(role.roleId);
        acc[roleIdStr] = (acc[roleIdStr] || 0) + 1;
        return acc;
      }, {});
      setRoleAssignmentCounts(roleCounts);

      // Member history (last 3 meetings)
      const historyResults = await Promise.all(
        availableOnly.map(async (am) => {
          const res = await assignedRoleService.getMemberRoleHistory(am.memberId);
          return { memberId: am.memberId, history: res.data };
        })
      );
      const historyMap = historyResults.reduce((acc, res) => {
        acc[res.memberId] = res.history;
        return acc;
      }, {});
      setMemberHistory(historyMap);
    } catch (error) {
      console.error("Error fetching data:", error);
      Swal.fire("Error", "Failed to fetch data. Please try again.", "error");
    }
  };

  // meeting status
  const getMeetingStatus = (m) => {
    try {
      if (!m?.date || !m?.startTime || !m?.endTime) return "Invalid";

      const normalizeTime = (t) =>
        t && t.includes(":") && t.split(":").length === 2 ? `${t}:00` : t;

      const parsedStart = new Date(`${m.date}T${normalizeTime(m.startTime)}`);
      const parsedEnd = new Date(`${m.date}T${normalizeTime(m.endTime)}`);

      if (isNaN(parsedStart) || isNaN(parsedEnd)) return "Invalid";

      const now = new Date();
      if (now < parsedStart) return "Upcoming";
      if (now <= parsedEnd) return "Ongoing";
      return "Closed";
    } catch {
      return "Error";
    }
  };

  const meetingStatus = getMeetingStatus(meeting || {});
  const isAssignClosed = meetingStatus !== "Upcoming";

  const canAssignRole = (roleId, roleName) => {
    const currentCount = roleAssignmentCounts[roleId] || 0;
    const canDuplicate = canRoleBeDuplicated(meeting?.category, roleName);
    const maxCount = getMaxRoleCount(meeting?.category, roleName);

    if (!canDuplicate) return currentCount === 0;
    return currentCount < maxCount;
  };

  const getMemberPreferencePriority = (memberId, roleId) => {
    const prefs = initialPreferences[String(memberId)] || [];
    const idx = prefs.findIndex((r) => r.roleId === roleId);
    return idx >= 0 ? idx + 1 : null;
  };

  const hadRoleInRecentMeetings = (memberId, roleId) => {
    const history = memberHistory[memberId] || [];
    return history.some((h) => h.roleId === roleId);
  };

  const getAvailableRolesForMember = (memberId) => {
    if (!meeting?.category) {
      return { preferredRoles: [], otherRoles: [] };
    }
    
    // Get all role instances defined in the meeting
    const memberAssignedRoles = assignedRoles[memberId] || [];
    const memberAssignedRoleIds = new Set(memberAssignedRoles.map(r => String(r.roleId)));

    // Calculate total assignments across ALL members for each role (using string IDs)
    const globalRoleAssignments = Object.values(assignedRoles).reduce((acc, assignments) => {
      assignments.forEach(assignment => {
        const roleIdStr = String(assignment.roleId);
        acc[roleIdStr] = (acc[roleIdStr] || 0) + 1;
      });
      return acc;
    }, {});

    // Get all unique roles from meetingRoles or fallback to allRoles filtered by category
    let availableRoleIds = new Set();
    
    if (meetingRoles && meetingRoles.length > 0) {
      // Use roles specifically assigned to this meeting
      meetingRoles.forEach(role => availableRoleIds.add(String(role.roleId)));
    } else {
      // Fallback: use all roles applicable to this meeting category
      const applicableCategories = getApplicableRoleCategories(meeting.category);
      allRoles.forEach(role => {
        if (applicableCategories.includes(role.category)) {
          availableRoleIds.add(String(role.roleId));
        }
      });
    }

    // Get available roles considering max instances and already assigned roles
    const availableRoles = [];
    
    Array.from(availableRoleIds).forEach(roleId => {
      const role = allRoles.find(r => String(r.roleId) === String(roleId));
      if (!role) {
        return;
      }
      
      const totalAssigned = globalRoleAssignments[String(roleId)] || 0;
      const maxInstances = getMaxRoleCount(meeting.category, role.roleName);
      const remainingInstances = Math.max(0, maxInstances - totalAssigned);
      
      // If no instances are available globally, don't show the role to anyone
      if (remainingInstances <= 0) {
        return;
      }
      
      // If the member already has this role assigned, don't show it again
      if (memberAssignedRoleIds.has(String(roleId))) {
        return;
      }

      // Add the role to available roles
      availableRoles.push({
        ...role,
        remainingInstances,
        totalAssigned,
        maxInstances
      });
    });

    // Keep preferences order for this member
    const prefs = initialPreferences[String(memberId)] || [];
    const prefIds = new Set(prefs.map(r => String(r.roleId)));

    const preferredRoles = prefs
      .map(p => availableRoles.find(ar => String(ar.roleId) === String(p.roleId)))
      .filter(Boolean);

    const otherRoles = availableRoles
      .filter(r => !prefIds.has(String(r.roleId)))
      .sort((a, b) => a.roleName.localeCompare(b.roleName));

    return { preferredRoles, otherRoles };
  };

  const handleAssignRole = async (memberId, roleId) => {
    if (isAssignClosed) {
      Swal.fire("Error", "Role assignment is closed for this meeting.", "error");
      return;
    }
    
    if (!roleId) return;

    const role = allRoles.find((r) => String(r.roleId) === String(roleId));
    if (!role) return;

    // Check if member already has this role assigned
    const memberAssignments = assignedRoles[memberId] || [];
    if (memberAssignments.some(a => String(a.roleId) === String(role.roleId))) {
      Swal.fire("Warning", `This member already has the role ${role.roleName} assigned.`, "warning");
      return;
    }

    // Check role history
    if (hadRoleInRecentMeetings(memberId, role.roleId)) {
      const result = await Swal.fire({
        title: "Warning",
        html: `This member already had the role <b>${role.roleName}</b> in recent meetings.<br/>Assign anyway?`,
        icon: "warning",
        showCancelButton: true,
      });
      if (!result.isConfirmed) return;
    }

    // Check role duplication
    if (!canRoleBeDuplicated(meeting.category, role.roleName)) {
      const existingAssignment = Object.entries(assignedRoles)
        .filter(([mId]) => mId !== String(memberId))
        .flatMap(([_, roles]) => roles)
        .find(a => String(a.roleId) === String(role.roleId));
        
      if (existingAssignment) {
        Swal.fire("Error", `${role.roleName} role cannot be duplicated in this meeting.`, "error");
        return;
      }
    }

    const result = await Swal.fire({
      title: "Assign Role",
      text: `Assign ${role.roleName}?`,
      icon: "warning",
      showCancelButton: true,
    });
    if (!result.isConfirmed) return;

    let tempId = '';
    try {
      // Optimistically update the UI
      tempId = `temp-${Date.now()}`;
      const newAssignment = {
        id: tempId,
        roleId: role.roleId,
        roleName: role.roleName,
        memberId,
        isOptimistic: true
      };

      // Update local state immediately
      setAssignedRoles(prev => ({
        ...prev,
        [memberId]: [...(prev[memberId] || []), newAssignment]
      }));

      // Make the API call
      const response = await assignedRoleService.assignRole({
        meetingId: Number(meetingId),
        memberId,
        roleId: role.roleId,
      });

      // Replace the temporary assignment with the real one from the server
      setAssignedRoles(prev => {
        const updated = { ...prev };
        if (updated[memberId]) {
          updated[memberId] = updated[memberId]
            .filter(a => a.id !== tempId)
            .concat({
              ...response.data,
              roleName: role.roleName
            });
        }
        return updated;
      });

      // Update role counts and force UI refresh
      setRoleAssignmentCounts(prev => ({
        ...prev,
        [String(role.roleId)]: (prev[String(role.roleId)] || 0) + 1
      }));
      
      // Force a re-render of the component to update dropdowns
      // This triggers a state change that will cause all dropdowns to re-evaluate available roles
      setAllRoles(prev => [...prev]);

      // Show success message
      Swal.fire({
        title: "Success",
        text: `Assigned ${role.roleName} to ${availableMembers.find(m => m.memberId === memberId)?.memberName || 'member'}`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error("Error assigning role:", err);
      
      // Rollback the optimistic update on error
      if (tempId) {
        setAssignedRoles(prev => {
          const updated = { ...prev };
          if (updated[memberId]) {
            updated[memberId] = updated[memberId].filter(a => a.id !== tempId);
            if (updated[memberId].length === 0) {
              delete updated[memberId];
            }
          }
          return updated;
        });
      }
      
      Swal.fire("Error", "Failed to assign role. Please try again.", "error");
    }
  };

  const handleDeleteAssignedRole = async (assignmentId, memberId, roleId) => {
    const role = allRoles.find(r => r.roleId === roleId);
    if (!role) return;

    const result = await Swal.fire({
      title: "Remove Role",
      text: `Remove ${role.roleName}?`,
      icon: "warning",
      showCancelButton: true,
    });
    if (!result.isConfirmed) return;

    try {
      // Store the assignment being deleted for rollback
      const deletedAssignment = assignedRoles[memberId]?.find(a => a.id === assignmentId);
      
      // Optimistically update the UI
      setAssignedRoles(prev => {
        const updated = { ...prev };
        if (updated[memberId]) {
          updated[memberId] = updated[memberId].filter(a => a.id !== assignmentId);
          if (updated[memberId].length === 0) {
            delete updated[memberId];
          }
        }
        return updated;
      });

      // Make the API call
      await assignedRoleService.deleteAssignedRole(assignmentId);
      
      // Check if we should readd to preferred roles
      const memberKey = String(memberId);
      const wasPreferred = initialPreferences[memberKey]?.some(p => p.roleId === role.roleId);
      
      if (wasPreferred) {
        // Re-add to preferred roles display
        setPreferredDisplayNames(prev => {
          const currentPrefs = prev[memberKey] || '';
          const roleName = role.roleName;
          
          // If role name is not already in the display string, add it
          if (!currentPrefs.includes(roleName)) {
            return {
              ...prev,
              [memberKey]: currentPrefs ? `${currentPrefs}, ${roleName}` : roleName
            };
          }
          return prev;
        });
      }
      
      // Show success message
      Swal.fire({
        title: "Success",
        text: `Removed ${role.roleName} assignment`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
      
      // Update role assignment counts to reflect the removal
      setRoleAssignmentCounts(prev => {
        const newCounts = { ...prev };
        const roleIdStr = String(role.roleId);
        const newCount = (newCounts[roleIdStr] || 1) - 1;
        if (newCount <= 0) {
          delete newCounts[roleIdStr];
        } else {
          newCounts[roleIdStr] = newCount;
        }
        return newCounts;
      });
      
      // Force re-render of all dropdowns to show the newly available role
      setAllRoles(prev => [...prev]);
      
    } catch (err) {
      console.error("Error deleting role:", err);
      
      // Re-fetch data to sync with server on error
      fetchData();
      
      Swal.fire("Error", "Failed to delete role. Please try again.", "error");
    }
  };

  const renderAssignedRoles = (member) => {
    const assignedRolesList = assignedRoles[member.memberId] || [];
    
    return (
      <div className="d-flex flex-wrap gap-2">
        {assignedRolesList.map((assignment) => {
          // Count instances of this role to show correct instance number
          const roleInstances = assignedRolesList
            .filter(r => r.roleId === assignment.roleId)
            .findIndex(r => r.id === assignment.id) + 1;
            
          const totalInstances = meetingRoles.filter(r => r.roleId === assignment.roleId).length;
          const displayName = totalInstances > 1 
            ? `${assignment.roleName} (${roleInstances} of ${totalInstances})`
            : assignment.roleName;
            
          return (
            <span 
              key={assignment.id} 
              className="badge bg-primary position-relative"
            >
              {displayName}
              {!isAssignClosed && (
                <button
                  className="btn-close btn-close-white btn-sm position-absolute top-0 end-0 translate-middle"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAssignedRole(
                      assignment.id, 
                      member.memberId, 
                      assignment.roleId
                    );
                  }}
                  style={{
                    fontSize: '0.5rem',
                    padding: '0.15rem',
                    lineHeight: '0.8',
                  }}
                  aria-label="Remove role"
                />
              )}
            </span>
          );
        })}
      </div>
    );
  };

  const renderRoleDropdown = (member) => {
    const { preferredRoles, otherRoles } = getAvailableRolesForMember(member.memberId);
    const allAvailableRoles = [...preferredRoles, ...otherRoles];
    
    return (
      <select
        className="form-select form-select-sm"
        onChange={(e) => handleAssignRole(member.memberId, e.target.value)}
        value=""
        disabled={isAssignClosed}
      >
        <option value="">Select Role</option>
        
        {/* Preferred Roles Section */}
        {preferredRoles.length > 0 && (
          <optgroup label="Preferred Roles">
            {preferredRoles.map((role) => {
              const pref = getMemberPreferencePriority(member.memberId, role.roleId);
              const hadRecent = hadRoleInRecentMeetings(member.memberId, role.roleId);
              
              let text = role.roleName;
              if (pref) text += ` (${pref}${pref === 1 ? 'st' : pref === 2 ? 'nd' : pref === 3 ? 'rd' : 'th'} choice)`;
              if (hadRecent) text += " ⚠️ Recent";
              if (role.maxInstances > 1) text += ` (${role.totalAssigned}/${role.maxInstances} assigned)`;

              return (
                <option key={role.roleId} value={role.roleId}>
                  {text}
                </option>
              );
            })}
          </optgroup>
        )}
        
        {/* Other Available Roles Section */}
        {otherRoles.length > 0 && (
          <optgroup label="Other Available Roles">
            {otherRoles.map((role) => {
              const hadRecent = hadRoleInRecentMeetings(member.memberId, role.roleId);
              
              let text = role.roleName;
              if (hadRecent) text += " ⚠️ Recent";
              if (role.maxInstances > 1) text += ` (${role.totalAssigned}/${role.maxInstances} assigned)`;

              return (
                <option key={role.roleId} value={role.roleId}>
                  {text}
                </option>
              );
            })}
          </optgroup>
        )}
        
        {/* No roles available message */}
        {allAvailableRoles.length === 0 && (
          <option value="" disabled>No roles available</option>
        )}
      </select>
    );
  };

  if (!isVPEducation) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">Only VP Education can assign roles.</div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="fw-bold">
        Assign Roles for Meeting: {meeting?.date || "N/A"}
      </h2>
      <p className="text-muted">
        Theme: {meeting?.theme || "N/A"} | Category:{" "}
        <span className="badge bg-info ms-1">
          {MEETING_CATEGORY_LABELS?.[meeting?.category] ||
            meeting?.category ||
            "Not Set"}
        </span>
        <span
          className={`badge ms-2 ${
            meetingStatus === "Upcoming"
              ? "bg-info"
              : meetingStatus === "Ongoing"
              ? "bg-success"
              : "bg-secondary"
          }`}
        >
          {meetingStatus}
        </span>
      </p>

      <table className="table table-striped table-hover table-bordered shadow-sm">
        <thead className="table-dark">
          <tr>
            <th style={{ width: '20%' }}>Member</th>
            <th style={{ width: '25%' }}>Preferred Roles</th>
            <th style={{ width: '30%' }}>Assigned Roles</th>
            <th style={{ width: '25%' }}>Assign Role</th>
          </tr>
        </thead>
        <tbody>
          {availableMembers.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-center text-muted py-4">
                No available members for this meeting.
              </td>
            </tr>
          ) : (
            availableMembers.map((member) => {
              const memberAssignments = assignedRoles[member.memberId] || [];
              const preferredRolesDisplay = preferredDisplayNames[String(member.memberId)] || "None";
              
              return (
                <tr key={member.memberId}>
                  <td className="align-middle">
                    <div className="fw-medium">{member.memberName}</div>
                    <small className="text-muted">
                      Status: <span className="badge bg-success">Available</span>
                    </small>
                  </td>
                  
                  <td className="align-middle">
                    <div className="text-sm">
                      {preferredRolesDisplay === "None" ? (
                        <span className="text-muted fst-italic">No preferences</span>
                      ) : (
                        <span className="text-primary">{preferredRolesDisplay}</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="align-middle">
                    {memberAssignments.length === 0 ? (
                      <span className="text-muted fst-italic">No roles assigned</span>
                    ) : (
                      renderAssignedRoles(member)
                    )}
                  </td>
                  
                  <td className="align-middle">
                    {renderRoleDropdown(member)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Role Assignment Summary */}
      <div className="card mt-4">
        <div className="card-header">
          <h5 className="mb-0">Role Assignment Summary</h5>
        </div>
        <div className="card-body">
          <div className="row">
            {Object.entries(
              allRoles.reduce((acc, role) => {
                const count = roleAssignmentCounts[role.roleId] || 0;
                const maxCount = meetingRoles.filter(r => r.roleId === role.roleId).length || 1;
                
                if (count > 0 || maxCount > 1) {
                  acc[role.roleId] = {
                    name: role.roleName,
                    count,
                    maxCount
                  };
                }
                return acc;
              }, {})
            ).map(([roleId, { name, count, maxCount }]) => (
              <div key={roleId} className="col-md-4 mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-medium">{name}</span>
                  <div className="d-flex align-items-center">
                    <span className="me-2">{count}/{maxCount}</span>
                    <div className="progress" style={{ width: '100px', height: '20px' }}>
                      <div 
                        className={`progress-bar ${count >= maxCount ? 'bg-success' : 'bg-primary'}`} 
                        role="progressbar" 
                        style={{ width: `${Math.min(100, (count / maxCount) * 100)}%` }}
                        aria-valuenow={count}
                        aria-valuemin="0"
                        aria-valuemax={maxCount}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignRolesForm;
