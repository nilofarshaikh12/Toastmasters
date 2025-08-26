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
  const { isVPEducation } = useAuth();

  useEffect(() => {
    fetchData();
  }, [meetingId]);

  useEffect(() => {
    // reset cache when meeting changes
    setInitialPreferences({});
    setPreferredDisplayNames({});
  }, [meetingId]);

  const fetchData = async () => {
    try {
      const [meetingRes, availableMembersRes, assignedRolesRes, allRolesRes] =
        await Promise.all([
          meetingService.getMeetingById(meetingId),
          availableMemberService.getAvailableMembersByMeeting(meetingId),
          assignedRoleService.getAssignedRolesByMeeting(meetingId),
          roleService.getAllRoles(),
        ]);

      setMeeting(meetingRes.data.data);
      setAvailableMembers(availableMembersRes.data);
      setAllRoles(allRolesRes.data.data);

      // Cache immutable preferences snapshot
      const prefMap = {};
      const displayMap = {};
      (availableMembersRes.data || []).forEach((am) => {
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

      // Role counts
      const roleCounts = assignedRolesRes.data.reduce((acc, role) => {
        acc[role.roleId] = (acc[role.roleId] || 0) + 1;
        return acc;
      }, {});
      setRoleAssignmentCounts(roleCounts);

      // Member history (last 3 meetings)
      const historyResults = await Promise.all(
        availableMembersRes.data.map(async (am) => {
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
    if (!meeting?.category) return allRoles;
    const applicableCategories = getApplicableRoleCategories(meeting.category);

    const applicableRoles = allRoles.filter(
      (r) =>
        r.category &&
        (applicableCategories.includes(r.category) ||
          r.category === ROLE_CATEGORIES.SHARED_ALL_MEETINGS)
    );

    // keep preferences order
    const prefs = initialPreferences[String(memberId)] || [];
    const prefIds = new Set(prefs.map((r) => r.roleId));

    const preferredRoles = prefs
      .map((p) => applicableRoles.find((ar) => ar.roleId === p.roleId))
      .filter(Boolean);

    const otherRoles = applicableRoles
      .filter((r) => !prefIds.has(r.roleId))
      .sort((a, b) => a.roleName.localeCompare(b.roleName));

    return [...preferredRoles, ...otherRoles];
  };

  const handleAssignRole = async (memberId, roleId) => {
    if (isAssignClosed) {
      Swal.fire("Closed", "Assignment is closed for this meeting.", "info");
      return;
    }
    if (!roleId) return;

    const role = allRoles.find((r) => r.roleId === Number(roleId));
    if (!role) return;

    // check history
    if (hadRoleInRecentMeetings(memberId, role.roleId)) {
      const result = await Swal.fire({
        title: "Warning",
        html: `This member already did <b>${role.roleName}</b> in the last 3 meetings.<br/>Assign anyway?`,
        icon: "warning",
        showCancelButton: true,
      });
      if (!result.isConfirmed) return;
    }

    // strict duplication check
    const existingAssignment = Object.values(assignedRoles)
      .flat()
      .find((a) => a.roleId === role.roleId && a.memberId !== memberId);

    if (!canRoleBeDuplicated(meeting.category, role.roleName) && existingAssignment) {
      Swal.fire(
        "Error",
        `The role "${role.roleName}" is already assigned.`,
        "error"
      );
      return;
    }

    if (!canAssignRole(role.roleId, role.roleName)) {
      Swal.fire("Error", `Cannot assign "${role.roleName}".`, "error");
      return;
    }

    try {
      await assignedRoleService.assignRole({
        meetingId: Number(meetingId),
        memberId,
        roleId: role.roleId,
      });
      Swal.fire("Success", `Assigned ${role.roleName}.`, "success");
      fetchData();
    } catch (err) {
      Swal.fire("Error", "Failed to assign role.", "error");
    }
  };

  const handleDeleteAssignedRole = async (assignmentId, memberId, roleName) => {
    const result = await Swal.fire({
      title: "Remove Role",
      text: `Remove ${roleName}?`,
      icon: "warning",
      showCancelButton: true,
    });
    if (!result.isConfirmed) return;

    try {
      await assignedRoleService.deleteAssignedRole(assignmentId);
      fetchData();
    } catch {
      Swal.fire("Error", "Failed to delete role.", "error");
    }
  };

  if (!isVPEducation)
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">Only VP Education can assign roles.</div>
      </div>
    );

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
            <th>Member</th>
            <th>Status</th>
            <th>Preferred Roles</th>
            <th>Last 3 Meetings</th>
            <th>Assigned Roles</th>
            <th>Assign Role</th>
          </tr>
        </thead>
        <tbody>
          {availableMembers.length > 0 ? (
            availableMembers.map((am) => {
              const assigned = assignedRoles[am.memberId] || [];
              const history = memberHistory[am.memberId] || [];
              return (
                <tr key={am.memberId}>
                  <td>{am.memberName}</td>
                  <td>{am.availabilityStatus}</td>
                  <td>{preferredDisplayNames[String(am.memberId)] || ""}</td>
                  <td>
                    {history.length > 0
                      ? history.map((h) => h.roleName).join(", ")
                      : "None"}
                  </td>
                  <td>
                    {assigned.length > 0 ? (
                      assigned.map((r) => (
                        <div
                          key={r.assignmentId}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <span>{r.roleName}</span>
                          <button
                            className="btn btn-sm btn-outline-danger ms-2"
                            onClick={() =>
                              handleDeleteAssignedRole(
                                r.assignmentId,
                                am.memberId,
                                r.roleName
                              )
                            }
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                  <td>
                    {isAssignClosed ? (
                      <span className="badge bg-secondary">{meetingStatus}</span>
                    ) : (
                      <select
                        className="form-select"
                        defaultValue=""
                        onChange={(e) =>
                          handleAssignRole(am.memberId, Number(e.target.value))
                        }
                      >
                        <option value="">Select a Role</option>
                        {getAvailableRolesForMember(am.memberId).map((role) => {
                          const pref = getMemberPreferencePriority(
                            am.memberId,
                            role.roleId
                          );
                          const hadRecent = hadRoleInRecentMeetings(
                            am.memberId,
                            role.roleId
                          );
                          const currentCount =
                            roleAssignmentCounts[role.roleId] || 0;
                          const maxCount = getMaxRoleCount(
                            meeting?.category,
                            role.roleName
                          );
                          const canDup = canRoleBeDuplicated(
                            meeting?.category,
                            role.roleName
                          );
                          const canAssign = canAssignRole(
                            role.roleId,
                            role.roleName
                          );

                          let text = role.roleName;
                          if (pref)
                            text += ` (${pref}${
                              pref === 1
                                ? "st"
                                : pref === 2
                                ? "nd"
                                : "rd"
                            } choice)`;
                          if (hadRecent) text += " ⚠️ Recent";
                          if (canDup && currentCount > 0)
                            text += ` (${currentCount}/${maxCount})`;
                          if (!canAssign && !canDup) text += " ❌ Taken";

                          return (
                            <option
                              key={role.roleId}
                              value={role.roleId}
                              disabled={!canAssign}
                            >
                              {text}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="6" className="text-center text-muted">
                No members have set availability.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AssignRolesForm;
