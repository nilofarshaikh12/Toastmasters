import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import meetingService from "../../api/meetingservice.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { MEETING_CATEGORIES, MEETING_CATEGORY_LABELS } from "../../constants/meetingCategories.js";

// Helper to format date for input
const formatDate = (dateString) => {
  if (!dateString) return "";
  return dateString.split('T')[0];
};

function MeetingForm() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { isVPEducation } = useAuth();

  const [meeting, setMeeting] = useState({
    date: "",
    startTime: "",
    endTime: "",
    theme: "",
    venue: "",
    category: MEETING_CATEGORIES.REGULAR,
  });

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
      if (meetingId) {
        await meetingService.updateMeeting(meetingId, meeting);
        Swal.fire("Success", "Meeting updated successfully!", "success");
      } else {
        await meetingService.addMeeting(meeting);
        Swal.fire("Success", "Meeting added successfully!", "success");
      }
      navigate("/meetings");
    } catch (error) {
      console.error("Error saving meeting:", error.response?.data || error.message);
      Swal.fire("Error", "Failed to save meeting. Please try again.", "error");
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
      </form>
    </div>
  );
}

export default MeetingForm;