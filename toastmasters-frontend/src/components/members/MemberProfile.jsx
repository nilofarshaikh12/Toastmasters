import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import apiService from '../../api/api.js';
import assignedRoleService from '../../api/assignedRoleService.js';
import meetingService from '../../api/meetingservice.js';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Grid, Tab, Tabs, Typography } from '@mui/material';

const MemberProfile = () => {
  const { memberId: routeMemberId } = useParams();
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
          aRes = await assignedRoleService.getMemberRoleHistory(effectiveMemberId);
        }
        let aList = Array.isArray(aRes?.data?.data) ? aRes.data.data : (Array.isArray(aRes?.data) ? aRes.data : []);

        // Always enrich from all meetings for complete coverage (merge additional meetings not present in history)
        try {
          const meetingsRes = await meetingService.getAllMeetings();
          const meetings = meetingsRes?.data?.data || meetingsRes?.data || [];
          const meetingMap = {};
          const referenced = new Set((Array.isArray(aList) ? aList : []).map(a => String(a.meetingId || '')));
          const merged = Array.isArray(aList) ? [...aList] : [];

          for (const mt of meetings) {
            const mid = mt?.meetingId ?? mt?.id;
            if (!mid) continue;
            const midStr = String(mid);
            meetingMap[midStr] = mt;
            if (referenced.has(midStr)) continue; // already have assignments for this meeting
            try {
              // Try multiple meetingId formats to maximize compatibility
              const variants = (() => {
                const raw = midStr.trim();
                const stripped = raw.replace(/^M/i, '');
                const withM = raw.startsWith('M') ? raw : `M${stripped}`;
                const set = new Set([raw, stripped, withM]);
                return Array.from(set);
              })();
              let arr = [];
              for (const v of variants) {
                try {
                  const arRes = await assignedRoleService.getAssignedRolesByMeeting(v);
                  const maybe = Array.isArray(arRes?.data?.data) ? arRes.data.data : (Array.isArray(arRes?.data) ? arRes.data : []);
                  if (Array.isArray(maybe) && maybe.length > 0) { arr = maybe; break; }
                } catch (_inner) {
                  // try next variant
                }
              }
              const mine = (Array.isArray(arr) ? arr : []).filter(x => String(x.memberId) === String(effectiveMemberId));
              mine.forEach(x => { if (!x.meetingId) x.meetingId = midStr; });
              if (mine.length > 0) merged.push(...mine);
            } catch (_e) {
              // ignore errors for specific meeting
            }
          }

          // Deduplicate merged list (assignmentId if present; else on meetingId+roleId+memberId)
          const seen = new Set();
          aList = merged.filter(x => {
            const key = String(x.assignmentId ?? `${x.meetingId}|${x.roleId}|${x.memberId}`);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          // Set meeting map into state
          setMeetingsById(meetingMap);
        } catch (_e) {
          // ignore enrichment errors
        }

        setAssignments(aList);

        // Fetch meetings referenced (if not already from fallback)
        if (Object.keys(meetingsById).length === 0 && Array.isArray(aList)) {
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
        }
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
  const groupedByMeeting = useMemo(() => {
    const map = new Map();
    for (const a of assignmentsEnriched) {
      const key = String(a.meetingId || a._meeting?.meetingId || a._meeting?.id || '');
      if (!key) continue;
      if (!map.has(key)) map.set(key, { meeting: a._meeting || {}, date: a._date, items: [] });
      map.get(key).items.push(a);
    }
    // to array sorted by date desc (fallback unknown dates last)
    return Array.from(map.entries())
      .map(([meetingId, v]) => ({ meetingId, ...v }))
      .sort((a, b) => {
        if (a.date && b.date) return b.date - a.date;
        if (a.date) return -1;
        if (b.date) return 1;
        return 0;
      });
  }, [assignmentsEnriched]);

  // Nicely format meeting date (e.g., Tue, Sep 2, 2025)
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      }).format(d);
    } catch { return String(dateStr); }
  };

  if (!effectiveMemberId) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>Member Profile</Typography>
        <Typography variant="body2" color="text.secondary">No member selected. Please sign in or open a specific member.</Typography>
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
          <Tab label={`All Meetings (${groupedByMeeting.length})`} />
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

      {tab === 3 && (
        <Grid container spacing={2}>
          {groupedByMeeting.map((group) => {
            const roleNames = Array.from(new Set(
              (group.items || []).map(a => a.roleName || a.roleDisplayName || 'Role')
            ));
            const mid = String(group.meeting?.meetingId || group.meetingId || '');
            const isPast = group.date ? group.date < now : false;
            return (
              <Grid item xs={12} key={`meeting-${group.meetingId}`}>
                <Card sx={{ border: '1px solid', borderColor: 'divider', '&:hover': { boxShadow: 3 } }}>
                  <CardContent>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                          📅 {formatDate(group.meeting?.date)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          🎯 {group.meeting?.theme || 'Meeting'}
                        </Typography>
                        <Box mt={1} display="flex" alignItems="center" gap={1}>
                          <Chip size="small" label={isPast ? 'Past' : 'Upcoming'} color={isPast ? 'default' : 'success'} variant="outlined" />
                          {mid && (
                            <Button component={Link} to={`/meetings/${mid}`} size="small">
                              View meeting
                            </Button>
                          )}
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {roleNames.length > 0 ? (
                            roleNames.map((name, idx) => (
                              <Chip key={`${group.meetingId}-role-${idx}`} label={name} size="small" color="primary" variant="outlined" />
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">No roles</Typography>
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                    <Divider sx={{ mt: 2 }} />
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
          {groupedByMeeting.length === 0 && (
            <Grid item xs={12}><Typography color="text.secondary">No meetings found for this member.</Typography></Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default MemberProfile;
