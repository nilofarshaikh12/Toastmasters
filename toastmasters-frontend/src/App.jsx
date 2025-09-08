import React from "react";
import { Box, Container, CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import theme from './theme';

// Layout
import Navbar from "./components/layout/Navbar";

// Auth
import Login from "./components/auth/Login.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import RequireAuth from "./components/auth/RequireAuth.jsx";

// Dashboard components
import MemberDashboard from "./components/dashboard/MemberDashboard";
import VPEducationDashboard from "./components/dashboard/VPEducationDashboard";

// Member components
import MemberTable from "./components/members/MemberTable";
import MemberDetails from "./components/members/MemberDetails";
import MemberProfile from "./components/members/MemberProfile";
import MemberForm from "./components/members/MemberForm";

// Meetings components
import MeetingsTable from "./components/Meetings/MeetingsTable"; 
import MeetingDetails from "./components/Meetings/MeetingDetails";
import MeetingForm from "./components/Meetings/MeetingForm"; 

// Roles components
import EnhancedRolesView from "./components/roles/EnhancedRolesViewClean";
import RoleForm from "./components/roles/RoleForm";

// Available Members components
import AvailableMembersTable from "./components/availablemember/AvailableMemberTable";
import AvailableMemberForm from "./components/availablemember/AvailableMemberForm";

// Assigned Roles components
import AssignRolesForm from "./components/assignedRoles/AssignRolesForm";
import AssignedRolesTable from "./components/assignedRoles/AssignedRolesTable";

// Speaker and Grammarian
import SpeakerDataForm from "./components/speaker/SpeakerDataForm.jsx";
import GrammarianForm from "./components/grammarian/GrammarianForm.jsx";

// Agenda
import AgendaList from "./components/agenda/AgendaList.jsx";
import CompleteAgenda from "./components/agenda/CompleteAgenda.jsx";

const Home = () => {
  const { isVPEducation } = useAuth();
  return isVPEducation ? <VPEducationDashboard /> : <MemberDashboard />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <Navbar />
              <Box 
                component="main" 
                sx={{
                  flexGrow: 1,
                  p: { xs: 2, md: 3 },
                  backgroundColor: 'background.default',
                  minHeight: 'calc(100vh - 64px)'
                }}
              >
                <Container maxWidth="xl" sx={{ py: 2 }}>
                  <Routes>
                    {/* Auth */}
                    <Route path="/login" element={<Login />} />

                    {/* Dashboards */}
                    <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
                    <Route path="/member-dashboard" element={<RequireAuth><MemberDashboard /></RequireAuth>} />
                    <Route path="/vp-dashboard" element={<RequireAuth><VPEducationDashboard /></RequireAuth>} />

                    {/* Members */}
                    <Route path="/members" element={<RequireAuth><MemberTable /></RequireAuth>} />
                    <Route path="/members/add" element={<RequireAuth><MemberForm /></RequireAuth>} />
                    <Route path="/members/edit/:id" element={<RequireAuth><MemberForm /></RequireAuth>} />
                    <Route path="/members/:id" element={<RequireAuth><MemberDetails /></RequireAuth>} />

                    {/* Member Profile */}
                    <Route path="/profile" element={<RequireAuth><MemberProfile /></RequireAuth>} />
                    <Route path="/profile/:memberId" element={<RequireAuth><MemberProfile /></RequireAuth>} />

                    {/* Meetings */}
                    <Route path="/meetings" element={<RequireAuth><MeetingsTable /></RequireAuth>} />
                    <Route path="/meetings/add" element={<RequireAuth><MeetingForm /></RequireAuth>} />
                    <Route path="/meetings/edit/:meetingId" element={<RequireAuth><MeetingForm /></RequireAuth>} />
                    <Route path="/meetings/:meetingId" element={<RequireAuth><MeetingDetails /></RequireAuth>} />

                    {/* Roles */}
                    <Route path="/roles" element={<RequireAuth><EnhancedRolesView /></RequireAuth>} />
                    <Route path="/roles/add" element={<RequireAuth><RoleForm /></RequireAuth>} />
                    <Route path="/roles/edit/:roleId" element={<RequireAuth><RoleForm /></RequireAuth>} />

                    {/* Available Members */}
                    <Route path="/available-members" element={<RequireAuth><AvailableMembersTable /></RequireAuth>} />
                    <Route path="/available-members/add" element={<RequireAuth><AvailableMemberForm /></RequireAuth>} />
                    <Route path="/available-members/edit/:id" element={<RequireAuth><AvailableMemberForm /></RequireAuth>} />

                    {/* Assigned Roles */}
                    <Route path="/assign-roles/:meetingId" element={<RequireAuth><AssignRolesForm /></RequireAuth>} />
                    <Route path="/assigned-roles/:meetingId" element={<RequireAuth><AssignedRolesTable /></RequireAuth>} />

                    {/* Speaker & Grammarian */}
                    <Route path="/speaker-data/add" element={<RequireAuth><SpeakerDataForm /></RequireAuth>} />
                    <Route path="/speaker-data/edit/:speakerId" element={<RequireAuth><SpeakerDataForm /></RequireAuth>} />
                    <Route path="/grammarian/add" element={<RequireAuth><GrammarianForm /></RequireAuth>} />
                    <Route path="/grammarian/edit/:grammarianId" element={<RequireAuth><GrammarianForm /></RequireAuth>} />

                    {/* Agenda */}
                    <Route path="/agenda-list" element={<RequireAuth><AgendaList /></RequireAuth>} />
                    <Route path="/agenda/complete/:meetingId" element={<RequireAuth><CompleteAgenda /></RequireAuth>} />
                  </Routes>
                </Container>
              </Box>
            </Box>
          </Router>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
