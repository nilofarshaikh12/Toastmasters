import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import availableMemberService from "../../api/availableMemberService.js";
import meetingService from "../../api/meetingservice.js";
import apiService from "../../api/api.js";
import roleService from "../../api/roleService.js";
import assignedRoleService from "../../api/assignedRoleService.js"; // Import assignedRoleService
import { getApplicableRoleCategories } from "../../constants/meetingCategories.js";
import { useAuth } from "../../context/AuthContext.jsx";

function AvailableMemberForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Extract meetingId from query params
  const searchParams = new URLSearchParams(location.search);
  const preselectedMeetingId = searchParams.get("meetingId");

  const [availableMember, setAvailableMember] = useState({
    meetingId: preselectedMeetingId || "",
    memberId: "",
    availabilityStatus: "AVAILABLE",
    preferredRoleIds: new Set(),
  });

  const [meetings, setMeetings] = useState([]);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [assignedRoles, setAssignedRoles] = useState([]); // Add state for assigned roles
  const [autoPopulateWarning, setAutoPopulateWarning] = useState("");

  // Load meetings, members, roles
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meetingsRes, membersRes, rolesRes] = await Promise.all([
          meetingService.getAllMeetings(),
          apiService.getMembers(),
          roleService.getAllRoles(),
        ]);

        const meetingsData = meetingsRes?.data?.data || [];
        // Keep only upcoming meetings, sorted DESC by start datetime
        const parseStart = (m) => {
          try {
            if (!m?.date || !m?.startTime) return null;
            if (String(m.date).includes("T")) return new Date(m.date);
            const start = String(m.startTime);
            const fixed = start.includes(":") && start.split(":").length === 2 ? `${start}:00` : start;
            const d = new Date(`${m.date}T${fixed}`);
            return isNaN(d.getTime()) ? null : d;
          } catch { return null; }
        };
        const now = new Date();
        const upcomingSorted = meetingsData
          .filter((m) => {
            const s = parseStart(m);
            return s && now < s;
          })
          .sort((a, b) => parseStart(b) - parseStart(a));
        setMeetings(upcomingSorted);

        const membersData = membersRes?.data?.data || [];
        setMembers(membersData);

        setRoles(Array.isArray(rolesRes) ? rolesRes : rolesRes?.data?.data || []);

        // Auto-select logged-in member
        if (!id && user && membersData.length > 0) {
          console.log("=== AUTO-POPULATION DEBUG ===");
          console.log("User from context:", JSON.stringify(user, null, 2));
          
          let userData = user;
          const storedUser = localStorage.getItem("tm_user");
          if (storedUser) {
            try {
              userData = { ...user, ...JSON.parse(storedUser) };
              console.log("Enhanced user data with localStorage:", JSON.stringify(userData, null, 2));
            } catch {}
          }

          console.log("Available members:", JSON.stringify(membersData.map(m => ({
            id: m.memberId,
            name: m.memberName,
            email: m.email
          })), null, 2));

          let matchedMember = null;
          if (userData.id || userData.userId) {
            const userId = userData.id || userData.userId;
            matchedMember = membersData.find((m) => m.memberId === userId);
            console.log(`ID match attempt (${userId}):`, JSON.stringify(matchedMember, null, 2));
          }
          if (!matchedMember && userData.email) {
            matchedMember = membersData.find(
              (m) => m.email?.toLowerCase() === userData.email.toLowerCase()
            );
            console.log(`Email match attempt (${userData.email}):`, JSON.stringify(matchedMember, null, 2));
          }
          if (!matchedMember && userData.name) {
            matchedMember = membersData.find(
              (m) => m.memberName?.toLowerCase() === userData.name.toLowerCase()
            );
            console.log(`Name match attempt (${userData.name}):`, JSON.stringify(matchedMember, null, 2));
          }
          if (matchedMember) {
            console.log("✅ Auto-populating with matched member:", JSON.stringify(matchedMember, null, 2));
            setAvailableMember((prev) => ({ ...prev, memberId: matchedMember.memberId }));
            setAutoPopulateWarning("");
          } else {
            console.log("❌ No matching member found for user:", JSON.stringify({
              id: userData.id,
              userId: userData.userId,
              email: userData.email,
              name: userData.name
            }, null, 2));
            setAutoPopulateWarning(
              "We couldn't identify your member record from your login. Please ensure you're signed in with a recognized account. Submission is disabled."
            );
          }
          console.log("=== END AUTO-POPULATION DEBUG ===");
        }

        // If editing, load availability
        if (id) {
          const amRes = await availableMemberService.getAvailableMemberById(id);
          const amData = amRes.data;
          setAvailableMember({
            ...amData,
            preferredRoleIds: new Set(amData.preferredRoles.map((r) => r.roleId)),
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [id, user]);

  // Add this effect to fetch assigned roles when meeting is selected
  useEffect(() => {
    const fetchAssignedRoles = async () => {
      if (!availableMember.meetingId) return;
      
      try {
        const response = await assignedRoleService.getAssignedRolesByMeeting(availableMember.meetingId);
        setAssignedRoles(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        console.error('Error fetching assigned roles:', error);
        setAssignedRoles([]);
      }
    };

    fetchAssignedRoles();
  }, [availableMember.meetingId]);

  // Filter roles whenever meeting changes
  useEffect(() => {
    const fetchMeetingRoles = async () => {
      if (availableMember.meetingId && roles.length > 0) {
        const selectedMeeting = meetings.find(
          (m) => String(m.meetingId) === String(availableMember.meetingId)
        );

        if (selectedMeeting) {
          try {
            // ✅ Always pass meetingId with M prefix
            const meetingResponse = await meetingService.getMeetingById(availableMember.meetingId);
            const meetingData = meetingResponse.data.data;

            // Get assigned role IDs for this meeting
            const assignedRoleIds = new Set(
              assignedRoles.map(ar => ar.roleId)
            );

            if (meetingData.roles && meetingData.roles.length > 0) {
              // Normalize to BASE role id (digits) for counting
              const normBase = (v) => {
                const s = String(v ?? '').trim();
                const head = s.includes('_') ? s.split('_')[0] : s; // handle composed like R12_2
                const digits = head.replace(/^R/i, '');
                return digits; // just digits for map key
              };

              // Planned instances per base role from meeting definition
              const plannedCounts = {};
              const meetingBaseToLabel = {};
              meetingData.roles.forEach((mr) => {
                const base = normBase(mr.baseRoleId || mr.roleId);
                if (!base) return;
                plannedCounts[base] = (plannedCounts[base] || 0) + 1;
                if (!meetingBaseToLabel[base]) {
                  meetingBaseToLabel[base] = mr.roleName || '';
                }
              });

              // Current assignments count per base role
              const assignedCounts = {};
              assignedRoles.forEach((ar) => {
                const base = normBase(ar.baseRoleId || ar.roleId);
                if (!base) return;
                assignedCounts[base] = (assignedCounts[base] || 0) + 1;
              });

              // Determine which base roles still have remaining capacity
              const remainingBases = new Set(
                Object.keys(plannedCounts).filter((b) => (assignedCounts[b] || 0) < (plannedCounts[b] || 0))
              );

              // Build unique role list from meeting roles but only include bases with remaining capacity
              const uniqueRoles = [];
              const seenBase = new Set();
              meetingData.roles.forEach((mr) => {
                const base = normBase(mr.baseRoleId || mr.roleId);
                if (!remainingBases.has(base)) return; // all instances filled
                if (seenBase.has(base)) return; // keep one card per base in preferred roles
                seenBase.add(base);
                const targetRoleId = `R${base}`;
                const fullRole =
                  roles.find((r) => String(r.roleId) === targetRoleId || String(r.roleId) === base) || {
                    roleId: targetRoleId,
                    roleName: meetingBaseToLabel[base] || mr.roleName,
                    roleDescription: mr.description || "",
                    category: mr.isCustom ? "CUSTOM" : "SHARED_ALL_MEETINGS",
                  };
                uniqueRoles.push(fullRole);
              });

              setFilteredRoles(uniqueRoles);
            } else {
              const applicableCats = getApplicableRoleCategories(selectedMeeting.category);
              setFilteredRoles(
                roles.filter((r) => 
                  (r?.category || r?.roleCategory || "") && 
                  applicableCats.includes(r.category || r.roleCategory) &&
                  !assignedRoleIds.has(r.roleId) // Exclude assigned roles
                )
              );
            }
          } catch (err) {
            console.error("Error fetching meeting details:", err);
            const applicableCats = getApplicableRoleCategories(selectedMeeting.category);
            setFilteredRoles(
              roles.filter((r) =>
                (r?.category || r?.roleCategory || "") && 
                applicableCats.includes(r.category || r.roleCategory) &&
                !assignedRoleIds.has(r.roleId) // Exclude assigned roles
              )
            );
          }
        } else {
          setFilteredRoles([]);
        }
      } else {
        setFilteredRoles([]);
      }
    };

    if (roles.length > 0) fetchMeetingRoles();
  }, [availableMember.meetingId, meetings, roles, assignedRoles]); // Add assignedRoles to dependencies

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAvailableMember((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "meetingId") updated.preferredRoleIds = new Set();
      return updated;
    });
  };

  const handleRoleChange = (e) => {
    const { value, checked } = e.target;
    setAvailableMember((prev) => {
      const newRoles = new Set(prev.preferredRoleIds);
      if (checked) newRoles.add(value);
      else newRoles.delete(value);
      return { ...prev, preferredRoleIds: newRoles };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!availableMember.memberId) {
      Swal.fire("Member not identified", "We couldn't identify your member record. Please contact an admin.", "warning");
      return;
    }
    const disableRoles = ["UNAVAILABLE", "TENTATIVE"].includes(availableMember.availabilityStatus);
    const payload = {
      ...availableMember,
      preferredRoleIds: disableRoles ? [] : Array.from(availableMember.preferredRoleIds),
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
    } catch (err) {
      console.error("Error saving availability:", err);
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
              value={String(availableMember.meetingId)}
              onChange={handleChange}
              required
              disabled={!!preselectedMeetingId}
            >
              <option value="">Select a Meeting</option>
              {meetings.map((m) => (
                <option key={m.meetingId} value={String(m.meetingId)}>
                  {m.date} - {m.theme}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-6">
            <label htmlFor="memberName" className="form-label">Member</label>
            <input
              type="text"
              className="form-control"
              id="memberName"
              value={members.find((m) => m.memberId === availableMember.memberId)?.memberName || "Loading..."}
              readOnly
              style={{ backgroundColor: "#f8f9fa", cursor: "not-allowed" }}
            />
            <input type="hidden" name="memberId" value={availableMember.memberId} />
            {autoPopulateWarning && (
              <div className="form-text text-danger mt-1">{autoPopulateWarning}</div>
            )}
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
              Preferred Roles {['UNAVAILABLE', 'TENTATIVE'].includes(availableMember.availabilityStatus) ? '' : '(Select up to 3)'}
              {availableMember.meetingId && meetings.find(m => m.meetingId === availableMember.meetingId) && (
                <small className="text-muted ms-2">
                  - Showing roles assigned by VP Education for this meeting
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
                      disabled={['UNAVAILABLE', 'TENTATIVE'].includes(availableMember.availabilityStatus) ||
                        (availableMember.preferredRoleIds.size >= 3 &&
                          !availableMember.preferredRoleIds.has(role.roleId))}
                    />
                    <label className="form-check-label" htmlFor={`role-${role.roleId}`}>
                      {role.roleName}
                    </label>
                  </div>
                ))
              ) : (
                <div className="text-muted">
                  {availableMember.meetingId
                    ? "No roles have been assigned to this meeting yet."
                    : "Please select a meeting first."}
                </div>
              )}
            </div>
          </div>

          <div className="col-12 mt-4">
            <button type="submit" className="btn btn-primary me-2" disabled={!availableMember.memberId}>
              {id ? "Update Availability" : "Add Availability"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/available-members")}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AvailableMemberForm;
