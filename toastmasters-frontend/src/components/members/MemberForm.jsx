import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import apiService from "../../api/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

// Helper function to format dates to YYYY-MM-DD
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function MemberForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isVPEducation } = useAuth();

  const [member, setMember] = useState({
    memberName: "",
    email: "",
    contact: "",
    address: "",
    gender: "",
    dob: "",
    joiningDate: "",
    hobbies: "",
    role: "",
    password: "",
    mentorId: 0,
  });

  // New state to store the list of members to be used as mentors
  const [mentors, setMentors] = useState([]);

  useEffect(() => {
    // Fetch all members to populate the mentor dropdown
    const fetchMentors = async () => {
      try {
        const response = await apiService.getMembers();
        // Assuming your API returns an array of members under response.data.data
        setMentors(response.data.data);
      } catch (error) {
        console.error("Error fetching mentors:", error);
      }
    };
    fetchMentors();

    // If an ID exists, fetch the member details for editing
    if (id) {
      const fetchMember = async () => {
        try {
          const response = await apiService.getMemberById(id);
          const memberData = response.data.data;

          setMember({
            ...memberData,
            dob: formatDate(memberData.dob),
            joiningDate: formatDate(memberData.joiningDate),
          });
        } catch (error) {
          console.error("Error fetching member for edit:", error);
        }
      };
      fetchMember();
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMember((prevMember) => ({
      ...prevMember,
      [name]: name === "mentorId" ? (value ? Number(value) : null) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (id) {
        // Update an existing member
        await apiService.updateMember(id, member);
        Swal.fire("Success", "Member updated successfully!", "success");
      } else {
        // Add a new member
        await apiService.addMember(member);
        Swal.fire("Success", "Member added successfully!", "success");
      }
      navigate("/members");
    } catch (error) {
      console.error("Error saving member:", error);
      Swal.fire("Error", "Failed to save member. Please try again.", "error");
    }
  };

  // Filter out the current member from the mentor list when editing
  const availableMentors = id
    ? mentors.filter((mentor) => mentor.memberId !== parseInt(id))
    : mentors;

  if (!isVPEducation) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">You do not have permission to access this page.</div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="fw-bold">{id ? "Edit Member" : "Add Member"}</h2>
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          {/* ... all your other form fields here ... */}
          <div className="col-md-6">
            <label htmlFor="memberName" className="form-label">Name</label>
            <input type="text" className="form-control" id="memberName" name="memberName" value={member.memberName} onChange={handleChange} required />
          </div>
          <div className="col-md-6">
            <label htmlFor="email" className="form-label">Email</label>
            <input type="email" className="form-control" id="email" name="email" value={member.email} onChange={handleChange} required />
          </div>
          <div className="col-md-6">
            <label htmlFor="contact" className="form-label">Contact</label>
            <input type="tel" className="form-control" id="contact" name="contact" value={member.contact} onChange={handleChange} required />
          </div>
          <div className="col-md-6">
            <label htmlFor="address" className="form-label">Address</label>
            <input type="text" className="form-control" id="address" name="address" value={member.address} onChange={handleChange} />
          </div>
          <div className="col-md-6">
            <label htmlFor="gender" className="form-label">Gender</label>
            <select className="form-control" id="gender" name="gender" value={member.gender} onChange={handleChange}>
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="col-md-6">
            <label htmlFor="dob" className="form-label">Date of Birth</label>
            <input type="date" className="form-control" id="dob" name="dob" value={member.dob} onChange={handleChange} required />
          </div>
          <div className="col-md-6">
            <label htmlFor="joiningDate" className="form-label">Joining Date</label>
            <input type="date" className="form-control" id="joiningDate" name="joiningDate" value={member.joiningDate} onChange={handleChange} required />
          </div>
          <div className="col-md-6">
            <label htmlFor="hobbies" className="form-label">Hobbies</label>
            <input type="text" className="form-control" id="hobbies" name="hobbies" value={member.hobbies} onChange={handleChange} />
          </div>
          <div className="col-md-6">
            <label htmlFor="role" className="form-label">Role</label>
            <input type="text" className="form-control" id="role" name="role" value={member.role} onChange={handleChange} />
          </div>
          {!id && (
            <div className="col-md-6">
              <label htmlFor="password" className="form-label">Password</label>
              <input type="password" className="form-control" id="password" name="password" value={member.password} onChange={handleChange} required />
            </div>
          )}
          
          {/* The updated mentor field */}
          <div className="col-md-6">
            <label htmlFor="mentorId" className="form-label">Mentor</label>
            <select
              className="form-control"
              id="mentorId"
              name="mentorId"
              value={member.mentorId || ""} // Use "" for initial value if null
              onChange={handleChange}
            >
              <option value="">Select a Mentor (Optional)</option>
              {availableMentors.map((mentor) => (
                <option key={mentor.memberId} value={mentor.memberId}>
                  {mentor.memberName}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 mt-4">
            <button type="submit" className="btn btn-primary me-2">
              {id ? "Update Member" : "Add Member"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/members")}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default MemberForm;