import React from "react";
import { 
  Box, 
  Button, 
  Card, 
  CardActions, 
  CardContent, 
  Container, 
  Grid, 
  Typography 
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import theme from './theme';

// Layout
import Navbar from "./components/layout/Navbar";

// Auth
import Login from "./components/auth/Login.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import RequireAuth from "./components/auth/RequireAuth.jsx";
import { useAuth } from "./context/AuthContext.jsx";

// Dashboard components
import MemberDashboard from "./components/dashboard/MemberDashboard";
import VPEducationDashboard from "./components/dashboard/VPEducationDashboard";

// Member components
import MemberTable from "./components/members/MemberTable";
import MemberDetails from "./components/members/MemberDetails";
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

const Home = () => {
  const { isVPEducation } = useAuth();
  
  if (isVPEducation) {
    return <VPEducationDashboard />;
  }
  return <MemberDashboard />;
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
                    <Route path="/login" element={<Login />} />
                    <Route
                      path="/"
                      element={
                        <RequireAuth>
                          <Home />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/member-dashboard"
                      element={
                        <RequireAuth>
                          <MemberDashboard />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/vp-dashboard"
                      element={
                        <RequireAuth>
                          <VPEducationDashboard />
                        </RequireAuth>
                      }
                    />
                    <Route path="/members" element={<RequireAuth><MemberTable /></RequireAuth>} />
                    <Route path="/members/add" element={<RequireAuth><MemberForm /></RequireAuth>} />
                    <Route path="/members/edit/:id" element={<RequireAuth><MemberForm /></RequireAuth>} />
                    <Route path="/members/:id" element={<RequireAuth><MemberDetails /></RequireAuth>} />

                    {/* Meetings Routes */}
                    <Route path="/meetings" element={<RequireAuth><MeetingsTable /></RequireAuth>} />
                    <Route path="/meetings/add" element={<RequireAuth><MeetingForm /></RequireAuth>} />
                    <Route path="/meetings/edit/:meetingId" element={<RequireAuth><MeetingForm /></RequireAuth>} />
                    <Route path="/meetings/:meetingId" element={<RequireAuth><MeetingDetails /></RequireAuth>} />

                    {/* Roles Routes */}
                    <Route path="/roles" element={<RequireAuth><EnhancedRolesView /></RequireAuth>} />
                    <Route path="/roles/add" element={<RequireAuth><RoleForm /></RequireAuth>} />
                    <Route path="/roles/edit/:roleId" element={<RequireAuth><RoleForm /></RequireAuth>} />
            <Route path="/meetings/add" element={<RequireAuth><MeetingForm /></RequireAuth>} />
            <Route path="/meetings/edit/:meetingId" element={<RequireAuth><MeetingForm /></RequireAuth>} />

                    {/* Available Members Routes */}
                    <Route
                      path="/available-members"
                      element={
                        <RequireAuth>
                          <AvailableMembersTable />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/available-members/add"
                      element={
                        <RequireAuth>
                          <AvailableMemberForm />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/available-members/edit/:id"
                      element={
                        <RequireAuth>
                          <AvailableMemberForm />
                        </RequireAuth>
                      }
                    />

                    {/* Assigned Roles Routes */}
                    <Route
                      path="/assign-roles/:meetingId"
                      element={
                        <RequireAuth>
                          <AssignRolesForm />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/assigned-roles/:meetingId"
                      element={
                        <RequireAuth>
                          <AssignedRolesTable />
                        </RequireAuth>
                      }
                    />
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