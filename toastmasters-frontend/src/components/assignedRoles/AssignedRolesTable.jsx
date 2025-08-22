// src/components/assignedRoles/AssignedRolesTable.jsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import assignedRoleService from "../../api/assignedRoleService.js";
import meetingService from "../../api/meetingservice.js";
import { useAuth } from "../../context/AuthContext.jsx";

const AssignedRolesTable = () => {
  const { meetingId } = useParams();
  const [assignedRoles, setAssignedRoles] = useState([]);
  const [meeting, setMeeting] = useState(null);
  const { isVPEducation } = useAuth();

  useEffect(() => {
    fetchAssignedRoles();
  }, [meetingId]);

  const fetchAssignedRoles = async () => {
    try {
      const [assignedRolesRes, meetingRes] = await Promise.all([
        assignedRoleService.getAssignedRolesByMeeting(meetingId),
        meetingService.getMeetingById(meetingId)
      ]);
      
      // Group roles by member to show member name only once
      const groupedRoles = assignedRolesRes.data.reduce((acc, role) => {
        const existingMember = acc.find(member => member.memberId === role.memberId);
        if (existingMember) {
          existingMember.roles.push(role.roleName);
        } else {
          acc.push({
            memberId: role.memberId,
            memberName: role.memberName,
            roles: [role.roleName]
          });
        }
        return acc;
      }, []);
      
      setAssignedRoles(groupedRoles);
      setMeeting(meetingRes.data.data);
    } catch (error) {
      console.error("Error fetching assigned roles:", error);
      Swal.fire("Error", "Failed to fetch assigned roles.", "error");
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="fw-bold">Assigned Roles</h2>
      {meeting && (
        <p className="text-muted">
          Meeting: {meeting.date} - {meeting.theme}
        </p>
      )}
      <table className="table table-striped table-hover table-bordered shadow-sm">
        <thead className="table-dark">
          <tr>
            <th>Member Name</th>
            <th>Assigned Roles</th>
          </tr>
        </thead>
        <tbody>
          {assignedRoles.length > 0 ? (
            assignedRoles.map((member) => (
              <tr key={member.memberId}>
                <td>{member.memberName}</td>
                <td>{member.roles.join(", ")}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="2" className="text-center text-muted">
                No roles have been assigned for this meeting.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AssignedRolesTable;