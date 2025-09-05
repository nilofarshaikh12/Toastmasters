// src/components/assignedRoles/AssignedRolesTable.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import assignedRoleService from "../../api/assignedRoleService.js";
import meetingService from "../../api/meetingservice.js";
import { useAuth } from "../../context/AuthContext.jsx";
import SpeakerEvaluatorTable from "../speaker-evaluator/SpeakerEvaluatorTable.jsx";

const AssignedRolesTable = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
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
      
      // Group roles by member with role details
      const groupedRoles = assignedRolesRes.data.reduce((acc, role) => {
        const existingMember = acc.find(member => member.memberId === role.memberId);
        if (existingMember) {
          existingMember.roles.push({
            id: role.id,
            name: role.roleName,
            assignmentId: role.id
          });
        } else {
          acc.push({
            memberId: role.memberId,
            memberName: role.memberName,
            roles: [{
              id: role.roleId,
              name: role.roleName,
              assignmentId: role.id
            }]
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

  const handleDeleteRole = async (assignmentId, roleName) => {
    const result = await Swal.fire({
      title: 'Remove Assigned Role',
      text: `Are you sure you want to remove ${roleName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove it!',
      cancelButtonText: 'No, keep it',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      try {
        await assignedRoleService.deleteAssignedRole(assignmentId);
        Swal.fire('Deleted!', 'The role assignment has been removed.', 'success');
        fetchAssignedRoles(); // Refresh the list
      } catch (error) {
        console.error('Error deleting assigned role:', error);
        Swal.fire('Error', 'Failed to remove the role assignment. Please try again.', 'error');
      }
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold mb-0">Assigned Roles</h2>
        <button 
          className="btn btn-outline-secondary btn-sm"
          onClick={() => navigate(`/meetings/${meetingId}`)}
          title="Back to meeting details"
        >
          <i className="bi bi-arrow-left me-1"></i> Back to Meeting
        </button>
      </div>
      {meeting && (
        <>
          <p className="text-muted">
            Meeting: {meeting.date} - {meeting.theme}
          </p>
          {(() => {
            try {
              const normalizeTime = (t) => {
                if (!t) return t;
                if (String(t).includes(':')) {
                  const parts = String(t).split(':');
                  return parts.length === 2 ? `${t}:00` : t;
                }
                return t;
              };
              let end;
              if (String(meeting.date || '').includes('T')) {
                end = new Date(meeting.date);
              } else {
                end = new Date(`${meeting.date}T${normalizeTime(meeting.endTime || '23:59:59')}`);
              }
              if (!isNaN(end.getTime()) && end < new Date()) {
                return (
                  <div className="alert alert-warning py-2" role="alert">
                    This meeting has already occurred. Assigned roles are read-only.
                  </div>
                );
              }
            } catch {}
            return null;
          })()}
        </>
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
                <td>
                  <div className="d-flex flex-wrap gap-2">
                    {member.roles.map((role, index) => (
                      <div key={`${member.memberId}-${role.id}-${index}`} className="d-flex align-items-center">
                        <span className="me-1">{role.name}</span>
                        {isVPEducation && (() => {
                          try {
                            const normalizeTime = (t) => {
                              if (!t) return t;
                              if (String(t).includes(':')) {
                                const parts = String(t).split(':');
                                return parts.length === 2 ? `${t}:00` : t;
                              }
                              return t;
                            };
                            let end;
                            if (String(meeting?.date || '').includes('T')) {
                              end = new Date(meeting.date);
                            } else {
                              end = new Date(`${meeting?.date}T${normalizeTime(meeting?.endTime || '23:59:59')}`);
                            }
                            const isPast = meeting && !isNaN(end.getTime()) && end < new Date();
                            return !isPast;
                          } catch { return true; }
                        })() && (
                          <button 
                            className="btn btn-sm btn-outline-danger py-0 px-1 ms-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role.assignmentId, role.name);
                            }}
                            title="Remove role"
                          >
                            <i className="bi bi-trash" style={{ fontSize: '0.75rem' }}></i>
                          </button>
                        )}
                        {index < member.roles.length - 1 && <span className="mx-1">,</span>}
                      </div>
                    ))}
                  </div>
                </td>
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

      {/* Speaker-Evaluator mapping table below Assigned Roles */}
      <div className="mt-4">
        <h4 className="fw-bold mb-2">Speakers and Their Evaluators</h4>
        <SpeakerEvaluatorTable meetingId={meetingId} canAssign={isVPEducation} />
      </div>
    </div>
  );
};

export default AssignedRolesTable;