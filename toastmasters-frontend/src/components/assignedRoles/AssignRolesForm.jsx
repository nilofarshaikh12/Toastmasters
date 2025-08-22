// src/components/assignedRoles/AssignRolesForm.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

// Import all necessary services
import assignedRoleService from "../../api/assignedRoleService.js";
import availableMemberService from "../../api/availableMemberService.js";
import meetingService from "../../api/meetingservice.js";
import roleService from "../../api/roleService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROLE_CATEGORIES, getApplicableRoleCategories, canRoleBeDuplicated, getMaxRoleCount } from "../../constants/meetingCategories.js";

const AssignRolesForm = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [assignedRoles, setAssignedRoles] = useState({});
  const [memberHistory, setMemberHistory] = useState({});
  const [roleAssignmentCounts, setRoleAssignmentCounts] = useState({}); // Track role assignments
  const { isVPEducation } = useAuth();

  useEffect(() => {
    fetchData();
  }, [meetingId]);

  const fetchData = async () => {
    try {
      const [
        meetingRes,
        availableMembersRes,
        assignedRolesRes,
        allRolesRes,
      ] = await Promise.all([
        meetingService.getMeetingById(meetingId),
        availableMemberService.getAvailableMembersByMeeting(meetingId),
        assignedRoleService.getAssignedRolesByMeeting(meetingId),
        roleService.getAllRoles(),
      ]);

      setMeeting(meetingRes.data.data);
      setAvailableMembers(availableMembersRes.data);
      setAllRoles(allRolesRes.data.data);
      
      // Debug: Log all role names to see exact matches
      console.log("All roles in system:", allRolesRes.data.data.map(r => ({ id: r.roleId, name: r.roleName })));
      console.log("Meeting category:", meetingRes.data.data.category);

      // Group assigned roles by member ID to handle multiple roles per member
      const assignedRolesMap = assignedRolesRes.data.reduce((acc, role) => {
        if (!acc[role.memberId]) {
          acc[role.memberId] = [];
        }
        acc[role.memberId].push(role);
        return acc;
      }, {});
      setAssignedRoles(assignedRolesMap);

      // Calculate role assignment counts for duplication tracking
      const roleCounts = assignedRolesRes.data.reduce((acc, role) => {
        acc[role.roleId] = (acc[role.roleId] || 0) + 1;
        return acc;
      }, {});
      console.log("Role assignment counts:", roleCounts);
      console.log("Assigned roles data:", assignedRolesRes.data);
      console.log("Grouped assigned roles:", assignedRolesMap);
      setRoleAssignmentCounts(roleCounts);

      // Fetch and store role history for each available member
      const historyPromises = availableMembersRes.data.map(async (am) => {
        const historyRes = await assignedRoleService.getMemberRoleHistory(am.memberId);
        return { memberId: am.memberId, history: historyRes.data };
      });

      const historyResults = await Promise.all(historyPromises);
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

  // Helper function to check if a role can be assigned (considering duplication rules)
  const canAssignRole = (roleId, roleName) => {
    if (!meeting || !meeting.category) {
      console.log(`No meeting or category found, allowing assignment`);
      return true;
    }
    
    const currentCount = roleAssignmentCounts[roleId] || 0;
    const canDuplicate = canRoleBeDuplicated(meeting.category, roleName);
    const maxCount = getMaxRoleCount(meeting.category, roleName);
    
    console.log(`=== Role Assignment Check ===`);
    console.log(`Role: ${roleName} (ID: ${roleId})`);
    console.log(`Meeting Category: ${meeting.category}`);
    console.log(`Current Count: ${currentCount}`);
    console.log(`Can Duplicate: ${canDuplicate}`);
    console.log(`Max Count: ${maxCount}`);
    console.log(`Role Assignment Counts:`, roleAssignmentCounts);
    
    // If role cannot be duplicated, only allow if not already assigned
    if (!canDuplicate) {
      const canAssign = currentCount === 0;
      console.log(`Role ${roleName} cannot be duplicated. Can assign: ${canAssign}`);
      return canAssign;
    }
    
    // If role can be duplicated, check against max count
    const canAssign = currentCount < maxCount;
    console.log(`Role ${roleName} can be duplicated. Can assign: ${canAssign} (${currentCount} < ${maxCount})`);
    return canAssign;
  };

  // Helper function to check if member had this role in past 3 meetings
  const hadRoleInRecentMeetings = (memberId, roleId) => {
    const history = memberHistory[memberId] || [];
    return history.some(h => h.roleId === roleId);
  };

  // Helper function to get member's preference priority for a role (1st, 2nd, 3rd)
  const getMemberPreferencePriority = (memberId, roleId) => {
    const member = availableMembers.find(am => am.memberId === memberId);
    if (!member || !member.preferredRoles) return null;
    
    const preferenceIndex = member.preferredRoles.findIndex(role => role.roleId === roleId);
    return preferenceIndex >= 0 ? preferenceIndex + 1 : null;
  };

  // Helper function to get available roles for member (preserve preference order)
  const getAvailableRolesForMember = (memberId) => {
    if (!meeting || !meeting.category) return allRoles;
    
    // Get applicable roles for this meeting category
    const applicableCategories = getApplicableRoleCategories(meeting.category);
    const applicableRoles = allRoles.filter(role => 
      role.category && (
        applicableCategories.includes(role.category) || 
        role.category === ROLE_CATEGORIES.SHARED_ALL_MEETINGS
      )
    );

    // Get member's preferred roles in their original order
    const member = availableMembers.find(am => am.memberId === memberId);
    const memberPreferences = member?.preferredRoles || [];
    
    // Map preferred roles to full role objects while preserving order
    const preferredRoleIds = new Set(memberPreferences.map(role => role.roleId));
    const preferredRoles = memberPreferences
      .map(prefRole => applicableRoles.find(appRole => appRole.roleId === prefRole.roleId))
      .filter(role => role !== undefined); // Remove any undefined roles
    
    const otherRoles = applicableRoles
      .filter(role => !preferredRoleIds.has(role.roleId))
      .sort((a, b) => a.roleName.localeCompare(b.roleName));
    
    return [...preferredRoles, ...otherRoles];
  };

  const handleAssignRole = async (memberId, roleId) => {
    if (!roleId) {
      Swal.fire("Warning", "Please select a role to assign.", "warning");
      return;
    }

    // Find the role to get its name for validation
    const role = allRoles.find(r => r.roleId === roleId);
    if (!role) {
      Swal.fire("Error", "Invalid role selected.", "error");
      return;
    }

    // Check if this role is already assigned to another member
    const existingAssignment = Object.values(assignedRoles)
      .flat() // Flatten the arrays since assignedRoles now contains arrays
      .find(assignedRole => assignedRole.roleId === roleId && assignedRole.memberId !== memberId);

    // Get member name for the existing assignment
    const existingMemberName = existingAssignment 
      ? availableMembers.find(m => m.memberId === existingAssignment.memberId)?.memberName || "Unknown Member"
      : null;

    // STRICT validation - Check if role can be assigned before making the API call
    const canDuplicate = canRoleBeDuplicated(meeting.category, role.roleName);
    const currentCount = roleAssignmentCounts[roleId] || 0;
    const maxCount = getMaxRoleCount(meeting.category, role.roleName);
    
    console.log(`=== STRICT ASSIGNMENT CHECK ===`);
    console.log(`Role: ${role.roleName} (ID: ${roleId})`);
    console.log(`Meeting Category: ${meeting.category}`);
    console.log(`Can Duplicate: ${canDuplicate}`);
    console.log(`Current Count: ${currentCount}`);
    console.log(`Max Count: ${maxCount}`);
    console.log(`Existing Assignment:`, existingAssignment);
    
    // BLOCK assignment if role cannot be duplicated and already assigned to another member
    if (!canDuplicate && existingAssignment) {
      Swal.fire({
        title: "Role Already Assigned!",
        text: `The role "${role.roleName}" is already assigned to ${existingMemberName}. This role can only be assigned to one person.`,
        icon: "error",
        confirmButtonText: "OK"
      });
      return;
    }
    
    // If role can be duplicated, check against max count
    const canAssign = currentCount < maxCount;
    console.log(`Role ${roleName} can be duplicated. Can assign: ${canAssign} (${currentCount} < ${maxCount})`);
    return canAssign;
  };

  if (!isVPEducation) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">Only VP Education can assign roles.</div>
      </div>
    );
  }

  // Filter roles based on meeting category
  const applicableRoleCategories = meeting.category ? getApplicableRoleCategories(meeting.category) : [];
  const filteredRoles = allRoles.filter(role => {
    if (!meeting.category || !role.category) {
      return true; // Show all roles if category is not set
    }
    return applicableRoleCategories.includes(role.category);
  });

  return (
    <div className="container mt-4">
      <h2 className="fw-bold">Assign Roles for Meeting: {meeting.date}</h2>
      <p className="text-muted">
        Theme: {meeting.theme} | 
        Category: <span className="badge bg-info ms-1">
          {MEETING_CATEGORY_LABELS[meeting.category] || meeting.category || 'Not Set'}
        </span>
      </p>
      {meeting.category && (
        <div className="alert alert-info">
          <small>
            <strong>Note:</strong> Only roles applicable for {MEETING_CATEGORY_LABELS[meeting.category]} are shown below.
          </small>
        </div>
      )}

      <table className="table table-striped table-hover table-bordered shadow-sm">
        <thead className="table-dark">
          <tr>
            <th>Member</th>
            <th>Availability Status</th>
            <th>Preferred Roles</th>
            <th>Last 3 Meeting Roles</th> {/* New column for history */}
            <th>Assigned Roles</th>
            {isVPEducation && <th>Assign Role</th>}
          </tr>
        </thead>
        <tbody>
          {availableMembers.length > 0 ? (
            availableMembers.map((am) => {
              const assignedRolesList = assignedRoles[am.memberId] || [];
              const history = memberHistory[am.memberId] || [];
              const recentRoleIds = new Set(history.map(h => h.roleId));
              return (
                <tr key={am.id}>
                  <td>{am.memberName}</td>
                  <td>{am.availabilityStatus}</td>
                  <td>
                    {am.preferredRoles && am.preferredRoles.map(role => role.roleName).join(", ")}
                  </td>
                  <td>
                    {history.length > 0 ? history.map(h => h.roleName).join(", ") : "None"}
                  </td>
                  <td>
                    {console.log(`Member ${am.memberName} assigned roles:`, assignedRolesList)}
                    {assignedRolesList.length > 0 
                      ? (
                          <div>
                            {assignedRolesList.map((role, index) => (
                              <div key={index}>
                                {role.roleName}
                              </div>
                            ))}
                          </div>
                        )
                      : "Not Assigned"
                    }
                  </td>
                  {isVPEducation && (
                    <td>
                      <div className="d-flex align-items-center">
                        <select
                          className="form-select me-2"
                          value=""
                          onChange={(e) => handleAssignRole(am.memberId, e.target.value)}
                        >
                          <option value="">Select a Role</option>
                          {getAvailableRolesForMember(am.memberId).map((role) => {
                            const preference = getMemberPreferencePriority(am.memberId, role.roleId);
                            const hadRecent = hadRoleInRecentMeetings(am.memberId, role.roleId);
                            const currentCount = roleAssignmentCounts[role.roleId] || 0;
                            const maxCount = getMaxRoleCount(meeting?.category, role.roleName);
                            const canDuplicate = canRoleBeDuplicated(meeting?.category, role.roleName);
                            const canAssign = canAssignRole(role.roleId, role.roleName);
                            
                            let optionText = role.roleName;
                            if (preference) optionText += ` (${preference}${preference === 1 ? 'st' : preference === 2 ? 'nd' : 'rd'} choice)`;
                            if (hadRecent) optionText += ' ⚠️ Recent';
                            if (canDuplicate && currentCount > 0) optionText += ` (${currentCount}/${maxCount})`;
                            if (!canAssign && !canDuplicate) optionText += ' ❌ Taken';
                            
                            return (
                              <option
                                key={role.roleId}
                                value={role.roleId}
                                disabled={!canAssign}
                              >
                                {optionText}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="6" className="text-center text-muted">
                No members have set their availability for this meeting.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AssignRolesForm;