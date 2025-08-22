import React, { useEffect, useState } from "react";
import apiService from "../../api/api.js";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

function MembersTable() {
  const [members, setMembers] = useState([]);
  const { isVPEducation } = useAuth();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await apiService.getMembers();
      setMembers(response.data.data);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const deleteMember = async (id) => {
    if (window.confirm("Are you sure you want to delete this member?")) {
      try {
        await apiService.deleteMember(id);
        fetchMembers(); // refresh after delete
      } catch (error) {
        console.error("Error deleting member:", error);
      }
    }
  };

  return (
    <div className="container-fluid mt-2">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="fw-bold mb-2">Members List</h2>
          <p className="text-muted mb-0">
            {members.length} total members in the club
          </p>
        </div>
        {isVPEducation && (
          <Link to="/members/add" className="btn btn-success">
            + Add Member
          </Link>
        )}
      </div>

      <table className="table table-striped table-hover table-bordered shadow-sm">
        <thead className="table-dark">
          <tr>
            <th>ID</th>
            <th>MembershipId</th>
            <th>Name</th>
            <th>Email</th>
            <th>Contact</th>
            <th>Address</th>
            <th>Gender</th>
            <th>Date of Birth</th>
            <th>Joining Date</th>
            {/* <th>Hobbies</th> */}
            <th>Role</th>
            <th>MentorId</th>
            {isVPEducation && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {members.length > 0 ? (
            members.map((member) => (
              <tr key={member.memberId}>
                <td>{member.memberId}</td>
                <td>{member.membershipId}</td>
                <td>{member.memberName}</td>
                <td>{member.email}</td>
                <td>{member.contact}</td>
                <td>{member.address}</td>
                <td>{member.gender}</td>
                <td>{member.dob}</td>
                <td>{member.joiningDate}</td>
                {/* <td>{member.hobbies}</td> */}
                <td>{member.role}</td>
                <td>{member.mentorId}</td>
                {isVPEducation && (
                  <td>
                    <Link
                      to={`/members/edit/${member.memberId}`}
                      className="btn btn-primary btn-sm me-2"
                    >
                      Edit
                    </Link>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteMember(member.memberId)}
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={isVPEducation ? "12" : "11"} className="text-center text-muted">
                No members found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default MembersTable;