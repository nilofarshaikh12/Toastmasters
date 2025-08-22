import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import meetingService from "../../api/meetingservice.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { MEETING_CATEGORY_LABELS } from "../../constants/meetingCategories.js";

function MeetingsTable() {
  const [meetings, setMeetings] = useState([]);
  const [filteredMeetings, setFilteredMeetings] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Add error handling for useAuth
  let auth;
  try {
    auth = useAuth();
  } catch (err) {
    console.error("Auth context error:", err);
    auth = { isVPEducation: false };
  }
  
  const { isVPEducation } = auth;

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching meetings...");
      const response = await meetingService.getAllMeetings();
      console.log("Meetings response:", response);
      console.log("Raw meetings data:", response.data);
      console.log("Meetings array:", response.data.data);
      const meetingsData = response.data.data || [];
      // Sort meetings by date (newest first)
      const sortedMeetings = meetingsData.sort((a, b) => {
        try {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA - dateB; // Ascending order (oldest first)
        } catch (error) {
          console.error("Error sorting meetings by date:", error);
          return 0;
        }
      });
      setMeetings(sortedMeetings);
      setFilteredMeetings(sortedMeetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      setError("Failed to load meetings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCategory === 'ALL') {
      setFilteredMeetings(meetings);
    } else {
      setFilteredMeetings(meetings.filter(meeting => meeting.category === selectedCategory));
    }
  }, [selectedCategory, meetings]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  const deleteMeeting = async (meetingId) => {
    if (window.confirm("Are you sure you want to delete this meeting?")) {
      try {
        await meetingService.deleteMeeting(meetingId);
        Swal.fire("Deleted!", "Meeting has been deleted.", "success");
        fetchMeetings(); // Refresh the list
      } catch (error) {
        console.error("Error deleting meeting:", error);
        Swal.fire("Error", "Failed to delete meeting. Please try again.", "error");
      }
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading meetings...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <h4>Error Loading Meetings</h4>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchMeetings}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  console.log("Rendering MeetingsTable with:", { meetings, isVPEducation });

  // Debug: Show sample meeting structure
  if (meetings.length > 0) {
    console.log("Sample meeting structure:", meetings[0]);
    console.log("Sample meeting date type:", typeof meetings[0].date);
    console.log("Sample meeting startTime type:", typeof meetings[0].startTime);
    console.log("Sample meeting endTime type:", typeof meetings[0].endTime);
    console.log("Sample meeting date value:", meetings[0].date);
    console.log("Sample meeting startTime value:", meetings[0].startTime);
    console.log("Sample meeting endTime value:", meetings[0].endTime);
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-2">📅 Meetings Management</h2>
          <p className="text-muted mb-0">
            {filteredMeetings.length} of {meetings.length} meetings displayed • 
            {filteredMeetings.filter(m => {
              // Use the same robust date parsing logic as individual meetings
              try {
                if (!m.date || !m.startTime || !m.endTime) {
                  return false;
                }
                
                let parsedStart;
                
                // Handle different date formats
                if (m.date.includes('T')) {
                  // If date already includes time (ISO format)
                  parsedStart = new Date(m.date);
                } else {
                  // If separate date and time
                  const dateStr = m.date;
                  const startTimeStr = m.startTime;
                  
                  // Try different time formats
                  let startTime;
                  
                  // Handle time with or without seconds
                  if (startTimeStr.includes(':')) {
                    const timeParts = startTimeStr.split(':');
                    if (timeParts.length === 2) {
                      startTime = `${startTimeStr}:00`;
                    } else {
                      startTime = startTimeStr;
                    }
                  } else {
                    startTime = startTimeStr;
                  }
                  
                  parsedStart = new Date(`${dateStr}T${startTime}`);
                }
                
                // Check if date is valid
                if (isNaN(parsedStart.getTime())) {
                  return false;
                }
                
                const now = new Date();
                return now < parsedStart;
              } catch (error) {
                console.error(`Error parsing meeting date for summary:`, error, m);
                return false;
              }
            }).length} upcoming • 
            {meetings.filter(m => {
              // Use the same robust date parsing logic as individual meetings
              try {
                if (!m.date || !m.startTime || !m.endTime) {
                  return false;
                }
                
                let parsedStart, parsedEnd;
                
                // Handle different date formats
                if (m.date.includes('T')) {
                  // If date already includes time (ISO format)
                  parsedStart = new Date(m.date);
                  parsedEnd = new Date(m.date);
                } else {
                  // If separate date and time
                  const dateStr = m.date;
                  const startTimeStr = m.startTime;
                  const endTimeStr = m.endTime;
                  
                  // Try different time formats
                  let startTime, endTime;
                  
                  // Handle time with or without seconds
                  if (startTimeStr.includes(':')) {
                    const timeParts = startTimeStr.split(':');
                    if (timeParts.length === 2) {
                      startTime = `${startTimeStr}:00`;
                    } else {
                      startTime = startTimeStr;
                    }
                  } else {
                    startTime = startTimeStr;
                  }
                  
                  if (endTimeStr.includes(':')) {
                    const timeParts = endTimeStr.split(':');
                    if (timeParts.length === 2) {
                      endTime = `${endTimeStr}:00`;
                    } else {
                      endTime = endTimeStr;
                    }
                  } else {
                    endTime = endTimeStr;
                  }
                  
                  parsedStart = new Date(`${dateStr}T${startTime}`);
                  parsedEnd = new Date(`${dateStr}T${endTime}`);
                }
                
                // Check if dates are valid
                if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
                  return false;
                }
                
                const now = new Date();
                return now >= parsedStart && now <= parsedEnd;
              } catch (error) {
                console.error(`Error parsing meeting date for summary:`, error, m);
                return false;
              }
            }).length} ongoing
          </p>
        </div>
        {isVPEducation && (
          <Link to="/meetings/add" className="btn btn-success btn-lg">
            ✚ Add New Meeting
          </Link>
        )}
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <div className="row">
          <div className="col-md-6">
            <label htmlFor="categoryFilter" className="form-label fw-bold">Filter by Category:</label>
            <select 
              id="categoryFilter" 
              className="form-select" 
              value={selectedCategory} 
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {Object.entries(MEETING_CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredMeetings.length === 0 ? (
        <div className="text-center py-5">
          <h4 className="text-muted">No meetings found</h4>
          <p className="text-muted">Start by adding your first meeting!</p>
          {isVPEducation && (
            <Link to="/meetings/add" className="btn btn-primary">
              ✚ Add First Meeting
            </Link>
          )}
        </div>
      ) : (
        <table className="table table-striped table-hover table-bordered shadow-sm">
          <thead className="table-dark">
            <tr>
              <th className="text-center">ID</th>
              <th className="text-center">Date</th>
              <th className="text-center">Start Time</th>
              <th className="text-center">End Time</th>
              <th className="text-center">Theme</th>
              <th className="text-center">Venue</th>
              <th className="text-center">Category</th>
              {isVPEducation && <th className="text-center">Actions</th>}
              <th className="text-center">Status</th>
              <th className="text-center">Availability</th>
              <th className="text-center">View Roles</th>
            </tr>
          </thead>
          <tbody>
            {filteredMeetings.map((meeting) => {
              // Get current date and time
              const now = new Date();
              
              // Validate and create meeting start and end times with error handling
              let meetingStart, meetingEnd, status;
              
              try {
                // Check if date and time are valid
                if (!meeting.date || !meeting.startTime || !meeting.endTime) {
                  console.warn(`Meeting ${meeting.meetingId} has invalid date/time:`, meeting);
                  status = "Invalid";
                } else {
                  // Log the exact values we're trying to parse
                  console.log(`Parsing meeting ${meeting.meetingId}:`, {
                    date: meeting.date,
                    startTime: meeting.startTime,
                    endTime: meeting.endTime
                  });
                  
                  // Create meeting start and end times with better parsing
                  let parsedStart, parsedEnd;
                  
                  // Handle different date formats
                  if (meeting.date.includes('T')) {
                    // If date already includes time (ISO format)
                    parsedStart = new Date(meeting.date);
                    parsedEnd = new Date(meeting.date);
                  } else {
                    // If separate date and time
                    const dateStr = meeting.date;
                    const startTimeStr = meeting.startTime;
                    const endTimeStr = meeting.endTime;
                    
                    // Try different time formats
                    let startTime, endTime;
                    
                    // Handle time with or without seconds
                    if (startTimeStr.includes(':')) {
                      const timeParts = startTimeStr.split(':');
                      if (timeParts.length === 2) {
                        startTime = `${startTimeStr}:00`;
                      } else {
                        startTime = startTimeStr;
                      }
                    } else {
                      startTime = startTimeStr;
                    }
                    
                    if (endTimeStr.includes(':')) {
                      const timeParts = endTimeStr.split(':');
                      if (timeParts.length === 2) {
                        endTime = `${endTimeStr}:00`;
                      } else {
                        endTime = endTimeStr;
                      }
                    } else {
                      endTime = endTimeStr;
                    }
                    
                    parsedStart = new Date(`${dateStr}T${startTime}`);
                    parsedEnd = new Date(`${dateStr}T${endTime}`);
                  }
                  
                  // Check if dates are valid
                  if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
                    console.warn(`Meeting ${meeting.meetingId} has invalid date format:`, {
                      original: { date: meeting.date, startTime: meeting.startTime, endTime: meeting.endTime },
                      parsed: { parsedStart, parsedEnd }
                    });
                    status = "Invalid";
                  } else {
                    // Store the parsed dates for later use
                    meetingStart = parsedStart;
                    meetingEnd = parsedEnd;
                    
                    // Determine meeting status
                    if (now < meetingStart) {
                      status = "Upcoming";
                    } else if (now >= meetingStart && now <= meetingEnd) {
                      status = "Ongoing";
                    } else {
                      status = "Closed";
                    }
                  }
                }
              } catch (error) {
                console.error(`Error processing meeting ${meeting.meetingId}:`, error, meeting);
                status = "Error";
              }

              // Debug logging with safe date handling
              console.log(`Meeting ${meeting.meetingId}:`, {
                date: meeting.date,
                startTime: meeting.startTime,
                endTime: meeting.endTime,
                now: now.toISOString(),
                meetingStart: meetingStart && !isNaN(meetingStart.getTime()) ? meetingStart.toISOString() : "Invalid",
                meetingEnd: meetingEnd && !isNaN(meetingEnd.getTime()) ? meetingEnd.toISOString() : "Invalid",
                status: status
              });

              return (
                <tr key={meeting.meetingId}>
                  <td>{meeting.meetingId}</td>
                  <td>{meeting.date || "N/A"}</td>
                  <td>{meeting.startTime || "N/A"}</td>
                  <td>{meeting.endTime || "N/A"}</td>
                  <td>{meeting.theme || "N/A"}</td>
                  <td>{meeting.venue || "N/A"}</td>
                  <td>
                    <span className="badge bg-info">
                      {MEETING_CATEGORY_LABELS[meeting.category] || meeting.category || 'Not Set'}
                    </span>
                  </td>
                  {isVPEducation && (
                    <td>
                      <Link
                        to={`/meetings/edit/${meeting.meetingId}`}
                        className="btn btn-primary btn-sm me-2"
                      >
                        Edit
                      </Link>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteMeeting(meeting.meetingId)}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                  <td>
                    <span className={
                      status === "Upcoming" ? "badge bg-info fs-6 px-3 py-2" :
                      status === "Ongoing" ? "badge bg-success fs-6 px-3 py-2" :
                      status === "Invalid" ? "badge bg-warning fs-6 px-3 py-2" :
                      status === "Error" ? "badge bg-danger fs-6 px-3 py-2" :
                      "badge bg-secondary fs-6 px-3 py-2"
                    }>{status}</span>
                  </td>
                  <td className="text-center">
                    {status === "Upcoming" ? (
                      <Link
                        to={`/available-members/add?meetingId=${meeting.meetingId}`}
                        className="btn btn-primary btn-sm fw-bold"
                      >
                        ✚ Add Availability
                      </Link>
                    ) : status === "Ongoing" ? (
                      <span className="text-success fw-bold fs-6">🟢 Ongoing</span>
                    ) : status === "Invalid" || status === "Error" ? (
                      <span className="text-warning fw-bold fs-6">⚠️ Fix Required</span>
                    ) : (
                      <span className="text-muted fw-bold fs-6">🔴 Closed</span>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <Link to={`/assigned-roles/${meeting.meetingId}`} className="btn btn-outline-secondary btn-sm">
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MeetingsTable;