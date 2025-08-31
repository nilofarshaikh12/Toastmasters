// src/components/meetings/MeetingForm.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import meetingService from "../../api/meetingservice.js";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  MEETING_CATEGORIES,
  MEETING_CATEGORY_LABELS,
} from "../../constants/meetingCategories.js";
import MeetingRoleAssignmentWithDelete from "./MeetingRoleAssignmentWithDelete";

// ✅ Helper to format date for input fields
const formatDate = (dateString) => {
  if (!dateString) return "";
  return dateString.split("T")[0];
};

// ✅ Map frontend category constants to backend enum values
// Frontend uses: REGULAR_MEETING, CONTEST_MEETING, SPECIAL_MEETING
// Backend expects: REGULAR, CONTEST, SPECIAL
const normalizeCategoryForBackend = (cat) => {
  if (!cat) return "REGULAR";
  const v = String(cat).toUpperCase();
  if (v === "REGULAR" || v === "CONTEST" || v === "SPECIAL") return v;
  if (v.includes("REGULAR")) return "REGULAR";
  if (v.includes("CONTEST")) return "CONTEST";
  if (v.includes("SPECIAL")) return "SPECIAL";
  return "REGULAR";
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
    roles: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Get next Saturday date helper
  const getNextSaturday = (fromDate) => {
    const date = new Date(fromDate);
    const day = date.getDay();
    const daysUntilSaturday =
      day <= 6 ? 6 - day : 6 + 7 - day; // Saturday = 6
    date.setDate(
      date.getDate() + daysUntilSaturday + (daysUntilSaturday === 0 ? 7 : 0)
    );
    return date.toISOString().split("T")[0];
  };

  // ✅ Fetch last meeting (auto-fill for VPEducation role)
  useEffect(() => {
    const fetchLastMeeting = async () => {
      try {
        const response = await meetingService.getAllMeetings();
        const meetings = response.data.data || [];
        if (meetings.length > 0) {
          const sortedMeetings = [...meetings].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );
          const lastMeetingDate = sortedMeetings[0].date;
          setMeeting((prev) => ({
            ...prev,
            date: getNextSaturday(lastMeetingDate),
            startTime: isVPEducation ? "17:30" : "",
            endTime: isVPEducation ? "19:30" : "",
            venue: isVPEducation ? "Community Hall, Pimpri" : "",
          }));
        } else {
          const today = new Date();
          setMeeting((prev) => ({
            ...prev,
            date: getNextSaturday(today),
            startTime: isVPEducation ? "17:30" : "",
            endTime: isVPEducation ? "19:30" : "",
            venue: isVPEducation ? "Community Hall, Pimpri" : "",
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

  // ✅ Load meeting for edit
  useEffect(() => {
    if (meetingId) {
      const fetchMeeting = async () => {
        try {
          setIsLoading(true);
          const response = await meetingService.getMeetingById(meetingId);
          const meetingData = response.data.data;
          console.log('MeetingForm: Raw meeting.roles from API:', meetingData.roles);
          console.log('MeetingForm: Meeting data structure:', meetingData);
          console.log('MeetingForm: Individual roles from API:', meetingData.roles?.map(r => ({
            roleId: r.roleId,
            roleName: r.roleName,
            instanceNumber: r.instanceNumber,
            isCustom: r.isCustom
          })));
          console.log('MeetingForm: FULL role objects from API:', meetingData.roles);
          setMeeting({
            ...meetingData,
            date: formatDate(meetingData.date),
            category: meetingData.category || MEETING_CATEGORIES.REGULAR,
            roles: meetingData.roles || [],
          });
          console.log('MeetingForm: Meeting state after setting:', meeting);
        } catch (error) {
          console.error("Error fetching meeting for edit:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchMeeting();
    }
  }, [meetingId]);

  // ✅ Handle form inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setMeeting((prevMeeting) => ({
      ...prevMeeting,
      [name]: value,
    }));
  };

  // ✅ Update roles properly
  const handleRolesUpdate = (roles) => {
    console.log("Received roles in handleRolesUpdate:", roles);
    
    const updatedRoles = Array.isArray(roles)
      ? roles.map((role) => ({
          roleId: role.roleId || role.id,
          roleName: role.roleName || role.name || "Unnamed Role",
          isCustom: Boolean(role.isCustom || role.custom),
          instanceNumber: typeof role.instanceNumber === "number" ? role.instanceNumber : undefined,
          description: role.description || undefined
        }))
      : [];

    console.log("Updated roles to set in meeting:", updatedRoles);

    setMeeting((prev) => ({
      ...prev,
      roles: updatedRoles,
    }));
  };

  // ✅ Full role name fix
  const getFullRoleName = (roleId, currentName) => {
    const roleMap = {
      R2: "Quiz Master",
      R5: "Sergeant at Arms",
      R7: "Grammarian",
      R11: "General Evaluator",
      // Extend mapping if needed
    };
    return roleMap[roleId] || currentName;
  };

  //  Check for meeting conflicts
  const checkMeetingConflict = async (date, startTime, endTime) => {
    try {
      const response = await meetingService.getAllMeetings();
      const meetings = response.data.data || [];
      
      // Find conflicts (same date and overlapping time)
      const conflicts = meetings.filter(existingMeeting => {
        // Skip if editing the same meeting
        if (meetingId && existingMeeting.meetingId === meetingId) {
          return false;
        }
        
        // Check if same date
        const existingDate = existingMeeting.date.split('T')[0];
        if (existingDate !== date) {
          return false;
        }
        
        // Check time overlap
        const newStart = new Date(`${date}T${startTime}`);
        const newEnd = new Date(`${date}T${endTime}`);
        const existingStart = new Date(`${existingDate}T${existingMeeting.startTime}`);
        const existingEnd = new Date(`${existingDate}T${existingMeeting.endTime}`);
        
        // Check if times overlap
        return (newStart < existingEnd && newEnd > existingStart);
      });
      
      return conflicts;
    } catch (error) {
      console.error("Error checking meeting conflicts:", error);
      return [];
    }
  };

  // ✅ Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Check for meeting conflicts before submitting
      const conflicts = await checkMeetingConflict(meeting.date, meeting.startTime, meeting.endTime);
      
      if (conflicts.length > 0) {
        const conflictDetails = conflicts.map(c => 
          `${c.date.split('T')[0]} ${c.startTime}-${c.endTime} (${c.theme})`
        ).join('\n');
        
        const result = await Swal.fire({
          title: 'Meeting Time Conflict',
          html: `
            <p>A meeting already exists at this date and time:</p>
            <div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0;">
              <strong>${conflictDetails}</strong>
            </div>
            <p>Do you still want to create this meeting?</p>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, Create Meeting',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6'
        });
        
        if (!result.isConfirmed) {
          return; // User cancelled, don't proceed
        }
      }
      const meetingData = {
        date:
          meeting.date instanceof Date
            ? meeting.date.toISOString().split("T")[0]
            : meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        theme: meeting.theme,
        venue: meeting.venue,
        category: normalizeCategoryForBackend(meeting.category),
        roles: Array.isArray(meeting.roles)
          ? meeting.roles.map((role) => {
              const baseRoleId = role.roleId || "custom";
              const baseName = String(role.roleName || "Unnamed Role").replace(/\s+\d+$/, "");
              
              const payload = {
                roleId: baseRoleId,
                roleName: getFullRoleName(baseRoleId, baseName),
                isCustom: Boolean(role.isCustom),
              };
              
              // Only add instanceNumber if it's a valid positive integer
              if (typeof role.instanceNumber === "number" && role.instanceNumber > 0) {
                payload.instanceNumber = role.instanceNumber;
              } else {
                payload.instanceNumber = null;
              }
              
              return payload;
            })
          : [],
      };

      console.log(
        "Submitting meeting data:",
        JSON.stringify(meetingData, null, 2)
      );

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

      let errorMessage = "Failed to save meeting. Please try again.";
      if (error.response?.data) {
        if (typeof error.response.data === "string") {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }

      Swal.fire({
        title: `Error ${error.response?.status || ""}`,
        text: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
        footer: error.response?.data?.path
          ? `<small>Path: ${error.response.data.path}</small>`
          : undefined,
      });
    }
  };

  // ✅ Restrict access
  if (!isVPEducation) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          You do not have permission to access this page.
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="fw-bold">{meetingId ? "Edit Meeting" : "Add Meeting"}</h2>
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-md-6">
            <label htmlFor="date" className="form-label">
              Date
            </label>
            <input
              type="date"
              className="form-control"
              id="date"
              name="date"
              value={meeting.date}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="startTime" className="form-label">
              Start Time
            </label>
            <input
              type="time"
              className="form-control"
              id="startTime"
              name="startTime"
              value={meeting.startTime}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="endTime" className="form-label">
              End Time
            </label>
            <input
              type="time"
              className="form-control"
              id="endTime"
              name="endTime"
              value={meeting.endTime}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="theme" className="form-label">
              Theme
            </label>
            <input
              type="text"
              className="form-control"
              id="theme"
              name="theme"
              value={meeting.theme}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="venue" className="form-label">
              Venue
            </label>
            <input
              type="text"
              className="form-control"
              id="venue"
              name="venue"
              value={meeting.venue}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="category" className="form-label">
              Meeting Category
            </label>
            <select
              className="form-control"
              id="category"
              name="category"
              value={meeting.category}
              onChange={handleChange}
              required
            >
              {Object.entries(MEETING_CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ✅ Role Assignment Section */}
        {isVPEducation && (
          <div className="mt-4">
            <h4>Assign Meeting Roles</h4>
            {meeting.category && !isLoading && (
              <div className="col-12">
                <MeetingRoleAssignmentWithDelete
                  key={`${meetingId || 'new'}-${meeting.category}-${meeting.roles?.length || 0}`}
                  meetingCategory={meeting.category}
                  onRolesUpdate={handleRolesUpdate}
                  initialRoles={meeting.roles || []}
                />
              </div>
            )}
            {isLoading && (
              <div className="text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="col-12 mt-4">
          <button type="submit" className="btn btn-primary me-2">
            {meetingId ? "Update Meeting" : "Add Meeting"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/meetings")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default MeetingForm;
