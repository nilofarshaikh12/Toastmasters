import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import apiService from '../../api/api.js';
import assignedRoleService from '../../api/assignedRoleService.js';
import meetingService from '../../api/meetingservice.js';
import { Box, Card, CardContent, Chip, CircularProgress, Divider, Grid, Tab, Tabs, Typography } from '@mui/material';

const MemberProfile = () => {
  const { memberId: routeMemberId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const effectiveMemberId = useMemo(() => {
    if (routeMemberId) return routeMemberId;
    if (user?.memberId) return user.memberId;
    return null;
  }, [routeMemberId, user?.memberId]);

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [meetingsById, setMeetingsById] = useState({});
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!effectiveMemberId) return;
      setLoading(true);
      try {
        // Member details
        const mRes = await apiService.getMemberById(effectiveMemberId);
        const m = mRes?.data?.data || mRes?.data;
        setMember(m);

        // Assigned roles (full history)
        let aRes;
        if (assignedRoleService.getMemberAssignments) {
          aRes = await assignedRoleService.getMemberAssignments(effectiveMemberId, 1000);
        } else {
          // fallback to last 3 if helper doesn't exist (should not happen after our edit)
          aRes = await assignedRoleService.getMemberRoleHistory(effectiveMemberId);
        }
        const aList = Array.isArray(aRes?.data?.data) ? aRes.data.data : (Array.isArray(aRes?.data) ? aRes.data : []);
        setAssignments(aList);

        // Fetch meetings referenced
        const uniqueMeetingIds = Array.from(new Set(aList.map(a => String(a.meetingId)))).filter(Boolean);
        const map = {};
        await Promise.all(uniqueMeetingIds.map(async (mid) => {
          try {
            const res = await meetingService.getMeetingById(mid);
            const data = res?.data?.data || res?.data;
            map[mid] = data;
          } catch (e) {
            // ignore
          }
        }));
        setMeetingsById(map);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error loading member profile', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [effectiveMemberId]);

  const now = new Date();
  const enrich = (a) => {
    const meeting = meetingsById[String(a.meetingId)] || {};
    const dateStr = meeting?.date || a.meetingDate || '';
    const date = dateStr ? new Date(dateStr) : null;
    return { ...a, _meeting: meeting, _date: date };
  };

  const assignmentsEnriched = useMemo(() => assignments.map(enrich), [assignments, meetingsById]);
  const upcoming = assignmentsEnriched.filter(a => a._date && a._date >= now).sort((x, y) => x._date - y._date);
  const past = assignmentsEnriched.filter(a => a._date && a._date < now).sort((x, y) => y._date - x._date);

  if (!effectiveMemberId) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>Member Profile</Typography>
        <Typography variant="body2" color="text.secondary">No member selected. Please sign in or provide a member id.</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Member Profile
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>{member?.memberName || user?.name || 'Member'}</Typography>
              <Typography variant="body2" color="text.secondary">Email: {member?.email || user?.email || '-'}</Typography>
              <Typography variant="body2" color="text.secondary">Phone: {member?.phone || '-'}</Typography>
              <Typography variant="body2" color="text.secondary">Member ID: {member?.memberId || effectiveMemberId}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" gap={1} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                <Chip label={`Upcoming: ${upcoming.length}`} color="primary" variant="outlined" />
                <Chip label={`Past: ${past.length}`} color="secondary" variant="outlined" />
                <Chip label={`Total Assignments: ${assignments.length}`} variant="outlined" />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label={`Upcoming Meetings (${upcoming.length})`} />
          <Tab label={`Past Meetings (${past.length})`} />
          <Tab label={`All Assigned Roles (${assignments.length})`} />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Grid container spacing={2}>
          {upcoming.map((a, idx) => (
            <Grid item xs={12} md={6} key={`${a.assignmentId || idx}-up`}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {a.roleName || a.roleDisplayName || 'Role'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {a._meeting?.date || '-'} • {a._meeting?.theme || 'Meeting'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {upcoming.length === 0 && (
            <Grid item xs={12}><Typography color="text.secondary">No upcoming meetings found.</Typography></Grid>
          )}
        </Grid>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          {past.map((a, idx) => (
            <Grid item xs={12} md={6} key={`${a.assignmentId || idx}-past`}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {a.roleName || a.roleDisplayName || 'Role'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {a._meeting?.date || '-'} • {a._meeting?.theme || 'Meeting'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {past.length === 0 && (
            <Grid item xs={12}><Typography color="text.secondary">No past meetings found.</Typography></Grid>
          )}
        </Grid>
      )}

      {tab === 2 && (
        <Grid container spacing={2}>
          {assignmentsEnriched.map((a, idx) => (
            <Grid item xs={12} md={6} key={`${a.assignmentId || idx}-all`}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {a.roleName || a.roleDisplayName || 'Role'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {a._meeting?.date || '-'} • {a._meeting?.theme || 'Meeting'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {assignmentsEnriched.length === 0 && (
            <Grid item xs={12}><Typography color="text.secondary">No assignments found.</Typography></Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default MemberProfile;
