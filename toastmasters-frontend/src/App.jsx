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
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        bgcolor: 'primary.main', 
        color: 'primary.contrastText',
        p: 4,
        borderRadius: 2,
        mb: 4,
        background: 'linear-gradient(135deg, #2E3B55 0%, #1a237e 100%)',
      }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Welcome to Toastmasters Club
        </Typography>
        <Typography variant="subtitle1" sx={{ opacity: 0.9, maxWidth: '800px' }}>
          Plan meetings, manage members, set availability, and assign roles smoothly with our comprehensive Toastmasters management system.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="h2" gutterBottom>
                <Box component="span" sx={{ color: 'primary.main' }}>Meetings</Box>
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                View all meetings with live status: Upcoming, Ongoing, or Closed.
              </Typography>
            </CardContent>
            <CardActions sx={{ p: 2 }}>
              <Button 
                component={RouterLink} 
                to="/meetings" 
                variant="contained" 
                color="primary"
                fullWidth
              >
                Go to Meetings
              </Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="h2" gutterBottom>
                <Box component="span" sx={{ color: 'primary.main' }}>Members</Box>
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Manage club members, view details, and track their progress.
              </Typography>
            </CardContent>
            <CardActions sx={{ p: 2 }}>
              <Button 
                component={RouterLink} 
                to="/members" 
                variant="contained" 
                color="primary"
                fullWidth
              >
                View Members
              </Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="h2" gutterBottom>
                <Box component="span" sx={{ color: 'primary.main' }}>Roles</Box>
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Assign and manage meeting roles for each session.
              </Typography>
            </CardContent>
            <CardActions sx={{ p: 2 }}>
              <Button 
                component={RouterLink} 
                to="/roles" 
                variant="contained" 
                color="primary"
                fullWidth
              >
                Manage Roles
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
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