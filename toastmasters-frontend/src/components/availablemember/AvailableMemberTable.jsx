// src/components/availablemember/AvailableMembersTable.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import availableMemberService from "../../api/availableMemberService.js";
import meetingService from "../../api/meetingservice.js";
import apiService from "../../api/api.js";
import roleService from "../../api/roleService.js";
import assignedRoleService from "../../api/assignedRoleService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { 
  ROLE_CATEGORIES, 
  getApplicableRoleCategories,
  canRoleBeDuplicated,
  getMaxRoleCount
} from "../../constants/meetingCategories.js";

function AvailableMembersTable() {
  const [groupedAvailability, setGroupedAvailability] = useState({});
  const [meetings, setMeetings] = useState([]);
  const [members, setMembers] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const { isVPEducation, user } = useAuth();
  const [assignedRoles, setAssignedRoles] = useState({});
  const [memberHistory, setMemberHistory] = useState({});
  const [meetingRoles, setMeetingRoles] = useState({}); // Store meeting-specific roles
  const [roleAssignmentCounts, setRoleAssignmentCounts] = useState({}); // Track role assignment counts
  const [availableRolesByMeeting, setAvailableRolesByMeeting] = useState({}); // Server-allowed roles per meeting
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const queryMeetingIdRaw = searchParams.get('meetingId');
  const normalizeMid = (v) => String(v ?? '').trim().replace(/^M/i, '');
  const queryMeetingId = queryMeetingIdRaw ? normalizeMid(queryMeetingIdRaw) : '';
  const [infoBanner, setInfoBanner] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  // Build preferred roles in the order user selected
  const getPreferredRolesOrdered = (am) => {
    try {
      const ids = Array.isArray(am?.preferredRoleIds) ? am.preferredRoleIds.map((x) => String(x)) : [];
      const idsFromCsv = !ids.length && typeof am?.preferredRoleOrder === 'string' && am.preferredRoleOrder.trim().length > 0
        ? am.preferredRoleOrder.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const rolesArr = Array.isArray(am?.preferredRoles) ? am.preferredRoles : [];
      // If both arrays exist, try to order rolesArr by ids
      if (rolesArr.length > 0 && (ids.length > 0 || idsFromCsv.length > 0)) {
        const toKey = (r) => String(typeof r === 'string' ? r : r?.roleId);
        const mapById = new Map(rolesArr.map((r) => [toKey(r), r]));
        const keyOrder = ids.length > 0 ? ids : idsFromCsv;
        const ordered = keyOrder.map((id) => mapById.get(String(id))).filter(Boolean);
        if (ordered.length > 0) return ordered.map((r) => (typeof r === 'string' ? { roleId: r, roleName: (allRoles.find(ar => String(ar.roleId) === String(r))?.roleName || r) } : r));
      }
      // If rolesArr exists but no ids, keep server order as fallback
      if (rolesArr.length > 0) {
        // If backend persisted preferenceRank/preferenceOrder/order/sequence, sort by that first
        const getRank = (x) => {
          if (!x || typeof x === 'string') return Number.MAX_SAFE_INTEGER;
          return x.preferenceRank ?? x.preferenceOrder ?? x.order ?? x.sequence ?? Number.MAX_SAFE_INTEGER;
        };
        const anyRanks = rolesArr.some((r) => getRank(r) !== Number.MAX_SAFE_INTEGER);
        const sorted = anyRanks ? rolesArr.slice().sort((a, b) => getRank(a) - getRank(b)) : rolesArr;
        return sorted.map((r) => (typeof r === 'string' ? { roleId: r, roleName: (allRoles.find(ar => String(ar.roleId) === String(r))?.roleName || r) } : r));
      }
      // If only ids exist, map to role objects from allRoles
      if (ids.length > 0 || idsFromCsv.length > 0) {
        const norm = (v) => String(v ?? '').replace(/^R/i, '');
        const keyOrder = ids.length > 0 ? ids : idsFromCsv;
        return keyOrder.map((id) => {
          const match = allRoles.find((ar) => norm(ar.roleId) === norm(id) || String(ar.roleId) === String(id));
          return match ? { roleId: match.roleId, roleName: match.roleName } : { roleId: id, roleName: String(id) };
        });
      }
      return [];
    } catch (_) {
      return [];
    }
  };

  // Resolve the logged-in user's memberId using AuthContext and roster fallback
  const getCurrentUserMemberId = () => {
    const uid = user?.memberId || user?.id || user?.userId;
    if (uid) return String(uid);
    // fallback by email lookup in loaded members list
    if (user?.email && Array.isArray(members) && members.length > 0) {
      const m = members.find(x => String(x.email || '').toLowerCase() === String(user.email).toLowerCase());
      if (m?.memberId) return String(m.memberId);
    }
    return '';
  };

  // Normalize role IDs to a comparable form (strip leading 'R' and trim)
  const normalizeRoleId = (id) => {
    const s = String(id ?? '').trim();
    return s.replace(/^R/i, '');
  };

  // Helper to get the next unassigned instance index (1-based) for a base role using fresh backend data
  const getNextUnassignedInstanceId = async (meetingId, baseRoleId) => {
    try {
      const freshAssignedRoles = await assignedRoleService.getAssignedRolesByMeeting(meetingId);
      const freshAssignedList = Array.isArray(freshAssignedRoles?.data) ? freshAssignedRoles.data : [];
      const getMeetingBucket = (store, mid) => {
        const s = String(mid ?? '').trim();
        const raw = s.replace(/^M/i, '');
        const withM = `M${raw}`;
        return store[withM] || store[raw] || [];
      };
      const freshMeetingRoles = getMeetingBucket(meetingRoles, meetingId) || [];
      const normBase = (v) => String(v ?? '').replace(/^R/i, '').toLowerCase();
      const baseKey = normBase(baseRoleId);

      const candidates = freshMeetingRoles.filter(mr => {
        const mrBase = mr.baseRoleId || mr.roleId || mr.role?.roleId;
        return normBase(mrBase) === baseKey;
      });

      // Build taken set from instanceNumber field and by matching assigned.roleId to candidate IDs
      const relevantAssignments = freshAssignedList.filter(a => {
        const assignedBaseId = mapAssignedToBaseId(meetingId, a.roleId);
        return normBase(assignedBaseId) === baseKey;
      });

      const takenFromNumber = new Set(
        relevantAssignments
          .map(a => a.instanceNumber ?? a.instance ?? a.position)
          .filter(n => Number.isInteger(n) && n >= 1)
      );

      // Only use per-instance identifiers; DO NOT include mr.roleId (base) as it's same across instances
      const candidateIdLists = candidates.map(mr => [mr.meetingRoleId, mr.id, mr.roleInstanceId].filter(Boolean).map(String));
      const takenFromIds = new Set();
      relevantAssignments.forEach(a => {
        const rid = String(a.roleId);
        candidateIdLists.forEach((ids, idx) => {
          if (ids.includes(rid)) takenFromIds.add(idx + 1);
        });
      });

      // Also parse composed roleIds like 'R4_2' if backend returns them
      relevantAssignments.forEach(a => {
        const rid = String(a.roleId || '');
        if (rid.includes('_')) {
          const [rbase, rinst] = rid.split('_');
          if (normBase(rbase) === baseKey) {
            const num = parseInt(rinst, 10);
            if (Number.isInteger(num) && num >= 1) takenFromIds.add(num);
          }
        }
      });

      const assignedInstances = new Set([...takenFromNumber, ...takenFromIds]);
      console.log('[getNextUnassignedInstanceId] base', baseKey, {
        candidates: candidates.length,
        relevantAssignments: relevantAssignments.length,
        takenFromNumber: Array.from(takenFromNumber),
        takenFromIds: Array.from(takenFromIds)
      });

      // Last-resort heuristic: if still empty, use the count of assignments for this base
      if (assignedInstances.size === 0 && relevantAssignments.length > 0) {
        const nextIdx = Math.min(relevantAssignments.length + 1, candidates.length);
        // Mark 1..length as taken (best-effort)
        for (let i = 1; i <= relevantAssignments.length && i <= candidates.length; i++) {
          assignedInstances.add(i);
        }
        console.log('[getNextUnassignedInstanceId] Using count heuristic', { baseKey, count: relevantAssignments.length, nextIdx });
      }

      for (let i = 1; i <= candidates.length; i++) {
        if (!assignedInstances.has(i)) {
          console.log('[getNextUnassignedInstanceId] next free instance', i);
          return i;
        }
      }
      console.log('[getNextUnassignedInstanceId] no free instance found');
      return null; // All instances are taken
    } catch (e) {
      console.warn('[getNextUnassignedInstanceId] Failed to compute next free instance', e);
      return null;
    }
  };

  // Map an assigned roleId (which may be a meetingRoleId) back to its base role using meetingRoles
  const mapAssignedToBaseId = (meetingId, assignedRoleId) => {
    const getMeetingBucket = (store, mid) => {
      const s = String(mid ?? '').trim();
      const raw = s.replace(/^M/i, '');
      const withM = `M${raw}`;
      return store[withM] || store[raw] || [];
    };
    const meetingRoleList = getMeetingBucket(meetingRoles, meetingId);
    const norm = (v) => String(v ?? '').replace(/^R/i, '');
    const assignedStr = String(assignedRoleId);
    const mr = meetingRoleList.find(mr => {
      const ids = [mr.meetingRoleId, mr.id, mr.roleInstanceId, String(mr.roleId)].filter(Boolean).map(String);
      return ids.includes(assignedStr);
    });
    if (mr) {
      const base = mr.baseRoleId || mr.roleId || mr.role?.roleId;
      return norm(base);
    }
    // Fallbacks: composed id like R12_2 or plain base id
    const baseRaw = assignedStr.includes('_') ? assignedStr.split('_')[0] : assignedStr;
    return norm(baseRaw);
  };

  // Find the first unassigned instance (meeting role) for a given base role in a meeting
  const getFirstUnassignedInstanceId = (meetingId, baseRoleId) => {
    const getMeetingBucket = (store, mid) => {
      const s = String(mid ?? '').trim();
      const raw = s.replace(/^M/i, '');
      const withM = `M${raw}`;
      const bucket = store[withM] || store[raw] || (Array.isArray(store) ? [] : {});
      return bucket;
    };
    const meetingRoleList = getMeetingBucket(meetingRoles, meetingId) || [];
    const assignedBucket = getMeetingBucket(assignedRoles, meetingId) || {};
    const allAssigned = Object.values(assignedBucket).flatMap((roles) => roles);

    const norm = (v) => String(v ?? '').replace(/^R/i, '');
    const targetBase = norm(baseRoleId);

    // Collect all instances for the base role
    const candidates = meetingRoleList.filter((mr) => {
      const mrBase = mr.baseRoleId || mr.roleId || mr.role?.roleId;
      return norm(mrBase) === targetBase;
    });

    // Prepare composed keys for candidates without explicit instance IDs
    const baseWithR = String(baseRoleId).toString().startsWith('R') ? String(baseRoleId) : `R${targetBase}`;
    const composedForCandidates = candidates.map((mr, idx) => ({
      mr,
      composedKey: `${baseWithR}_${idx + 1}`
    }));

    // Build a set of taken instance numbers from assignedRoles using instanceNumber for this base role
    const takenInstanceNumbers = new Set(
      allAssigned
        .filter(a => {
          // Map assigned roleId (which might be MR..., R#, or composed) back to base
          const base = mapAssignedToBaseId(meetingId, a.roleId);
          return String(base) === String(targetBase);
        })
        .map(a => a.instanceNumber)
        .filter(n => Number.isInteger(n) && n >= 1)
    );

    // Return the first instance that is not assigned
    for (let i = 0; i < candidates.length; i++) {
      const mr = candidates[i];
      // Derive an instance key if explicit instance fields are missing
      let derivedInstanceKey = null;
      const roleIdStr = String(mr.roleId ?? '');
      if (!mr.meetingRoleId && !mr.id && !mr.roleInstanceId) {
        // If roleId looks like an instance (e.g., R4_2 or starts with MR), or if roleId is unique among candidates, use it
        const looksInstance = roleIdStr.includes('_') || roleIdStr.startsWith('MR');
        const roleIdCounts = candidates.reduce((acc, c) => {
          const s = String(c.roleId ?? '');
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        }, {});
        const isUniqueAmongCandidates = roleIdCounts[roleIdStr] === 1 && roleIdStr.length > 0;
        if (looksInstance || isUniqueAmongCandidates) {
          derivedInstanceKey = roleIdStr;
        } else {
          // Fall back to composed key based on candidate order when no explicit/unique instance id exists
          derivedInstanceKey = composedForCandidates[i].composedKey;
        }
      }
      // Only compare against instance-specific identifiers. Include derivedInstanceKey when present.
      const ids = [mr.meetingRoleId, mr.id, mr.roleInstanceId, derivedInstanceKey].filter(Boolean).map(String);
      // Consider two ways an instance can be taken: by explicit id match OR by instanceNumber matching this index
      const indexBasedTaken = takenInstanceNumbers.has(i + 1);
      const isAssigned = indexBasedTaken || allAssigned.some((a) => ids.includes(String(a.roleId)));
      if (!isAssigned) {
        const inst = mr.meetingRoleId || mr.id || mr.roleInstanceId || derivedInstanceKey;
        if (inst) return inst;
      }
    }

    // If we got here, either candidates is empty or all looked assigned
    if (candidates.length > 0) {
      // Prepare a concise debug view of candidate instance identifiers and assigned roleIds
      const candidateIds = candidates.map(mr => (mr.meetingRoleId || mr.id || mr.roleInstanceId || String(mr.roleId))).filter(Boolean).map(String);
      const assignedIds = Object.values(assignedRoles[meetingId] || {})
        .flatMap(r => r)
        .map(a => String(a.roleId));
      console.warn('[AssignRole] All instances looked assigned for base', baseRoleId, 'in meeting', meetingId, '— no free instances', {
        candidates: candidateIds,
        assignedRoleIds: assignedIds
      });
    }
    return null;
  };

  // Normalize meeting category to constants our rules expect
  const normalizeMeetingCategory = (cat) => {
    const c = String(cat ?? '').toUpperCase();
    if (!c) return 'REGULAR_MEETING';
    if (c.includes('REGULAR')) return 'REGULAR_MEETING';
    if (c.includes('CONTEST')) return 'CONTEST_MEETING';
    if (c.includes('SPECIAL')) return 'SPECIAL_MILESTONE_MEETING';
    return 'REGULAR_MEETING';
  };


  // Get how many instances of a base role are defined for a specific meeting
  const getMeetingDefinedMax = (meetingId, role) => {
    const list = meetingRoles[meetingId] || [];
    const baseId = normalizeRoleId(role?.roleId);
    if (!baseId) return 0;
    return list.filter(r => normalizeRoleId(r.roleId) === baseId).length;
  };


  // Debug logging for assigned roles structure
  useEffect(() => {
    if (Object.keys(assignedRoles).length > 0) {
      console.log('[DEBUG] Full assigned roles structure:', assignedRoles);
      Object.entries(assignedRoles).forEach(([meetingId, memberRoles]) => {
        console.log(`[DEBUG] Meeting ${meetingId} assigned roles:`, memberRoles);
        Object.entries(memberRoles).forEach(([memberId, roles]) => {
          const speakerRoles = roles.filter(r => r.roleName && r.roleName.includes('Speaker'));
          if (speakerRoles.length > 0) {
            console.log(`[DEBUG] Member ${memberId} Speaker roles:`, speakerRoles);
          }
        });
      });
    }
  }, [assignedRoles]);

  useEffect(() => {
    fetchData();
  }, [location.search]);

  const fetchData = async () => {
    try {
      const [
        availableMembersRes,
        meetingsRes,
        membersRes,
        rolesRes,
      ] = await Promise.all([
        availableMemberService.getAllAvailableMembers(),
        meetingService.getAllMeetings(),
        apiService.getMembers(),
        roleService.getAllRoles(),
      ]);

      // Normalize different API response shapes
      const availableMembers =
        availableMembersRes?.data?.data ?? availableMembersRes?.data ?? availableMembersRes ?? [];
      const meetingsData =
        meetingsRes?.data?.data ?? meetingsRes?.data ?? meetingsRes ?? [];
      const membersData =
        membersRes?.data?.data ?? membersRes?.data ?? membersRes ?? [];
      // roleService.getAllRoles() already returns an array per implementation
      const allRolesData = Array.isArray(rolesRes)
        ? rolesRes
        : (rolesRes?.data?.data ?? rolesRes?.data ?? rolesRes ?? []);

      console.log('[AvailableMembers] Sizes:', {
        availableMembers: Array.isArray(availableMembers) ? availableMembers.length : 'n/a',
        meetings: Array.isArray(meetingsData) ? meetingsData.length : 'n/a',
        members: Array.isArray(membersData) ? membersData.length : 'n/a',
        roles: Array.isArray(allRolesData) ? allRolesData.length : 'n/a',
      });
      
      // Filter to upcoming/ongoing meetings and sort by start datetime DESC (most upcoming first)
      const normalizeTime = (t) => {
        if (!t) return t;
        if (t.includes(":")) {
          const parts = t.split(":");
          return parts.length === 2 ? `${t}:00` : t;
        }
        return t;
      };

      const getStartEnd = (m) => {
        try {
          if (!m || !m.date) return { start: new Date(NaN), end: new Date(NaN) };
          if (String(m.date).includes("T")) {
            const d = new Date(m.date);
            return { start: d, end: d };
          }
          const start = new Date(`${m.date}T${normalizeTime(m.startTime || "00:00:00")}`);
          const end = new Date(`${m.date}T${normalizeTime(m.endTime || "23:59:59")}`);
          return { start, end };
        } catch (e) {
          console.warn("Failed to parse meeting times", e, m);
          return { start: new Date(NaN), end: new Date(NaN) };
        }
      };

      const now = new Date();
      // If a meetingId is provided and it's a past meeting, we still want to show a banner.
      let selectedMeetingFromAll = null;
      if (queryMeetingId) {
        selectedMeetingFromAll = (meetingsData || []).find(m => normalizeMid(m.meetingId) === queryMeetingId);
      }

      // Determine banner for past meeting selection and store selected meeting
      setSelectedMeeting(selectedMeetingFromAll || null);
      if (selectedMeetingFromAll) {
        const { end } = getStartEnd(selectedMeetingFromAll);
        if (!isNaN(end.getTime()) && end < now) {
          setInfoBanner('This meeting has already occurred. You can review availability, but assigning roles to past meetings may be restricted.');
        } else {
          setInfoBanner('');
        }
      } else {
        setInfoBanner('');
      }

      const upcomingMeetings = (meetingsData || [])
        .filter((m) => {
          const { end } = getStartEnd(m);
          return !isNaN(end.getTime()) && end >= now; // upcoming or ongoing
        })
        .sort((a, b) => {
          const { start: aStart } = getStartEnd(a);
          const { start: bStart } = getStartEnd(b);
          return bStart - aStart; // DESC
        });

      // Include selected past meeting if any
      let meetingsToInclude = [...upcomingMeetings];
      if (selectedMeetingFromAll) {
        const { end } = getStartEnd(selectedMeetingFromAll);
        const isPast = !isNaN(end.getTime()) && end < now;
        if (isPast) {
          const exists = meetingsToInclude.some(m => normalizeMid(m.meetingId) === normalizeMid(selectedMeetingFromAll.meetingId));
          if (!exists) {
            meetingsToInclude = [selectedMeetingFromAll, ...meetingsToInclude];
          }
        }
      }

      setMeetings(meetingsToInclude);
      setMembers(membersData);
      setAllRoles(allRolesData);

      const grouped = availableMembers.reduce((acc, am) => {
        // Group against the meetings we decided to include (upcoming + selected past if any)
        const meeting = meetingsToInclude.find(m => m.meetingId === am.meetingId);
        if (meeting) {
          if (!acc[meeting.meetingId]) {
            acc[meeting.meetingId] = {
              meeting,
              members: [],
            };
          }
          acc[meeting.meetingId].members.push(am);
        }
        return acc;
      }, {});
      setGroupedAvailability(grouped);
      
      // Fetch assigned roles for all meetings to display them
      const assignedRolesPromises = Object.keys(grouped).map(meetingId => 
        assignedRoleService.getAssignedRolesByMeeting(meetingId)
      );
      const assignedRolesResults = await Promise.all(assignedRolesPromises);
      
      // Debug: Log the structure of assigned roles
      console.log('Assigned roles results:', assignedRolesResults);
      if (assignedRolesResults.length > 0 && assignedRolesResults[0].data) {
        console.log('First assigned role item:', assignedRolesResults[0].data[0]);
      }
      
      const assignedRolesMap = assignedRolesResults.reduce((acc, res) => {
        if (res.data && res.data.length > 0) {
          res.data.forEach(role => {
            console.log('Processing role:', role); // Debug log
            if (!acc[role.meetingId]) {
              acc[role.meetingId] = {};
            }
            if (!acc[role.meetingId][role.memberId]) {
              acc[role.meetingId][role.memberId] = [];
            }
            // Normalize instanceNumber from possible backend fields
            const parsedFromRoleId = (() => {
              try {
                const s = String(role.roleId ?? '');
                if (s.includes('_')) {
                  const n = parseInt(s.split('_')[1], 10);
                  return Number.isInteger(n) && n >= 1 ? n : null;
                }
                return null;
              } catch { return null; }
            })();
            const normalized = {
              ...role,
              instanceNumber: role.instanceNumber ?? role.instance ?? role.position ?? parsedFromRoleId ?? null,
            };
            acc[role.meetingId][role.memberId].push(normalized);
          });
        }
        return acc;
      }, {});
      
      console.log('Assigned roles map:', assignedRolesMap); // Debug log
      setAssignedRoles(assignedRolesMap);

      // Calculate role assignment counts for validation
      const roleCounts = {};
      Object.values(assignedRolesMap).forEach(meetingRoles => {
        Object.values(meetingRoles).forEach(memberRoles => {
          memberRoles.forEach(role => {
            const roleIdStr = String(role.roleId);
            roleCounts[roleIdStr] = (roleCounts[roleIdStr] || 0) + 1;
          });
        });
      });
      setRoleAssignmentCounts(roleCounts);

      // Fetch meeting-specific roles for each meeting
      const meetingRolesPromises = Object.keys(grouped).map(async (meetingId) => {
        try {
          const response = await meetingService.getMeetingById(meetingId);
          return { meetingId, roles: response.data.data?.roles || [] };
        } catch (error) {
          console.log(`[DEBUG] Available roles for meeting ${meetingId}:`, availableRoles.map(r => `${r.roleName} (ID: ${r.roleId})`));
    console.log(`[DEBUG] Total available roles count:`, availableRoles.length);
          console.log(`[DEBUG] Total available roles count:`, availableRoles.length);
        }
      });
      
      const meetingRolesResults = await Promise.all(meetingRolesPromises);
      const meetingRolesMap = meetingRolesResults.reduce((acc, { meetingId, roles }) => {
        acc[meetingId] = roles;
        return acc;
      }, {});
      
      // Debug meeting roles structure
      console.log('[DEBUG] Meeting roles structure:', meetingRolesMap);
      Object.entries(meetingRolesMap).forEach(([meetingId, roles]) => {
        console.log(`[DEBUG] Meeting ${meetingId} roles:`, roles);
        if (roles.length > 0) {
          console.log(`[DEBUG] Sample role structure:`, roles[0]);
        }
      });
      
      setMeetingRoles(meetingRolesMap);

      // TODO: Re-enable when backend implements available-roles endpoint
      // For now, rely on meeting-defined roles which are working correctly
      const USE_SERVER_AVAILABLE_ROLES = false;
      
      if (USE_SERVER_AVAILABLE_ROLES) {
        // Fetch backend-allowed available roles per meeting to perfectly match server rules
        const availableRolesPromises = Object.keys(grouped).map(async (mid) => {
          try {
            const normalizedMid = normalizeMid(mid);
            const res = await assignedRoleService.getAvailableRolesForMeeting(normalizedMid);
            // Normalize to array of roleIds (accept different response shapes)
            const raw = res?.data?.data ?? res?.data ?? [];
            const ids = Array.isArray(raw)
              ? raw.map(r => String(r.roleId ?? r))
              : [];
            return { meetingId: mid, roleIds: ids };
          } catch (e) {
            console.warn(`Failed to fetch available roles for meeting ${mid}`, e);
            return { meetingId: mid, roleIds: [] };
          }
        });
        const availableRolesResults = await Promise.all(availableRolesPromises);
        const availableRolesMap = availableRolesResults.reduce((acc, { meetingId, roleIds }) => {
          acc[meetingId] = new Set(roleIds);
          return acc;
        }, {});
        setAvailableRolesByMeeting(availableRolesMap);
      } else {
        // Skip server call until endpoint is implemented
        setAvailableRolesByMeeting({});
      }

      // Fetch role history for all members - handle empty database gracefully
      try {
        const allMemberIds = [...new Set(availableMembers.map(am => am.memberId))];
        const historyPromises = allMemberIds.map(async (memberId) => {
          try {
            const historyRes = await assignedRoleService.getMemberRoleHistory(memberId);
            return { memberId, history: historyRes.data || [] };
          } catch (error) {
            console.warn(`No history found for member ${memberId}, using empty array:`, error.message);
            return { memberId, history: [] };
          }
        });

        const historyResults = await Promise.all(historyPromises);
        const historyMap = historyResults.reduce((acc, res) => {
          acc[res.memberId] = res.history;
          return acc;
        }, {});
        setMemberHistory(historyMap);
      } catch (error) {
        console.warn("Error fetching member history, continuing without history data:", error);
        setMemberHistory({});
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
      Swal.fire("Error", "Failed to fetch data. Please try again.", "error");
    }
  };

  const deleteAvailableMember = async (id) => {
    if (window.confirm("Are you sure you want to delete this available member?")) {
      try {
        await availableMemberService.deleteAvailableMember(id);
        Swal.fire("Deleted!", "Available member has been deleted.", "success");
        fetchData(); // Refresh the list
      } catch (error) {
        console.error("Error deleting available member:", error);
        Swal.fire("Error", "Failed to delete available member.", "error");
      }
    }
  };

  // Helper function to check if role was assigned in past 3 meetings
  const checkRoleHistory = (memberId, roleId) => {
    const history = memberHistory[memberId] || [];
    
    // If no history data (empty database), skip history check
    if (!history || history.length === 0) {
      console.log(`No history found for member ${memberId}, skipping history check`);
      return false;
    }
    
    const roleName = getRoleName(parseInt(roleId));
    
    // Get last 3 meetings for this member (sorted by date descending)
    const recentHistory = history
      .sort((a, b) => new Date(b.meetingDate) - new Date(a.meetingDate))
      .slice(0, 3);
    
    // Check if this role was assigned in any of the last 3 meetings
    return recentHistory.some(record => record.roleName === roleName);
  };

  const handleAssignRole = async (meetingId, memberId, roleId) => {
    if (!roleId) return;

    // Determine if selection is a base role or an instance role
    const meetingRoleListDetect = meetingRoles[meetingId] || [];
    const meetingRoleIds = new Set(
      meetingRoleListDetect.flatMap(mr => [mr.meetingRoleId, mr.id, mr.roleInstanceId].filter(Boolean).map(String))
    );
    const selectedIsInstance = meetingRoleIds.has(String(roleId)) || String(roleId).includes('_') || String(roleId).startsWith('MR');

    // If base role selected, map it to the first unassigned instance for backend
    let effectiveRoleId = roleId;
    if (!selectedIsInstance) {
      const firstFree = getFirstUnassignedInstanceId(meetingId, roleId);
      if (!firstFree) {
        Swal.fire("Info", "All instances for this role are already assigned.", "info");
        return;
      }
      effectiveRoleId = firstFree;
    }

    // Resolve the base role entity for messaging/validation
    let role = allRoles.find(r => String(r.roleId) === String(roleId) || String(r.roleId) === String(effectiveRoleId));
    if (!role && String(effectiveRoleId).includes('_')) {
      const baseRoleId = String(effectiveRoleId).split('_')[0];
      role = allRoles.find(r => String(r.roleId) === String(baseRoleId));
    }
    if (!role && String(roleId).includes('_')) {
      const baseRoleId = String(roleId).split('_')[0];
      role = allRoles.find(r => String(r.roleId) === String(baseRoleId));
    }
    // Fallback display name from meeting roles (for custom roles)
    let roleDisplayName = role?.roleName;
    if (!roleDisplayName) {
      const meetingRoleList = meetingRoles[meetingId] || [];
      // Try to resolve using effectiveRoleId (instance ID) first
      const mrByInstance = meetingRoleList.find(mr => {
        const ids = [mr.meetingRoleId, mr.id, mr.roleInstanceId, String(mr.roleId)].filter(Boolean).map(String);
        return ids.includes(String(effectiveRoleId));
      });
      if (mrByInstance) {
        roleDisplayName = mrByInstance.role?.roleName || mrByInstance.roleName || mrByInstance.name || 'Selected Role';
      } else {
        // Try resolving via base
        const baseId = mapAssignedToBaseId(meetingId, effectiveRoleId);
        const mrBase = meetingRoleList.find(mr => {
          const b = mr.baseRoleId || mr.roleId || mr.role?.roleId;
          return String((b ?? '')).replace(/^R/i, '') === baseId;
        });
        roleDisplayName = mrBase?.role?.roleName || mrBase?.roleName || mrBase?.name || 'Selected Role';
      }
    }
    if (!role && !roleDisplayName) {
      Swal.fire("Error", "Role not found.", "error");
      return;
    }

    // Check if member already has this exact instance assigned
    const memberAssignments = assignedRoles[meetingId]?.[memberId] || [];
    // Only enforce instance-level duplicate if assignments store instance IDs
    const anyMemberAssignmentsUseInstanceIds = (() => {
      const mrs = meetingRoles[meetingId] || [];
      const instanceIdSet = new Set(mrs.flatMap(mr => [mr.meetingRoleId, mr.id, mr.roleInstanceId].filter(Boolean).map(String)));
      return memberAssignments.some(a => instanceIdSet.has(String(a.roleId)) || String(a.roleId).includes('_'));
    })();
    if (anyMemberAssignmentsUseInstanceIds && memberAssignments.some(a => String(a.roleId) === String(effectiveRoleId))) {
      Swal.fire("Warning", `This member already has the role ${roleDisplayName || role?.roleName || 'selected role'} assigned.`, "warning");
      return;
    }

    // Get meeting details for validation
    const meeting = meetings.find(m => m.meetingId === meetingId);
    if (!meeting) {
      Swal.fire("Error", "Meeting not found.", "error");
      return;
    }
    const meetingCategory = normalizeMeetingCategory(meeting.category);

    // Enhanced role conflict detection
    const allAssignedRoles = Object.values(assignedRoles[meetingId] || {}).flatMap(roles => roles);
    
    // Check for exact role ID match
    const isRoleInstanceAssigned = allAssignedRoles.some(a => String(a.roleId) === String(effectiveRoleId));
    
    // Check for base role conflicts (for roles that can't be duplicated)
    const baseRoleId = String(effectiveRoleId).includes('_') ? String(effectiveRoleId).split('_')[0] : effectiveRoleId;
    const normalizedBaseRoleId = String(baseRoleId).replace(/^R/i, '');
    
    // Find the role definition to check if it can be duplicated
    const roleDefinition = allRoles.find(r => {
      const normalizedRoleId = String(r.roleId).replace(/^R/i, '');
      return normalizedRoleId === normalizedBaseRoleId;
    });

    // Meeting-driven duplication rule: if meeting defines only one instance for this base role, block duplicates
    const meetingRoleListForCheck = meetingRoles[meetingId] || [];
    const norm = (v) => String(v ?? '').replace(/^R/i, '');
    const candidatesSameBase = meetingRoleListForCheck.filter(mr => {
      const mrBase = mr.baseRoleId || mr.roleId || mr.role?.roleId;
      return norm(mrBase) === normalizedBaseRoleId;
    });
    const meetingInstanceCountForBase = candidatesSameBase.length;

    if (meetingRoleListForCheck.length > 0 && meetingInstanceCountForBase <= 1) {
      // Single defined instance for this meeting: base-role must be unique
      const isBaseRoleAssigned = allAssignedRoles.some(a => {
        // Map assigned roleId (which might be MR..., R#, or composed) back to base
        const base = mapAssignedToBaseId(meetingId, a.roleId);
        return String(base) === String(normalizedBaseRoleId);
      });

      if (isBaseRoleAssigned) {
        const assignedMember = allAssignedRoles.find(a => {
          // Map assigned roleId (which might be MR..., R#, or composed) back to base
          const base = mapAssignedToBaseId(meetingId, a.roleId);
          return String(base) === String(normalizedBaseRoleId);
        });
        const assignedMemberName = getMemberName(assignedMember?.memberId);
        const roleNameForMsg = roleDefinition?.roleName || roleDisplayName || candidatesSameBase[0]?.role?.roleName || 'selected role';
        Swal.fire("Error", `Role '${roleNameForMsg}' is already assigned to ${assignedMemberName}. This role can only be assigned to one person.`, "error");
        return;
      }
    }
    
    // Compute instance-level duplicate only if meeting assignments include instance IDs
    const allAssignedRolesFlat2 = Object.values(assignedRoles[meetingId] || {}).flatMap((roles) => roles);
    const instanceIdSet = new Set((meetingRoles[meetingId] || []).flatMap(mr => [mr.meetingRoleId, mr.id, mr.roleInstanceId].filter(Boolean).map(String)));
    const anyMeetingAssignmentsUseInstanceIds = allAssignedRolesFlat2.some(a => instanceIdSet.has(String(a.roleId)) || String(a.roleId).includes('_'));
    const isRoleInstanceAssignedFlag = anyMeetingAssignmentsUseInstanceIds && allAssignedRolesFlat2.some(a => String(a.roleId) === String(effectiveRoleId));

    if (isRoleInstanceAssignedFlag) {
      Swal.fire("Error", `This specific role instance (${roleDisplayName || role?.roleName || 'selected role'}) is already assigned to another member.`, "error");
      return;
    }

    // For role instances, resolve the actual meeting role ID using meetingRoles state
    let backendRoleId = effectiveRoleId;
    

    try {
      const meetingRoleList = meetingRoles[meetingId] || [];

      // Case 1: Direct match with meeting role ID
      const directMatch = meetingRoleList.find(mr => {
        const ids = [mr.meetingRoleId, mr.id, mr.roleInstanceId, String(mr.roleId)].filter(Boolean).map(String);
        return ids.includes(String(effectiveRoleId));
      });
      
      if (directMatch) {
        backendRoleId = directMatch.meetingRoleId || directMatch.id || directMatch.roleInstanceId || String(directMatch.roleId);
      } else if (String(effectiveRoleId).includes('_')) {
        // Case 2: Composed format "<baseRoleId>_<instanceNumber>"
        const baseRoleId = String(effectiveRoleId).split('_')[0];
        const instanceNumber = parseInt(String(effectiveRoleId).split('_')[1]);
        

        // Filter meeting roles that match the same base role
        const candidates = meetingRoleList.filter(mr => {
          const mrBaseRoleId = mr.baseRoleId || mr.roleId || mr.role?.roleId;
          const normalizedBase = String(mrBaseRoleId).replace(/^R/i, '');
          const normalizedTarget = String(baseRoleId).replace(/^R/i, '');
          return normalizedBase === normalizedTarget;
        });
        
        
        // Pick the Nth instance (instanceNumber is 1-based)
        const targetInstance = candidates[instanceNumber - 1];
        if (targetInstance) {
          const explicitInst = targetInstance.meetingRoleId || targetInstance.id || targetInstance.roleInstanceId;
          if (explicitInst) {
            backendRoleId = explicitInst;
          } else {
            // Compose an instance key if none provided by meetingRoles
            const normBase = (v) => String(v ?? '').replace(/^R/i, '');
            const baseWithR = baseRoleId.toString().startsWith('R') ? String(baseRoleId) : `R${normBase(baseRoleId)}`;
            backendRoleId = `${baseWithR}_${instanceNumber}`;
          }
        } else {
          // Do NOT fallback to base role; instead choose the first unassigned instance or block
          const fallbackInstanceId = getFirstUnassignedInstanceId(meetingId, baseRoleId);
          if (fallbackInstanceId) {
            backendRoleId = fallbackInstanceId;
          } else {
            console.warn('[AssignRole] No available instances found for', baseRoleId, 'in meeting', meetingId);
            await Swal.fire('Error', `All instances of ${roleDisplayName || 'the selected role'} are already assigned for this meeting.`, 'error');
            return;
          }
        }
      } else {
        // Case 3: Simple role ID, check if it exists in meeting roles
        const simpleMatch = meetingRoleList.find(mr => {
          const mrRoleId = mr.baseRoleId || mr.roleId || mr.role?.roleId;
          const normalizedMr = String(mrRoleId).replace(/^R/i, '');
          const normalizedRole = String(effectiveRoleId).replace(/^R/i, '');
          return normalizedMr === normalizedRole;
        });
        
        if (simpleMatch) {
          backendRoleId = simpleMatch.meetingRoleId || simpleMatch.id || simpleMatch.roleInstanceId || String(simpleMatch.roleId);
        }
      }
    } catch (e) {
      console.warn('Failed to resolve meeting role instance ID from meetingRoles; using provided roleId', e);
    }
    
    // Post-resolution guard: ensure backendRoleId maps to a valid meeting role instance
    {
      const meetingRoleListGuard = meetingRoles[meetingId] || [];
      // Build a set of explicit instance ids plus composed ones for roles without explicit instance identifiers
      const composedForMissing = meetingRoleListGuard.map((mr, idx) => {
        const hasExplicit = mr.meetingRoleId || mr.id || mr.roleInstanceId;
        if (hasExplicit) return null;
        const mrBase = mr.baseRoleId || mr.roleId || mr.role?.roleId;
        const normBase = String(mrBase ?? '').replace(/^R/i, '');
        const baseWithR = String(mrBase ?? '').startsWith('R') ? String(mrBase) : (normBase ? `R${normBase}` : null);
        // position index among same-base candidates
        return { baseWithR };
      });
      // Compute composed for each base group with proper index
      const byBase = {};
      meetingRoleListGuard.forEach((mr) => {
        const mrBase = mr.baseRoleId || mr.roleId || mr.role?.roleId;
        const normBase = String(mrBase ?? '').replace(/^R/i, '');
        const baseWithR = String(mrBase ?? '').startsWith('R') ? String(mrBase) : (normBase ? `R${normBase}` : null);
        if (!byBase[baseWithR || '']) byBase[baseWithR || ''] = [];
        byBase[baseWithR || ''].push(mr);
      });
      const composedIds = [];
      Object.entries(byBase).forEach(([baseWithR, list]) => {
        if (!baseWithR) return;
        list.forEach((mr, i) => {
          if (!mr.meetingRoleId && !mr.id && !mr.roleInstanceId) {
            composedIds.push(`${baseWithR}_${i+1}`);
          }
        });
      });
      const meetingRoleIdsSet = new Set([
        ...meetingRoleListGuard.flatMap(mr => [mr.meetingRoleId, mr.id, mr.roleInstanceId].filter(Boolean).map(String)),
        ...composedIds
      ]);
      const looksLikeInstance = meetingRoleIdsSet.has(String(backendRoleId)) || String(backendRoleId).includes('_') || String(backendRoleId).startsWith('MR');
      if (!looksLikeInstance) {
        // Try to infer sole instance for the same base role
        const norm = (v) => String(v ?? '').replace(/^R/i, '');
        const baseFromBackend = String(backendRoleId).includes('_') ? String(backendRoleId).split('_')[0] : backendRoleId;
        const normalizedBase = norm(baseFromBackend);
        const candidates = meetingRoleListGuard.filter(mr => {
          const mrBase = mr.baseRoleId || mr.roleId || mr.role?.roleId;
          return norm(mrBase) === normalizedBase;
        });

        if (candidates.length === 1) {
          // Auto-map to the only instance defined for this meeting
          const only = candidates[0];
          const explicitInst = only.meetingRoleId || only.id || only.roleInstanceId;
          if (explicitInst) {
            backendRoleId = explicitInst;
          } else {
            const baseWithR = String(baseFromBackend).startsWith('R') ? String(baseFromBackend) : `R${normalizedBase}`;
            backendRoleId = `${baseWithR}_1`;
          }
          console.log('[AssignRole] Auto-mapped base role to sole meeting instance:', backendRoleId);
        } else if (candidates.length >= 2) {
          // Try to pick the first unassigned instance automatically
          const autoPickId = getFirstUnassignedInstanceId(meetingId, baseFromBackend);
          if (autoPickId) {
            backendRoleId = autoPickId;
            console.log('[AssignRole] Auto-selected first unassigned instance for base role:', backendRoleId);
          } else {
            console.warn('[AssignRole] Multiple instances exist but all appear assigned for base', baseFromBackend, 'meeting', meetingId);
            await Swal.fire('Error', `Failed to resolve a specific instance for ${roleDisplayName || 'the selected role'}. Please select a numbered instance (e.g., Evaluator 2).`, 'error');
            return;
          }
        } else {
          // No candidates found; keep as-is but warn
          console.warn('[AssignRole] No meeting role instances found for base', baseFromBackend, 'in meeting', meetingId, '— proceeding may fail');
        }
      }
    }

    // Helper: convert resolved instance ID to backend base role ID (e.g., R4 or custom)
    const toBackendBaseRoleId = (mid, rid) => {
      if (!rid) return rid;
      const s = String(rid);
      // If composed like R12_2 or custom_1 → take base part
      const basePart = s.includes('_') ? s.split('_')[0] : s;
      // If it's a meeting-instance id (e.g., MR..., numeric id), map through meetingRoles
      const list = meetingRoles[mid] || [];
      const mr = list.find(mr => {
        const ids = [mr.meetingRoleId, mr.id, mr.roleInstanceId, String(mr.roleId)].filter(Boolean).map(String);
        return ids.includes(s) || ids.includes(basePart);
      });
      let base = String(mr ? (mr.baseRoleId || mr.roleId || mr.role?.roleId || basePart) : basePart);
      const lower = base.toLowerCase();
      // Special-case: backend stores custom as 'custom' (no R prefix)
      if (lower === 'custom' || lower === 'rcustom') return 'custom';
      // If numeric (e.g., "4"), send as R4
      if (/^\d+$/.test(base)) return `R${base}`;
      // If already R<digits> (e.g., R4), normalize R to uppercase
      if (/^r\d+$/i.test(base)) return `R${base.replace(/^r/i, '')}`;
      // For other strings, keep as-is (e.g., "R2", "TimerCode"). Uppercase leading r if present
      if (/^r/.test(base)) return base.replace(/^r/, 'R');
      return base;
    };

    const backendBaseRoleId = toBackendBaseRoleId(meetingId, backendRoleId);

    // Helper: derive instance number for roles with multiple instances
    const deriveInstanceNumber = (mid, resolvedId, baseId) => {
      try {
        const list = meetingRoles[mid] || [];
        const normBase = (v) => {
          const s = String(v ?? '').trim();
          if (!s) return '';
          const lower = s.toLowerCase();
          if (lower === 'custom' || lower === 'rcustom') return 'custom';
          return s.replace(/^R/i, '');
        };
        const baseKey = normBase(baseId);
        const candidates = list.filter(mr => {
          const mrBase = mr.baseRoleId || mr.roleId || mr.role?.roleId;
          const mk = normBase(mrBase);
          return mk === baseKey || (mk === 'custom' && baseKey === 'custom');
        });
        if (candidates.length <= 1) return null; // single-slot role

        const s = String(resolvedId ?? '');
        // If composed like R4_2 or custom_2
        if (s.includes('_')) {
          const parts = s.split('_');
          const n = parseInt(parts[1], 10);
          if (!Number.isNaN(n) && n >= 1 && n <= candidates.length) return n;
        }
        // Try to match explicit ids and infer index
        const idx = candidates.findIndex(mr => {
          const ids = [mr.meetingRoleId, mr.id, mr.roleInstanceId, String(mr.roleId)].filter(Boolean).map(String);
          return ids.includes(s);
        });
        if (idx >= 0) return idx + 1;

        // As a final fallback, pick the first free index.
        // Mark taken indexes in two ways:
        // 1) From assigned.instanceNumber (if backend returns it)
        // 2) From matching assigned.roleId against candidate instance IDs
        const getMeetingBucket = (store, m) => {
          const s = String(m ?? '').trim();
          const raw = s.replace(/^M/i, '');
          const withM = `M${raw}`;
          const bucket = store[withM] || store[raw] || (Array.isArray(store) ? [] : {});
          return bucket;
        };
        const assigned = Object.values(getMeetingBucket(assignedRoles, mid) || {}).flatMap((roles) => roles);
        const takenFromNumber = new Set(
          assigned
            .filter(a => {
              const base = mapAssignedToBaseId(mid, a.roleId);
              return String(base) === String(baseKey);
            })
            .map(a => a.instanceNumber)
            .filter(n => Number.isInteger(n) && n >= 1)
        );

        const candidateIdLists = candidates.map(mr => [mr.meetingRoleId, mr.id, mr.roleInstanceId, String(mr.roleId)].filter(Boolean).map(String));
        const takenFromIds = new Set();
        assigned.forEach(a => {
          const rid = String(a.roleId);
          candidateIdLists.forEach((ids, idx) => {
            if (ids.includes(rid)) takenFromIds.add(idx + 1);
          });
        });

        const taken = new Set([...takenFromNumber, ...takenFromIds]);
        for (let i = 1; i <= candidates.length; i++) {
          if (!taken.has(i)) {
            console.log('[deriveInstanceNumber] Picked free instance', i, { baseKey, taken: Array.from(taken) });
            return i;
          }
        }
        console.log('[deriveInstanceNumber] No free instance found', { baseKey, total: candidates.length, taken: Array.from(taken) });
        return null;
      } catch (e) {
        console.warn('Failed to get next unassigned instance ID', e);
        return null;
      }
    };

    // Resolve final instance and payload as per new flow
    let resolvedInstanceId = backendRoleId; // may already be R4_2
    const getMeetingBucket = (store, mid) => {
      const s = String(mid ?? '').trim();
      const raw = s.replace(/^M/i, '');
      const withM = `M${raw}`;
      return store[withM] || store[raw] || [];
    };
    const freshMeetingRoles = getMeetingBucket(meetingRoles, meetingId) || [];
    const baseKey = String(backendBaseRoleId).replace(/^R/i, '').toLowerCase();
    const candidates = freshMeetingRoles.filter(mr => {
      const mrBase = mr.baseRoleId || mr.roleId || mr.role?.roleId;
      return String(mrBase).replace(/^R/i, '').toLowerCase() === baseKey;
    });
    console.log('[handleAssignRole] candidates for base', backendBaseRoleId, '=>', candidates.length);

    if (!String(resolvedInstanceId).includes('_') && candidates.length > 1) {
      const next = await getNextUnassignedInstanceId(meetingId, backendBaseRoleId);
      if (next !== null) {
        resolvedInstanceId = `${backendBaseRoleId}_${next}`;
        console.log('[handleAssignRole] Resolved base to instance', resolvedInstanceId);
      } else {
        await Swal.fire('Error', `All instances for ${roleDisplayName} are already assigned.`, 'error');
        return;
      }
    }

    const parts = String(resolvedInstanceId).split('_');
    const finalBaseRoleId = toBackendBaseRoleId(meetingId, parts[0]);
    const finalInstanceNumber = parts.length > 1 ? parseInt(parts[1], 10) : null;
    console.log('[handleAssignRole] final ids', { resolvedInstanceId, finalBaseRoleId, finalInstanceNumber });

    // Determine max allowed instances for this role in this meeting
    const midStr = String(meetingId ?? '').trim();
    const serverAllowedSet = availableRolesByMeeting[midStr] || availableRolesByMeeting[midStr.replace(/^M/i, '')] || [];
    const normBase = (v) => String(v ?? '').replace(/^R/i, '');
    const baseKeyForCheck = normBase(finalBaseRoleId);
    const serverAllowedEntry = Array.isArray(serverAllowedSet)
      ? serverAllowedSet.find(r => normBase(r.baseRoleId || r.roleId || r.role?.roleId) === baseKeyForCheck)
      : null;
    const serverMax = serverAllowedEntry?.maxCount || serverAllowedEntry?.count || serverAllowedEntry?.allowedCount;
    const meetingObj = meetings.find(m => String(m.meetingId) === String(meetingId));
    const meetingCategoryForMax = meetingObj ? normalizeMeetingCategory(meetingObj.category) : null;
    const categoryMax = meetingCategoryForMax ? getMaxRoleCount(meetingCategoryForMax, baseKeyForCheck) : undefined;
    // Mirror backend duplication rules (canRoleBeDuplicated)
    const displayName = (getRoleName(finalBaseRoleId) || '').toLowerCase();
    const cat = String(meetingCategoryForMax || '').toUpperCase();
    let canDuplicate = false;
    if (cat === 'REGULAR_MEETING' || cat === 'SPECIAL_MILESTONE_MEETING') {
      canDuplicate = displayName === 'speaker' || displayName === 'evaluator';
    } else if (cat === 'CONTEST_MEETING') {
      canDuplicate = ['contestant', 'timer', 'evaluator', 'speech evaluator'].includes(displayName);
    }
    // Prefer explicit meeting-defined instances (candidates from earlier resolution)
    const inferredCandidates = (() => {
      const getBucket = (store, mid) => {
        const s = String(mid ?? '').trim();
        const raw = s.replace(/^M/i, '');
        const withM = `M${raw}`;
        return store[withM] || store[raw] || [];
      };
      const list = getBucket(meetingRoles, meetingId) || [];
      return list.filter(mr => normBase(mr.baseRoleId || mr.roleId || mr.role?.roleId) === baseKeyForCheck).length;
    })();
    // If we already computed candidates for this base role, trust that count as authoritative (but cap by canDuplicate)
    const meetingDefinedCount = typeof candidates?.length === 'number' && candidates.length > 0 ? candidates.length : 0;
    const rawMax = meetingDefinedCount || serverMax || categoryMax || inferredCandidates || 1;
    const maxAllowed = canDuplicate ? rawMax : 1;
    console.log('[handleAssignRole] maxAllowed for base', baseKeyForCheck, '=>', maxAllowed, { meetingDefinedCount, serverMax, categoryMax, inferredCandidates, canDuplicate, meetingCategoryForMax, displayName });

    // If server indicates single-instance, and someone already has it, block early with a clear message
    if (maxAllowed === 1) {
      try {
        const fresh = await assignedRoleService.getAssignedRolesByMeeting(meetingId);
        const freshList = Array.isArray(fresh?.data) ? fresh.data : [];
        const alreadyAssignedCount = freshList.filter(a => normBase(mapAssignedToBaseId(meetingId, a.roleId)) === baseKeyForCheck).length;
        if (alreadyAssignedCount >= 1) {
          const roleDisplay = getRoleName(`R${baseKeyForCheck}`);
          await Swal.fire('Not Allowed', `Role '${roleDisplay}' is already assigned. This role can only be assigned to one person.`, 'error');
          return;
        }
      } catch (e) {
        console.warn('[handleAssignRole] fresh single-instance check failed', e);
      }
    }

    // For multi-instance roles: warn if assigning the same base role again to the SAME member in this meeting
    if (maxAllowed > 1) {
      try {
        const memberAssigned = (assignedRoles[meetingId]?.[memberId] || []);
        const hasSameBaseForMember = memberAssigned.some(a => normBase(mapAssignedToBaseId(meetingId, a.roleId)) === baseKeyForCheck);
        if (hasSameBaseForMember) {
          const memberName = getMemberName(memberId);
          const roleNameForMsg = getRoleName(finalBaseRoleId) || roleDisplayName || 'selected role';
          const result = await Swal.fire({
            title: 'Assign same role again?',
            text: `${memberName} was recently assigned '${roleNameForMsg}' for this meeting. Do you want to assign another instance to the same member?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, assign again',
            cancelButtonText: 'No, cancel'
          });
          if (!result.isConfirmed) {
            return; // User cancelled
          }
        }
      } catch (e) {
        console.warn('[handleAssignRole] same-member multi-instance confirmation failed (continuing)', e);
      }
    }

    // Normalize IDs for backend (use numeric meetingId and base roleId if possible)
    const meetingIdStr = String(meetingId ?? '').trim();
    const meetingRaw = meetingIdStr.replace(/^M/i, '');
    const meetingIdForPost = Number.isNaN(parseInt(meetingRaw, 10)) ? meetingRaw : parseInt(meetingRaw, 10);

    // Force roleId to strict 'R<number>' format expected by backend (BASE ID)
    const baseDigits = String(finalBaseRoleId ?? '').trim().replace(/^R/i, '');
    const normalizedRoleId = `R${baseDigits}`;
    console.log('[handleAssignRole] normalizedRoleId for POST', normalizedRoleId);

    const payload = {
      meetingId: meetingId, // keep as provided (e.g., 'M13') to match backend expectations
      memberId: memberId,
      roleId: normalizedRoleId
    };
    // Only include instanceNumber when multiple instances are allowed
    if (maxAllowed > 1) {
      if (finalInstanceNumber != null) {
        payload.instanceNumber = finalInstanceNumber;
      }
      if (candidates.length > 1 && payload.instanceNumber == null) {
        payload.instanceNumber = 1;
        console.log('[handleAssignRole] Defaulted instanceNumber to 1 for first assignment');
      }
    }

    // Try to include per-instance meetingRoleId/id if available, as some backends require it
    try {
      const sMid = String(meetingId ?? '').trim();
      const rawMid = sMid.replace(/^M/i, '');
      const withMKey = `M${rawMid}`;
      const meetingRoleList = (meetingRoles[withMKey] || meetingRoles[rawMid] || []);
      const normBase = (v) => String(v ?? '').replace(/^R/i, '');
      const baseKey = normBase(finalBaseRoleId);
      const candidatesForBase = meetingRoleList.filter(mr => {
        const mrBase = mr.baseRoleId || mr.roleId || mr.role?.roleId;
        return normBase(mrBase) === baseKey;
      });
      const inst = Number(payload.instanceNumber) || 1;
      const picked = candidatesForBase[inst - 1];
      const mrid = picked && (picked.meetingRoleId || picked.id || picked.roleInstanceId);
      if (mrid) {
        payload.meetingRoleId = String(mrid);
        console.log('[handleAssignRole] Attached meetingRoleId to payload', payload.meetingRoleId);
      }
    } catch (e) {
      console.warn('[handleAssignRole] Could not attach meetingRoleId', e);
    }

    console.log('Initial payload:', JSON.stringify(payload, null, 2));
    let skipRecentWarning = false;

      // Fresh pre-check: show confirmation if Speaker/Evaluator was assigned in last 3 meetings
      try {
        const roleDisplay = getRoleName(finalBaseRoleId);
        const rl = String(roleDisplay || '').toLowerCase();
        const isDupRestricted = rl === 'speaker' || rl === 'evaluator' || rl === 'speech evaluator';
        if (isDupRestricted) {
          const hist = await assignedRoleService.getMemberRoleHistory(memberId);
          const list = Array.isArray(hist?.data) ? hist.data : [];
          const conflict = list.some(h => {
            const nameOk = String(h.roleName || '').toLowerCase() === rl;
            if (nameOk) return true;
            const base = mapAssignedToBaseId(meetingId, h.roleId);
            return String(base).replace(/^R/i, '') === String(finalBaseRoleId).replace(/^R/i, '');
          });
          if (conflict) {
            const memberName = getMemberName(memberId);
            const result = await Swal.fire({
              title: 'Assign Recently Performed Role?',
              text: `${memberName} performed '${roleDisplay}' in one of the last 3 meetings. Do you still want to assign this role?`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              confirmButtonText: 'Yes, assign anyway',
              cancelButtonText: 'No, cancel'
            });
            if (!result.isConfirmed) {
              return;
            }
            // User chose to override
            payload.forceAssignLast3 = true;
            skipRecentWarning = true;
          }
        }
      } catch (e) {
        console.warn('[handleAssignRole] recent-history precheck failed (continuing)', e);
      }

      // Check if meeting is in the past (rename var to avoid redeclaration conflicts)
      const selectedMeeting = meetings.find(m => m.meetingId === meetingId);
      if (!selectedMeeting) {
        throw new Error('Meeting not found');
      }
      
      if (new Date(selectedMeeting.meetingDate) < new Date()) {
        // Find role by ID (handling both string and numeric IDs)
        const role = allRoles.find(r => r.roleId === roleId || r.roleId === `R${roleId}` || r.roleId === parseInt(roleId.replace('R', '')));
        const roleName = role?.roleName || 'this role';
        const memberName = getMemberName(memberId);
        
        const result = await Swal.fire({
          title: 'Assign Role in Past Meeting',
          html: `The meeting on ${new Date(selectedMeeting.meetingDate).toLocaleDateString()} has already occurred.<br><br>Do you still want to assign ${memberName} as ${roleName}?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Yes, assign anyway',
          cancelButtonText: 'No, cancel',
          reverseButtons: true
        });

        if (!result.isConfirmed) {
          return; // User cancelled the assignment
        }
        
        // Add a flag to indicate this is an override
        payload.forceAssign = true;
      }
      // Skip history check if database was cleared OR we've already shown a specific last-3 confirmation
      if (Object.keys(memberHistory).length > 0 && !skipRecentWarning) {
        const hasRecentRole = checkRoleHistory(memberId, roleId);
        
        if (hasRecentRole) {
          const roleName = getRoleName(parseInt(roleId));
          const memberName = getMemberName(parseInt(memberId));
          
          const result = await Swal.fire({
            title: 'Role Recently Assigned',
            text: `${memberName} was assigned the role "${roleName}" in one of the past 3 meetings. Do you still want to assign this role?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, assign role',
            cancelButtonText: 'No, cancel'
          });

          if (!result.isConfirmed) {
            return; // User cancelled, don't assign the role
          }
        }
      }

      // Unified send with retry-on-duplicate and one-time override retry for 'last 3 meetings'
      try {
        const maxAttempts = Math.max(1, candidates.length);
        let triedOverrideLast3 = !!payload.forceAssignLast3;
        let triedNonDupFallback = false;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          console.log('Sending payload to API (attempt', attempt, '):', JSON.stringify(payload, null, 2));
          try {
            const response = await assignedRoleService.assignRole(payload);
            console.log('API Response:', response);
            Swal.fire('Success', 'Role assigned successfully!', 'success');
            fetchData();
            return;
          } catch (err) {
            const status = err?.response?.status ?? err?.status ?? err?.code;
            const message = (err?.response?.data && (err.response.data.message || err.response.data.error)) || err?.message || '';
            const msg = String(message || '');
            const isLast3 = /last\s*3\s*meetings/i.test(msg);
            const isNonDupInstance = /non-duplicatable|cannot have an instance number/i.test(msg);
            const isDuplicate = status === 400 && /assigned|duplicate|already/i.test(msg) && !isLast3;
            // If backend says role is non-duplicatable but we sent an instanceNumber, strip it and retry once
            if (status === 400 && isNonDupInstance && payload.instanceNumber != null && !triedNonDupFallback) {
              console.warn('[assign] Server indicates non-duplicatable; removing instanceNumber and retrying once');
              delete payload.instanceNumber;
              triedNonDupFallback = true;
              continue;
            }
            // If backend still blocks due to last-3 rule and we haven't tried override in this flow, ask once
            if (status === 400 && isLast3 && !triedOverrideLast3) {
              try {
                const roleDisplay = getRoleName(finalBaseRoleId);
                const memberName = getMemberName(memberId);
                const result = await Swal.fire({
                  title: 'Assign Recently Performed Role?',
                  text: `${memberName} performed '${roleDisplay}' in one of the last 3 meetings. Do you still want to assign this role?`,
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#3085d6',
                  cancelButtonColor: '#d33',
                  confirmButtonText: 'Yes, assign anyway',
                  cancelButtonText: 'No, cancel'
                });
                if (result.isConfirmed) {
                  payload.forceAssignLast3 = true;
                  triedOverrideLast3 = true;
                  continue;
                }
              } catch (e) {
                console.warn('[assign] last-3 confirm flow failed', e);
              }
            }
            if (isDuplicate && candidates.length > 1) {
              const next = await getNextUnassignedInstanceId(meetingId, finalBaseRoleId);
              if (next == null) {
                console.warn('[assign retry] No next free instance; stopping retries.');
                throw err;
              }
              payload.instanceNumber = next;
              // Keep roleId as base 'R#' and only adjust instanceNumber
              console.log('[assign retry] Adjusted instanceNumber to', next, 'and retrying');
              continue;
            }
            throw err;
          }
        }
      } catch (error) {
        console.error('Error assigning role:', error);
        const errMsg = error?.response?.data?.message || error.message || 'Failed to assign role. Please try again.';
        Swal.fire('Error', errMsg, 'error');
      }
  };  
  
  const getMemberName = (memberId) => {
    const member = members.find(m => m.memberId === memberId);
    return member ? member.memberName : 'Unknown Member';
  };

  const getRoleName = (roleId) => {
    if (!roleId) return 'Unknown Role';
    const roleIdStr = String(roleId);
    
    // First check if it's a meeting-specific role instance (e.g., "R12_2")
    if (roleIdStr.includes('_')) {
      const baseRoleId = roleIdStr.split('_')[0];
      const instanceNumber = roleIdStr.split('_')[1];
      const baseRole = allRoles.find(r => 
        r.roleId === baseRoleId || 
        r.roleId === `R${baseRoleId}` || 
        (baseRoleId.startsWith('R') && r.roleId === parseInt(baseRoleId.replace('R', '')))
      );
      if (baseRole) {
        // Check if there are multiple instances to decide on numbering
        const meeting = meetings.find(m => m.meetingId === currentMeetingId);
        if (meeting?.roles) {
          const sameRoleCount = meeting.roles.filter(mr => {
            const mrBaseRoleId = mr.baseRoleId || mr.roleId || mr.role?.roleId;
            return String(mrBaseRoleId) === String(baseRoleId);
          }).length;
          return sameRoleCount > 1 ? `${baseRole.roleName} ${instanceNumber}` : baseRole.roleName;
        }
        return `${baseRole.roleName} ${instanceNumber}`;
      }
    }
    
    // Fallback to original logic for base roles
    const role = allRoles.find(r => 
      r.roleId === roleId || 
      r.roleId === roleIdStr || 
      r.roleId === `R${roleId}` || 
      (roleIdStr.startsWith('R') && r.roleId === parseInt(roleIdStr.replace('R', '')))
    );
    return role ? role.roleName : 'Unknown Role';
  };

  // Helper function to get applicable roles for a meeting and member
  const getApplicableRolesForMeeting = (meetingId, memberId = null) => {
    const meeting = meetings.find(m => m.meetingId === meetingId);
    if (!meeting) return allRoles;
    const meetingCategory = normalizeMeetingCategory(meeting.category);
    
    // Get applicable role categories for this meeting type
    const applicableCategories = getApplicableRoleCategories(meetingCategory);
    
    // Prefer server-provided available roles for this meeting to match backend duplication/max logic
    let availableRoles = [];
    const serverAllowedSet = availableRolesByMeeting[meetingId];
    const meetingSpecificRoles = meetingRoles[meetingId] || [];
    
    if (serverAllowedSet && serverAllowedSet.size > 0) {
      availableRoles = allRoles.filter(role => serverAllowedSet.has(String(role.roleId)));
    } else if (meetingSpecificRoles.length > 0) {
      // Use actual meeting-defined role instances (Speaker 1, Speaker 2, etc.)
      availableRoles = meetingSpecificRoles.map((meetingRole, index) => {
        // Try different possible structures for the base role ID
        const baseRoleId = meetingRole.role?.roleId || 
                          meetingRole.roleId || 
                          meetingRole.role?.id ||
                          meetingRole.baseRoleId;
        
        const baseRole = allRoles.find(r => String(r.roleId) === String(baseRoleId));
        
        if (baseRole) {
          // Try different possible structures for instance ID and name
          const instanceId = meetingRole.meetingRoleId || 
                           meetingRole.id || 
                           meetingRole.roleInstanceId ||
                           `${baseRoleId}_${meetingRole.instanceNumber || index + 1}`;
          
          // Generate proper instance names - show numbers only for multiple instances
          const instanceNumber = meetingRole.instanceNumber || index + 1;
          
          // Count how many instances of this base role exist in the meeting
          const sameRoleInstances = Array.isArray(meetingSpecificRoles) ? meetingSpecificRoles.filter(mr => {
            const mrBaseRoleId = mr.baseRoleId || mr.roleId || mr.role?.roleId;
            return String(mrBaseRoleId) === String(baseRoleId);
          }) : [];
          
          const instanceName = sameRoleInstances.length > 1 ? 
                              `${baseRole.roleName} ${instanceNumber}` : 
                              baseRole.roleName;
          
          const instanceRole = {
            ...baseRole,
            roleId: instanceId,
            roleName: instanceName,
            isInstance: true,
            baseRoleId: baseRoleId,
            instanceNumber: meetingRole.instanceNumber || index + 1
          };
          return instanceRole;
        } else if (baseRoleId === 'custom' || !baseRoleId) {
          // Handle custom roles that don't have a base role in allRoles
          const instanceId = meetingRole.meetingRoleId || 
                           meetingRole.id || 
                           meetingRole.roleInstanceId ||
                           `custom_${index + 1}`;
          
          const instanceName = meetingRole.roleName || 
                              meetingRole.name ||
                              `Custom Role ${index + 1}`;
          
          const customRole = {
            roleId: instanceId,
            roleName: instanceName,
            category: 'CUSTOM',
            isInstance: true,
            baseRoleId: 'custom',
            instanceNumber: meetingRole.instanceNumber || index + 1,
            guidelinesUrl: null
          };
          return customRole;
        }
        console.warn(`No base role found for baseRoleId: ${baseRoleId} in meeting role:`, meetingRole);
        return null;
      }).filter(Boolean);
    } else {
      // Fallback: use all roles applicable to this meeting category
      availableRoles = allRoles.filter(role => {
        if (!role.category) return false;
        return applicableCategories.includes(role.category) || 
               role.category === ROLE_CATEGORIES.SHARED_ALL_MEETINGS;
      });
    }
    
    // If memberId is provided, filter out roles that can't be assigned
    if (memberId) {
      const memberAssignments = assignedRoles[meetingId]?.[memberId] || [];
      const allAssignedRoles = Object.values(assignedRoles[meetingId] || {}).flatMap(roles => roles);
      
      availableRoles = availableRoles.filter(role => {
        // For role instances, check if this specific instance is already assigned
        if (role.isInstance) {
          const isInstanceAssigned = allAssignedRoles.some(a => String(a.roleId) === String(role.roleId));
          return !isInstanceAssigned;
        }
        
        // For base roles (fallback case), use the original logic
        const memberInstanceCount = memberAssignments.filter(a => 
          normalizeRoleId(a.roleId) === normalizeRoleId(role.roleId)
        ).length;
        
        const categoryMax = getMaxRoleCount(meetingCategory, role.roleName);
        const totalDefinedForMeeting = getMeetingDefinedMax(meetingId, role);
        const effectiveMax = totalDefinedForMeeting > 0 ? Math.min(categoryMax, totalDefinedForMeeting) : categoryMax;
        const maxInstancesPerMember = canRoleBeDuplicated(meetingCategory, role.roleName) ? 
          effectiveMax : 1;
        
        if (memberInstanceCount >= maxInstancesPerMember) {
          return false;
        }
        
        if (!canRoleBeDuplicated(meetingCategory, role.roleName)) {
          const existingAssignment = Object.entries(assignedRoles[meetingId] || {})
            .filter(([mId]) => mId !== String(memberId))
            .flatMap(([_, roles]) => roles)
            .find(a => normalizeRoleId(a.roleId) === normalizeRoleId(role.roleId));
            
          if (existingAssignment) {
            return false;
          }
        }
        
        const currentCount = allAssignedRoles.filter(a => 
          normalizeRoleId(a.roleId) === normalizeRoleId(role.roleId)
        ).length;
        const meetingDefinedMax = getMeetingDefinedMax(meetingId, role);
        const maxCount = meetingDefinedMax > 0 ? meetingDefinedMax : getMaxRoleCount(meetingCategory, role.roleName);
        
        return currentCount < maxCount;
      });
    }
    
    return availableRoles;
  };

  const handleDeleteAssignedRole = async (assignedRole, memberId, roleName) => {
    console.log('Deleting assigned role:', assignedRole);
    console.log('All keys in assignedRole:', Object.keys(assignedRole));
    
    const result = await Swal.fire({
      title: 'Remove Assigned Role',
      text: `Are you sure you want to remove ${roleName} from this member?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove it',
      cancelButtonText: 'No, keep it',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      try {
        // Try all possible ID properties
        const assignmentId = assignedRole.assignedRoleId || 
                           assignedRole.id || 
                           assignedRole.assignmentId ||
                           assignedRole.assignedRoleID;
        
        console.log('Attempting to delete with ID:', assignmentId);
        
        if (!assignmentId) {
          const errorMsg = `No valid assignment ID found in role object. Available keys: ${Object.keys(assignedRole).join(', ')}`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        console.log(`Calling delete API with URL: http://localhost:8080/assigned_roles/${assignmentId}`);
        await assignedRoleService.deleteAssignedRole(assignmentId);
        Swal.fire('Deleted!', 'The role assignment has been removed.', 'success');
        fetchData();
      } catch (error) {
        console.error('Error deleting assigned role:', error);
        Swal.fire('Error', `Failed to remove the role assignment: ${error.message}`, 'error');
      }
    }
  };

  return (
    <div className="container mt-4">
      {/* Header actions when coming from a meeting */}
      {(queryMeetingId || infoBanner) && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="flex-grow-1">
            {infoBanner && (
              <div className="alert alert-warning mb-0" role="alert">
                {infoBanner}
              </div>
            )}
          </div>
          {selectedMeeting && (
            <div className="ms-3 d-flex gap-2">
              <Link to={`/meetings/${selectedMeeting.meetingId}`} className="btn btn-outline-secondary btn-sm">
                Back to Meeting
              </Link>
            </div>
          )}
        </div>
      )}
      {Object.keys(groupedAvailability).length > 0 ? (
        Object.keys(groupedAvailability)
          // If meetingId is provided in query, only show that meeting group
          .filter((key) => {
            if (!queryMeetingId) return true;
            const kNorm = normalizeMid(key);
            return kNorm === queryMeetingId;
          })
          .sort((a, b) => {
            try {
              const ma = groupedAvailability[a].meeting;
              const mb = groupedAvailability[b].meeting;
              const { start: aStart } = (function(m){
                if (!m || !m.date) return { start: new Date(NaN) };
                if (String(m.date).includes('T')) return { start: new Date(m.date) };
                const s = `${m.date}T${(m.startTime && m.startTime.includes(':') && m.startTime.split(':').length===2) ? m.startTime+':00' : (m.startTime || '00:00:00')}`;
                return { start: new Date(s) };
              })(ma);
              const { start: bStart } = (function(m){
                if (!m || !m.date) return { start: new Date(NaN) };
                if (String(m.date).includes('T')) return { start: new Date(m.date) };
                const s = `${m.date}T${(m.startTime && m.startTime.includes(':') && m.startTime.split(':').length===2) ? m.startTime+':00' : (m.startTime || '00:00:00')}`;
                return { start: new Date(s) };
              })(mb);
              return bStart - aStart; // DESC
            } catch (error) {
              console.error("Error sorting grouped meetings:", error);
              return 0;
            }
          })
          .map((currentMeetingId) => (
          <div key={currentMeetingId} className="card shadow-sm mb-4">
            <div className="card-header bg-dark text-white fw-bold d-flex justify-content-between align-items-center">
              <span>Meeting: {groupedAvailability[currentMeetingId].meeting.date} - {groupedAvailability[currentMeetingId].meeting.theme}</span>
              <span className="small">
                {(() => {
                  const m = groupedAvailability[currentMeetingId].meeting;
                  const now = new Date();
                  
                  // Use the same robust date parsing logic as MeetingsTable
                  let status = "Unknown";
                  
                  try {
                    if (!m.date || !m.startTime || !m.endTime) {
                      status = "Invalid";
                    } else {
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
                        status = "Invalid";
                      } else {
                        // Determine meeting status
                        if (now < parsedStart) {
                          status = "Upcoming";
                        } else if (now >= parsedStart && now <= parsedEnd) {
                          status = "Ongoing";
                        } else {
                          status = "Closed";
                        }
                      }
                    }
                  } catch (error) {
                    console.error(`Error parsing meeting date:`, error, m);
                    status = "Error";
                  }
                  
                  return status;
                })()}
              </span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Member Name</th>
                      <th>Availability Status</th>
                      <th>Preferred Roles</th>
                      <th>Assigned Roles</th>
                      <th>Actions</th>
                      {isVPEducation && <th>Assign Role</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {groupedAvailability[currentMeetingId].members
                      .filter((am) => String(am.availabilityStatus || '').toUpperCase() === 'AVAILABLE')
                      .map((am) => {
                      const assigned = assignedRoles[currentMeetingId]?.[am.memberId];
                      const meetingForRow = groupedAvailability[currentMeetingId].meeting;
                      const { end: rowEnd } = (function(m){
                        try {
                          if (!m || !m.date) return { end: new Date(NaN) };
                          if (String(m.date).includes('T')) return { end: new Date(m.date) };
                          const n = (t) => (t && t.includes(':') && t.split(':').length===2) ? t+':00' : (t || '23:59:59');
                          return { end: new Date(`${m.date}T${n(m.endTime)}`) };
                        } catch { return { end: new Date(NaN) } }
                      })(meetingForRow);
                      const isPastMeeting = !isNaN(rowEnd.getTime()) && rowEnd < new Date();
                      return (
                        <tr key={am.id}>
                          <td>{getMemberName(am.memberId)}</td>
                          <td>{am.availabilityStatus}</td>
                          <td>
                            {(() => {
                              const ordered = getPreferredRolesOrdered(am);
                              return ordered && ordered.length > 0 ? (
                                <div>
                                  {ordered.map((role, index) => (
                                    <div key={`${role.roleId || index}`} className="mb-1">
                                      <small className="badge bg-secondary me-2">
                                        {index === 0 ? '1st' : index === 1 ? '2nd' : '3rd'}
                                      </small>
                                      <span>{role.roleName}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted">No preferences</span>
                              );
                            })()}
                          </td>
                          <td>
                            {assigned && assigned.length > 0 
                              ? (
                                  <div>
                                    {assigned.map((role, index) => (
                                      <div key={index} className="d-flex justify-content-between align-items-center">
                                        <span>{role.roleName}</span>
                                        {isVPEducation && !isPastMeeting && (
                                          <button 
                                            className="btn btn-sm btn-outline-danger ms-2 p-0"
                                            style={{ width: '24px', height: '24px' }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteAssignedRole(role, am.memberId, role.roleName);
                                            }}
                                            title="Remove role"
                                          >
                                            <i className="bi bi-trash" style={{ fontSize: '0.75rem' }}></i>
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )
                              : "Not Assigned"
                            }
                          </td>
                          <td>
                            {isVPEducation ? (
                              <>
                                <Link
                                  to={`/available-members/edit/${am.id}`}
                                  className="btn btn-sm btn-outline-primary me-2"
                                >
                                  Edit
                                </Link>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => deleteAvailableMember(am.id)}
                                >
                                  Delete
                                </button>
                              </>
                            ) : (
                              (() => {
                                const currentMemberId = getCurrentUserMemberId();
                                const isOwn = currentMemberId && String(am.memberId) === String(currentMemberId);
                                if (isOwn) {
                                  return (
                                    <>
                                      <Link
                                        to={`/available-members/edit/${am.id}`}
                                        className="btn btn-sm btn-outline-primary me-2"
                                      >
                                        Edit
                                      </Link>
                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => deleteAvailableMember(am.id)}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  );
                                }
                                return <span className="text-muted">No actions available</span>;
                              })()
                            )}
                          </td>
{isVPEducation && (
                            <td>
                              <select
                                className="form-select me-2"
                                value=""
                                disabled={isPastMeeting}
                                onChange={(e) => {
                                  // Role assignment for meeting-specific instances
                                  if (e.target.value) {
                                    handleAssignRole(currentMeetingId, am.memberId, e.target.value);
                                    // Reset dropdown after assignment
                                    e.target.value = "";
                                  }
                                }}
                                >
                                <option value="">Select a Role</option>
                                {(() => {
                                  // Build consolidated base-role options with remaining/total
                                  const meetingRoleList = meetingRoles[currentMeetingId] || [];
                                  const allAssignedRoles = Object.values(assignedRoles[currentMeetingId] || {}).flatMap(roles => roles);

                                  const norm = (v) => String(v ?? '').replace(/^R/i, '');

                                  // Group meeting roles by base role
                                  const groups = new Map();
                                  for (const mr of meetingRoleList) {
                                    const baseIdRaw = mr.baseRoleId || mr.roleId || mr.role?.roleId;
                                    const baseId = norm(baseIdRaw);
                                    if (!baseId) continue;
                                    if (!groups.has(baseId)) {
                                      // Try to find base role name from allRoles
                                      const baseRole = allRoles.find(r => norm(r.roleId) === baseId);
                                      const baseName = baseRole?.roleName || mr.role?.roleName || mr.roleName || 'Role';
                                      groups.set(baseId, { baseId, name: baseName, total: 0 });
                                    }
                                    groups.get(baseId).total += 1;
                                  }

                                  // Compute assigned counts per base role (map instance IDs via meetingRoles)
                                  for (const a of allAssignedRoles) {
                                    const assignedBase = mapAssignedToBaseId(currentMeetingId, a.roleId);
                                    const g = groups.get(assignedBase);
                                    if (g) g.assigned = (g.assigned || 0) + 1;
                                  }

                                  // Build options with remaining > 0
                                  const options = [];
                                  for (const g of groups.values()) {
                                    const assigned = g.assigned || 0;
                                    const remaining = Math.max((g.total || 0) - assigned, 0);
                                    if (remaining > 0) {
                                      const displayName = `${g.name} (${remaining}/${g.total} left)`;
                                      options.push({ value: g.baseId, label: displayName });
                                    }
                                  }

                                  // Sort alphabetically by name for neatness
                                  options.sort((a, b) => a.label.localeCompare(b.label));

                                  return options.map(opt => (
                                    <option key={`${opt.value}-${am.memberId}`} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ));
                                })()}
                              </select>
                              {isPastMeeting && (
                                <small className="text-muted">Assignment disabled for past meetings.</small>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="alert alert-info text-center">
          No availability records found.
        </div>
      )}
    </div>
  );
}

export default AvailableMembersTable;