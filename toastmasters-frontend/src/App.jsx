import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Login from "./components/auth/Login.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import RequireAuth from "./components/auth/RequireAuth.jsx";

// Member components
import MemberTable from "./components/members/MemberTable";
import MemberDetails from "./components/members/MemberDetails";
import MemberForm from "./components/members/MemberForm";

// Meetings components
import MeetingsTable from "./components/Meetings/MeetingsTable"; 
import MeetingForm from "./components/Meetings/MeetingForm"; 

// Roles components
import RolesTable from "./components/roles/RolesTable";
import RoleForm from "./components/roles/RoleForm";

// New: Available Members components
import AvailableMembersTable from "./components/availablemember/AvailableMemberTable";
import AvailableMemberForm from "./components/availablemember/AvailableMemberForm";

// New: Assigned Roles components
import AssignRolesForm from "./components/assignedRoles/AssignRolesForm";
import AssignedRolesTable from "./components/assignedRoles/AssignedRolesTable";

import { useAuth } from "./context/AuthContext.jsx";

function App() {
  // Move Home component inside App function so it has access to AuthContext
  const Home = () => {
    const { isVPEducation } = useAuth();
    return (
      <div>
        <div className="hero-box text-white p-5 rounded mb-4">
          <h2 className="fw-bold mb-2">Welcome to Toastmasters Club</h2>
          <p className="mb-0">Plan meetings, manage members, set availability, and assign roles smoothly.</p>
        </div>
        <div className="row g-3">
          <div className="col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">Meetings</h5>
                <p className="card-text flex-grow-1">View all meetings with live status: Upcoming, Ongoing, or Closed.</p>
                <a href="/meetings" className="btn btn-dark">Go to Meetings</a>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">Availability</h5>
                <p className="card-text flex-grow-1">Members can add availability and preferred roles for upcoming meetings.</p>
                <a href="/available-members" className="btn btn-dark">View Availability</a>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{isVPEducation ? "Assign Roles" : "Assigned Roles"}</h5>
                <p className="card-text flex-grow-1">{isVPEducation ? "Assign roles considering last 3 meetings' history." : "See assigned roles for your meetings."}</p>
                <a href="/meetings" className="btn btn-dark">{isVPEducation ? "Start Assigning" : "See Roles"}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AuthProvider>
      <Router>
        <Navbar />

        <div className="container mt-4">
          <Routes>
            <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
            <Route path="/login" element={<Login />} />

            {/* Members Routes */}
            <Route path="/members" element={<RequireAuth><MemberTable /></RequireAuth>} />
            <Route path="/members/add" element={<RequireAuth><MemberForm /></RequireAuth>} />
            <Route path="/members/edit/:id" element={<RequireAuth><MemberForm /></RequireAuth>} />
            <Route path="/members/:id" element={<RequireAuth><MemberDetails /></RequireAuth>} />

            {/* Meetings Routes */}
            <Route path="/meetings" element={<RequireAuth><MeetingsTable /></RequireAuth>} />
            <Route path="/meetings/add" element={<RequireAuth><MeetingForm /></RequireAuth>} />
            <Route path="/meetings/edit/:meetingId" element={<RequireAuth><MeetingForm /></RequireAuth>} />

            {/* Roles Routes */}
            <Route path="/roles" element={<RequireAuth><RolesTable /></RequireAuth>} />
            <Route path="/roles/add" element={<RequireAuth><RoleForm /></RequireAuth>} />
            <Route path="/roles/edit/:roleId" element={<RequireAuth><RoleForm /></RequireAuth>} />

            {/* Available Members Routes */}
            <Route path="/available-members" element={<RequireAuth><AvailableMembersTable /></RequireAuth>} />
            <Route path="/available-members/add" element={<RequireAuth><AvailableMemberForm /></RequireAuth>} />
            <Route path="/available-members/edit/:id" element={<RequireAuth><AvailableMemberForm /></RequireAuth>} />

            {/* New: Assigned Roles Routes */}
            <Route path="/assign-roles/:meetingId" element={<RequireAuth><AssignRolesForm /></RequireAuth>} />
            <Route path="/assigned-roles/:meetingId" element={<RequireAuth><AssignedRolesTable /></RequireAuth>} />

          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;