import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import meetingService from "../../api/meetingservice.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { MEETING_CATEGORIES, MEETING_CATEGORY_LABELS } from "../../constants/meetingCategories.js";
import MeetingRoleAssignment from "./MeetingRoleAssignment";

// Helper to format date for input
const formatDate = (dateString) => {
  if (!dateString) return "";
  return dateString.split('T')[0];
};

function MeetingForm() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { isVPEducation } = useAuth();

  // Function to get next Saturday from a given date
  const getNextSaturday = (fromDate) => {
    const date = new Date(fromDate);
    const day = date.getDay();
    // Calculate days until next Saturday (6 is Saturday)
    const daysUntilSaturday = day <= 6 ? 6 - day : 6 + 7 - day;
    date.setDate(date.getDate() + daysUntilSaturday + (daysUntilSaturday === 0 ? 7 : 0));
    return date.toISOString().split('T')[0];
  };

  // Fetch the last meeting date when component mounts
  useEffect(() => {
    const fetchLastMeeting = async () => {
      try {
        const response = await meetingService.getAllMeetings();
        const meetings = response.data.data || [];
        if (meetings.length > 0) {
          // Sort meetings by date in descending order
          const sortedMeetings = [...meetings].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
          );
          const lastMeetingDate = sortedMeetings[0].date;
          
          // Update the meeting state with the next Saturday after last meeting
          setMeeting(prev => ({
            ...prev,
            date: getNextSaturday(lastMeetingDate),
            startTime: isVPEducation ? "17:30" : "",
            endTime: isVPEducation ? "19:30" : "",
            venue: isVPEducation ? "Community Hall, Pimpri" : ""
          }));
        } else {
          // If no meetings exist, use next Saturday from today
          const today = new Date();
          setMeeting(prev => ({
            ...prev,
            date: getNextSaturday(today),
            startTime: isVPEducation ? "17:30" : "",
            endTime: isVPEducation ? "19:30" : "",
            venue: isVPEducation ? "Community Hall, Pimpri" : ""
          }));
        }
      } catch (error) {
        console.error("Error fetching meetings:", error);
      }
    };

    if (isVPEducation && !meetingId) {
      fetchLastMeeting();
    }
  }, [isVPEducation, meetingId]);

  const [meeting, setMeeting] = useState({
    date: "",
    startTime: "",
    endTime: "",
    theme: "",
    venue: "",
    category: MEETING_CATEGORIES.REGULAR,
    roles: []
  });

  const handleRolesUpdate = (roles) => {
    // Ensure we have proper role objects
    const updatedRoles = Array.isArray(roles) 
      ? roles.map(role => ({
          roleId: role.roleId || role.id,
          roleName: role.roleName || role.name || 'Unnamed Role',
          isCustom: role.isCustom || (role.roleId && role.roleId.startsWith('custom_'))
        }))
      : [];
    
    setMeeting(prev => ({
      ...prev,
      roles: updatedRoles
    }));
  };

  useEffect(() => {
    if (meetingId) {
      const fetchMeeting = async () => {
        try {
          const response = await meetingService.getMeetingById(meetingId);
          const meetingData = response.data.data;
          setMeeting({
            ...meetingData,
            date: formatDate(meetingData.date),
            category: meetingData.category || MEETING_CATEGORIES.REGULAR,
            roles: meetingData.roles || [],
          });
        } catch (error) {
          console.error("Error fetching meeting for edit:", error);
        }
      };
      fetchMeeting();
    }
  }, [meetingId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMeeting((prevMeeting) => ({
      ...prevMeeting,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Prepare meeting data with proper role objects
      const meetingData = {
        ...meeting,
        roles: Array.isArray(meeting.roles) 
          ? meeting.roles.map(role => ({
              roleId: role.roleId,
              roleName: role.roleName,
              isCustom: role.isCustom || false
            }))
          : []
      };

      if (meetingId) {
        await meetingService.updateMeeting(meetingId, meetingData);
        Swal.fire("Success!", "Meeting updated successfully!", "success");
      } else {
        await meetingService.addMeeting(meetingData);
        Swal.fire("Success!", "Meeting created successfully!", "success");
      }
      navigate("/meetings");
    } catch (error) {
      console.error("Error saving meeting:", error);
      Swal.fire("Error!", "Failed to save meeting. Please try again.", "error");
    }
  };

  if (!isVPEducation) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">You do not have permission to access this page.</div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="fw-bold">{meetingId ? "Edit Meeting" : "Add Meeting"}</h2>
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-md-6">
            <label htmlFor="date" className="form-label">Date</label>
            <input type="date" className="form-control" id="date" name="date" value={meeting.date} onChange={handleChange} required />
          </div>
          <div className="col-md-6">
            <label htmlFor="startTime" className="form-label">Start Time</label>
            <input type="time" className="form-control" id="startTime" name="startTime" value={meeting.startTime} onChange={handleChange} required />
          </div>
          <div className="col-md-6">
            <label htmlFor="endTime" className="form-label">End Time</label>
            <input type="time" className="form-control" id="endTime" name="endTime" value={meeting.endTime} onChange={handleChange} required />
          </div>
          <div className="col-md-6">
            <label htmlFor="theme" className="form-label">Theme</label>
            <input type="text" className="form-control" id="theme" name="theme" value={meeting.theme} onChange={handleChange} required />
          </div>
          <div className="col-md-6">
            <label htmlFor="venue" className="form-label">Venue</label>
            <input type="text" className="form-control" id="venue" name="venue" value={meeting.venue} onChange={handleChange} required />
          </div>
          <div className="col-md-6">
            <label htmlFor="category" className="form-label">Meeting Category</label>
            <select className="form-control" id="category" name="category" value={meeting.category} onChange={handleChange} required>
              {Object.entries(MEETING_CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="col-12 mt-4">
          <button type="submit" className="btn btn-primary me-2">
            {meetingId ? "Update Meeting" : "Add Meeting"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/meetings")}>
            Cancel
          </button>
        </div>

        {/* Role Assignment Section */}
        {isVPEducation && (
          <div className="mt-4">
            <h4>Assign Meeting Roles</h4>
            <MeetingRoleAssignment 
              key={meeting.category} // Force re-render when category changes
              meetingCategory={meeting.category}
              onRolesUpdate={handleRolesUpdate}
              initialRoles={meeting.roles || []}
            />
          </div>
        )}
      </form>
    </div>
  );
}

export default MeetingForm;