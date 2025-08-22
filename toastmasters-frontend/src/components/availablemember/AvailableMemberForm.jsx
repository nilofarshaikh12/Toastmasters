import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import availableMemberService from "../../api/availableMemberService.js";
import meetingService from "../../api/meetingservice.js";
import apiService from "../../api/api.js"; 
import roleService from "../../api/roleService.js";
import { ROLE_CATEGORIES, getApplicableRoleCategories } from "../../constants/meetingCategories.js";

function AvailableMemberForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // Get the current location object
  
  // Extract the meetingId from the URL's query parameters
  const searchParams = new URLSearchParams(location.search);
  const preselectedMeetingId = searchParams.get("meetingId");

  const [availableMember, setAvailableMember] = useState({
    // Set the initial meetingId from the URL or to an empty string
    meetingId: preselectedMeetingId || "",
    memberId: "",
    availabilityStatus: "AVAILABLE",
    preferredRoleIds: new Set(),
  });

  const [meetings, setMeetings] = useState([]);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meetingsRes, membersRes, rolesRes] = await Promise.all([
          meetingService.getAllMeetings(),
          apiService.getMembers(),
          roleService.getAllRoles(),
        ]);
        setMeetings(meetingsRes.data.data);
        setMembers(membersRes.data.data);
        setRoles(rolesRes.data.data);

        // If in edit mode, fetch existing data and override
        if (id) {
          const amRes = await availableMemberService.getAvailableMemberById(id);
          const amData = amRes.data;
          setAvailableMember({
            ...amData,
            preferredRoleIds: new Set(
              amData.preferredRoles.map((role) => role.roleId)
            ),
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [id]);

  // Filter roles based on selected meeting category
  useEffect(() => {
    if (availableMember.meetingId && meetings.length > 0 && roles.length > 0) {
      const selectedMeeting = meetings.find(m => m.meetingId === availableMember.meetingId);
      
      if (selectedMeeting && selectedMeeting.category) {
        console.log("Filtering roles for meeting category:", selectedMeeting.category);
        
        // Get applicable role categories for this meeting type
        const applicableCategories = getApplicableRoleCategories(selectedMeeting.category);
        
        // Filter roles to show only those applicable to this meeting type
        const filtered = roles.filter(role => {
          // Only include roles that have a category and match the meeting type or are shared
          return role.category && (
            applicableCategories.includes(role.category) || 
            role.category === ROLE_CATEGORIES.SHARED_ALL_MEETINGS
          );
        });
        
        console.log("Available roles for this meeting:", filtered.length);
        setFilteredRoles(filtered);
      } else {
        // If no meeting selected or no category, show all roles
        setFilteredRoles(roles);
      }
    } else {
      // If no meeting selected, show all roles
      setFilteredRoles(roles);
    }
  }, [availableMember.meetingId, meetings, roles]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAvailableMember((prev) => {
      const newState = {
        ...prev,
        [name]: value,
      };
      
      // If meeting changed, clear preferred roles to avoid invalid selections
      if (name === 'meetingId') {
        newState.preferredRoleIds = new Set();
      }
      
      return newState;
    });
  };

  const handleRoleChange = (e) => {
    const { value, checked } = e.target;
    setAvailableMember((prev) => {
      const newRoles = new Set(prev.preferredRoleIds);
      if (checked) {
        newRoles.add(value);
      } else {
        newRoles.delete(value);
      }
      return { ...prev, preferredRoleIds: newRoles };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...availableMember,
      preferredRoleIds: Array.from(availableMember.preferredRoleIds),
    };

    try {
      if (id) {
        await availableMemberService.updateAvailableMember(id, payload);
        Swal.fire("Success", "Availability updated successfully!", "success");
      } else {
        await availableMemberService.addAvailableMember(payload);
        Swal.fire("Success", "Availability added successfully!", "success");
      }
      navigate("/available-members");
    } catch (error) {
      console.error("Error saving availability:", error);
      Swal.fire("Error", "Failed to save availability.", "error");
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="fw-bold">{id ? "Edit Availability" : "Add Availability"}</h2>
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-md-6">
            <label htmlFor="meetingId" className="form-label">Meeting</label>
            <select
              className="form-control"
              id="meetingId"
              name="meetingId"
              value={availableMember.meetingId}
              onChange={handleChange}
              required
              // Disable the select if a meetingId is already in the URL
              disabled={!!preselectedMeetingId}
            >
              <option value="">Select a Meeting</option>
              {meetings.map((meeting) => (
                <option key={meeting.meetingId} value={meeting.meetingId}>
                  {meeting.date} - {meeting.theme}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label htmlFor="memberId" className="form-label">Member</label>
            <select
              className="form-control"
              id="memberId"
              name="memberId"
              value={availableMember.memberId}
              onChange={handleChange}
              required
            >
              <option value="">Select a Member</option>
              {members.map((member) => (
                <option key={member.memberId} value={member.memberId}>
                  {member.memberName}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label htmlFor="availabilityStatus" className="form-label">Availability Status</label>
            <select
              className="form-control"
              id="availabilityStatus"
              name="availabilityStatus"
              value={availableMember.availabilityStatus}
              onChange={handleChange}
              required
            >
              <option value="AVAILABLE">Available</option>
              <option value="UNAVAILABLE">Unavailable</option>
              <option value="TENTATIVE">Tentative</option>
            </select>
          </div>
          <div className="col-md-12">
            <label className="form-label">
              Preferred Roles (Select up to 3)
              {availableMember.meetingId && meetings.find(m => m.meetingId === availableMember.meetingId) && (
                <small className="text-muted ms-2">
                  - Showing roles for {meetings.find(m => m.meetingId === availableMember.meetingId)?.category || 'this meeting type'}
                </small>
              )}
            </label>
            <div className="d-flex flex-wrap">
              {filteredRoles.length > 0 ? (
                filteredRoles.map((role) => (
                  <div key={role.roleId} className="form-check me-3 mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value={role.roleId}
                      id={`role-${role.roleId}`}
                      checked={availableMember.preferredRoleIds.has(role.roleId)}
                      onChange={handleRoleChange}
                      disabled={availableMember.preferredRoleIds.size >= 3 && !availableMember.preferredRoleIds.has(role.roleId)}
                    />
                    <label className="form-check-label" htmlFor={`role-${role.roleId}`}>
                      {role.roleName}
                    </label>
                  </div>
                ))
              ) : (
                <div className="text-muted">
                  {availableMember.meetingId ? 'No roles available for this meeting type.' : 'Please select a meeting first.'}
                </div>
              )}
            </div>
          </div>
          <div className="col-12 mt-4">
            <button type="submit" className="btn btn-primary me-2">
              {id ? "Update Availability" : "Add Availability"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/available-members")}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AvailableMemberForm;