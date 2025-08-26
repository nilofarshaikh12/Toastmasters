import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Paper, Button, Stack, Chip, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import roleService from '../../api/roleService';
import { MEETING_CATEGORIES, MEETING_CATEGORY_LABELS, ROLE_CATEGORIES, ROLE_CATEGORY_LABELS } from '../../constants/meetingCategories';

const EnhancedRolesViewClean = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('NONE'); // NONE | MEETING_* | SHARED
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const stickyHeaderOffset = 72; // px, aligns table headers under sticky toolbar

  // Normalize role category values from API into known ROLE_CATEGORIES
  const normalizeRoleCategory = (cat) => {
    if (cat === null || cat === undefined || cat === '') return ''; // represent None distinctly
    const v = String(cat).toUpperCase();
    // Exact match first
    if (Object.values(ROLE_CATEGORIES).includes(v)) return v;
    // Common aliases
    if (v.includes('SHARED')) return ROLE_CATEGORIES.SHARED_ALL_MEETINGS;
    if (v.includes('REGULAR')) return ROLE_CATEGORIES.REGULAR_ONLY;
    if (v.includes('CONTEST')) return ROLE_CATEGORIES.CONTEST_ONLY;
    if (v.includes('SPECIAL')) return ROLE_CATEGORIES.SPECIAL_ONLY;
    return '';
  };

  // Identify VP roles without category that should appear only in "All Roles"
  const isVPExecutiveRole = (name) => {
    if (!name) return false;
    const n = String(name).toLowerCase();
    return n.includes('vp education') || n.includes('vice president education') ||
           n.includes('vp membership') || n.includes('vice president membership');
  };

  // Identify Speaker role by name (case-insensitive)
  const isSpeakerRole = (name) => {
    if (!name) return false;
    return String(name).toLowerCase() === 'speaker';
  };

  // Identify Ballot Counter role by name (case-insensitive)
  const isBallotCounterRole = (name) => {
    if (!name) return false;
    const n = String(name).toLowerCase();
    return n === 'ballot counter' || n === 'ballotcounter';
  };

  const handleAdd = () => navigate('/roles/add');
  const handleEdit = (id) => navigate(`/roles/edit/${id}`);
  const handleDelete = async (id) => {
    const ok = window.confirm('Are you sure you want to delete this role?');
    if (!ok) return;
    try {
      await roleService.deleteRole(id);
      setRoles(prev => prev.filter(r => r.id !== id && r.roleId !== id));
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || 'Failed to delete role');
    }
  };

  // Memoized filtered roles based on selected filter
  const filteredRoles = useMemo(() => {
    if (selectedFilter === 'NONE') return null; // prompt user
    if (selectedFilter === 'ALL') return roles;
    if (selectedFilter === ROLE_CATEGORIES.SHARED_ALL_MEETINGS) {
      return roles
        .filter(r => normalizeRoleCategory(r.category) === ROLE_CATEGORIES.SHARED_ALL_MEETINGS || isSpeakerRole(r.name))
        .filter(r => !isVPExecutiveRole(r.name));
    }
    // Per request: Regular should include Shared roles (copy shared into regular view)
    if (selectedFilter === MEETING_CATEGORIES.REGULAR) {
      return roles.filter(r => {
        const cat = normalizeRoleCategory(r.category);
        const inRegular = cat === ROLE_CATEGORIES.REGULAR_ONLY || cat === ROLE_CATEGORIES.SHARED_ALL_MEETINGS || cat === ROLE_CATEGORIES.REGULAR_AND_SPECIAL;
        return inRegular && !isVPExecutiveRole(r.name);
      });
    }
    if (selectedFilter === MEETING_CATEGORIES.SPECIAL) {
      return roles
        .filter(r => {
          const cat = normalizeRoleCategory(r.category);
          return cat === ROLE_CATEGORIES.SPECIAL_ONLY || cat === ROLE_CATEGORIES.REGULAR_AND_SPECIAL;
        })
        .filter(r => !isVPExecutiveRole(r.name));
    }
    if (selectedFilter === MEETING_CATEGORIES.CONTEST) {
      return roles
        .filter(r => normalizeRoleCategory(r.category) === ROLE_CATEGORIES.CONTEST_ONLY || isBallotCounterRole(r.name))
        .filter(r => !isVPExecutiveRole(r.name));
    }
    return roles;
  }, [roles, selectedFilter]);

  // Apply search and sort
  const displayedRoles = useMemo(() => {
    if (!filteredRoles) return null;
    const term = search.trim().toLowerCase();
    let list = filteredRoles.filter(r =>
      !term || r.name.toLowerCase().includes(term) || (r.description || '').toLowerCase().includes(term)
    );
    list = list.slice().sort((a, b) => {
      return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    });
    return list;
  }, [filteredRoles, search, sortAsc]);

  // Minimal mock fallback
  const mockRoles = [
    { id: 1, name: 'Toastmaster', description: 'Run the meeting' },
    { id: 2, name: 'Timer', description: 'Track time' },
    { id: 3, name: 'Ah Counter', description: 'Track filler words' }
  ];

  const fetchRoles = async () => {
    console.log('[Roles] Fetching roles...');
      try {
        setLoading(true);
        setError('');
        const res = await roleService.getAllRoles();

        let rolesArray = [];
        if (Array.isArray(res)) {
          rolesArray = res;
        } else if (res?.data) {
          if (Array.isArray(res.data)) rolesArray = res.data;
          else if (Array.isArray(res.data?.data)) rolesArray = res.data.data;
          else if (typeof res.data === 'object') {
            const maybeArray = Object.values(res.data).find(Array.isArray);
            if (maybeArray) rolesArray = maybeArray;
          }
        }

        console.log('[Roles] Raw roles length:', Array.isArray(rolesArray) ? rolesArray.length : 'N/A');
        if (!Array.isArray(rolesArray) || rolesArray.length === 0) {
          setRoles(mockRoles);
          console.log('[Roles] Using mock roles');
          return;
        }

        const normalized = rolesArray.map(r => {
          const roleId = r.roleId || r.role_id || r.id;
          return {
            id: roleId || Math.random().toString(36).slice(2), // used for React key
            roleId: roleId, // preserve backend id for routing/API
            name: r.role_name || r.roleName || r.name || 'Unnamed Role',
            description: r.role_description || r.roleDescription || r.description || 'No description',
            category: (r.category ?? r.roleCategory ?? ''),
            required: r.required ?? r.isRequired ?? false,
          };
        });
        console.log('[Roles] Normalized roles length:', normalized.length);
        setRoles(normalized);
      } catch (e) {
        setError(e?.message || 'Failed to load roles');
        setRoles(mockRoles);
        console.warn('[Roles] Error fetching roles, using mock roles:', e);
      } finally {
        setLoading(false);
      }
  };

  // Fetch on mount and whenever navigation key changes (e.g., returning from edit)
  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  return (
    <Box sx={{ p: 4 }}>
      <div className="sticky-top" style={{ background: 'rgba(255,255,255,0.95)', padding: '8px 12px', zIndex: 10 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
            Roles Management
          </Typography>
          <Stack direction="row" spacing={1}>
            <div className="input-group">
              <span className="input-group-text">Search</span>
              <input
                type="text"
                className="form-control"
                placeholder="Search roles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outlined" size="small" onClick={() => setSortAsc(s => !s)}>
              Sort: {sortAsc ? 'A→Z' : 'Z→A'}
            </Button>
            <Button variant="contained" color="success" size="small" startIcon={<AddIcon />} onClick={handleAdd}>Add Role</Button>
            <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={fetchRoles} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </Stack>
        </Stack>
      </div>

      {/* Filter Controls */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, mt: 2 }} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel id="roles-category-filter-label">Filter by</InputLabel>
          <Select
            labelId="roles-category-filter-label"
            label="Filter by"
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
          >
            <MenuItem value="NONE">Please select a meeting category</MenuItem>
            <MenuItem value={MEETING_CATEGORIES.REGULAR}>{MEETING_CATEGORY_LABELS[MEETING_CATEGORIES.REGULAR]}</MenuItem>
            <MenuItem value={MEETING_CATEGORIES.SPECIAL}>{MEETING_CATEGORY_LABELS[MEETING_CATEGORIES.SPECIAL]}</MenuItem>
            <MenuItem value={MEETING_CATEGORIES.CONTEST}>{MEETING_CATEGORY_LABELS[MEETING_CATEGORIES.CONTEST]}</MenuItem>
            <MenuItem value={ROLE_CATEGORIES.SHARED_ALL_MEETINGS}>All Meetings (Shared roles)</MenuItem>
            <MenuItem value="ALL">All Roles</MenuItem>
          </Select>
        </FormControl>
        {!loading && (
          <Typography variant="body2" color="text.secondary">
            Showing roles for: {selectedFilter === 'NONE' ? '—' : selectedFilter}
          </Typography>
        )}
      </Stack>

      {/* Prompt or empty state messages */}
      {!loading && selectedFilter === 'NONE' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Please select a meeting category to filter roles.
        </Alert>
      )}

      

      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && displayedRoles && (
        <Paper variant="outlined" sx={{ bgcolor: 'background.paper', p: 2 }}>
          <div className="table-responsive">
            <table className="table table-striped table-hover table-bordered shadow-sm">
              <thead className="table-dark">
                <tr>
                  <th style={{ position: 'sticky', top: stickyHeaderOffset, zIndex: 2, background: '#212529', color: '#fff', width: 220 }}>Name</th>
                  <th style={{ position: 'sticky', top: stickyHeaderOffset, zIndex: 2, background: '#212529', color: '#fff' }}>Description</th>
                  <th style={{ position: 'sticky', top: stickyHeaderOffset, zIndex: 2, background: '#212529', color: '#fff', width: 220 }}>Category</th>
                  <th className="text-end" style={{ position: 'sticky', top: stickyHeaderOffset, zIndex: 2, background: '#212529', color: '#fff', width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedRoles.map((role) => (
                  <tr key={role.id}>
                    <td title={role.name}>{role.name}</td>
                    <td>
                      <div className="text-truncate" style={{ maxWidth: 420 }} title={role.description || ''}>
                        {role.description}
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const norm = normalizeRoleCategory(role.category);
                        const label = norm ? (ROLE_CATEGORY_LABELS[norm] || norm) : 'None';
                        const badgeClass = (() => {
                          switch (norm) {
                            case ROLE_CATEGORIES.SHARED_ALL_MEETINGS: return 'bg-secondary';
                            case ROLE_CATEGORIES.REGULAR_ONLY: return 'bg-primary';
                            case ROLE_CATEGORIES.SPECIAL_ONLY: return 'bg-warning text-dark';
                            case ROLE_CATEGORIES.CONTEST_ONLY: return 'bg-danger';
                            case ROLE_CATEGORIES.REGULAR_AND_SPECIAL: return 'bg-success';
                            default: return 'bg-light text-dark';
                          }
                        })();
                        return <span className={`badge rounded-pill ${badgeClass}`}>{label}</span>;
                      })()}
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm" role="group" aria-label="Actions">
                        <button className="btn btn-outline-primary" onClick={() => handleEdit(role.roleId || role.id)}>Edit</button>
                        <button className="btn btn-outline-danger" onClick={() => handleDelete(role.roleId || role.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {displayedRoles.length === 0 && (
                  <tr>
                    <td className="text-center" colSpan={4}>No roles found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Paper>
      )}

      {/* Empty state for selected filter with no roles */}
      {!loading && displayedRoles && displayedRoles.length === 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          No roles available for this category.
        </Alert>
      )}
    </Box>
  );
};

export default EnhancedRolesViewClean;
