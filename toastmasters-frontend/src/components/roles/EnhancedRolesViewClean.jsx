import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Close';
import { useNavigate, useLocation } from 'react-router-dom';
import roleService from '../../api/roleService';
import { useAuth } from '../../context/AuthContext';
import {
  MEETING_CATEGORIES,
  MEETING_CATEGORY_LABELS,
  ROLE_CATEGORIES,
  ROLE_CATEGORY_LABELS
} from '../../constants/meetingCategories';

/* ---------------- utils ---------------- */
const normalizeText = (val) => {
  if (val === null || val === undefined) return '';
  let s = String(val).toLowerCase().trim();
  try {
    s = s.normalize?.('NFD')?.replace(/[\u0300-\u036f]/g, '') || s;
  } catch {
    // ignore
  }
  return s.replace(/\s+/g, ' ');
};

const anyWordStartsWith = (nameNormalized, term) =>
  nameNormalized.split(' ').some((word) => word.startsWith(term));

/* ---------------- component ---------------- */
const EnhancedRolesViewClean = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('NONE');
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const { isVPEducation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const stickyHeaderOffset = 72;

  const normalizeRoleCategory = (cat) => {
    if (!cat && cat !== '') return '';
    const v = String(cat || '').toUpperCase();
    if (Object.values(ROLE_CATEGORIES).includes(v)) return v;
    if (v.includes('SHARED')) return ROLE_CATEGORIES.SHARED_ALL_MEETINGS;
    if (v.includes('REGULAR')) return ROLE_CATEGORIES.REGULAR_ONLY;
    if (v.includes('CONTEST')) return ROLE_CATEGORIES.CONTEST_ONLY;
    if (v.includes('SPECIAL')) return ROLE_CATEGORIES.SPECIAL_ONLY;
    return '';
  };

  const isVPExecutiveRole = (name) => {
    const n = normalizeText(name);
    return (
      n.includes('vp education') ||
      n.includes('vice president education') ||
      n.includes('vp membership') ||
      n.includes('vice president membership')
    );
  };

  const isSpeakerRole = (name) => normalizeText(name) === 'speaker';
  const isBallotCounterRole = (name) => {
    const n = normalizeText(name);
    return n === 'ballot counter' || n === 'ballotcounter';
  };

  const handleAdd = () => navigate('/roles/add');
  const handleEdit = (id) => navigate(`/roles/edit/${id}`);
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    try {
      await roleService.deleteRole(id);
      setRoles((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || 'Failed to delete role');
    }
  };

  /* ---------- fetch & normalize ---------- */
  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError('');
      const rolesArray = await roleService.getAllRoles();

      if (!Array.isArray(rolesArray) || rolesArray.length === 0) {
        setRoles([]);
        return;
      }

      const normalized = rolesArray.map((r) => ({
        id: r.id || r.roleId || Math.random().toString(36).slice(2),
        name: r.name || r.roleName || 'Unnamed Role',
        description: r.description || r.roleDescription || 'No description',
        category: r.category || r.roleCategory || '',
        nameNormalized: normalizeText(r.name || r.roleName || ''),
        required: r.required ?? r.isRequired ?? false,
      }));

      setRoles(normalized);
    } catch (e) {
      setError(e?.message || 'Failed to load roles');
      console.warn('[Roles] fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  /* ---------- category filtering ---------- */
  const filteredRoles = useMemo(() => {
    if (selectedFilter === 'NONE' || selectedFilter === 'ALL') return roles;

    if (selectedFilter === ROLE_CATEGORIES.SHARED_ALL_MEETINGS) {
      return roles
        .filter(
          (r) =>
            normalizeRoleCategory(r.category) === ROLE_CATEGORIES.SHARED_ALL_MEETINGS ||
            isSpeakerRole(r.name)
        )
        .filter((r) => !isVPExecutiveRole(r.name));
    }

    if (selectedFilter === MEETING_CATEGORIES.REGULAR) {
      return roles.filter((r) => {
        const cat = normalizeRoleCategory(r.category);
        const inRegular =
          cat === ROLE_CATEGORIES.REGULAR_ONLY ||
          cat === ROLE_CATEGORIES.SHARED_ALL_MEETINGS ||
          cat === ROLE_CATEGORIES.REGULAR_AND_SPECIAL;
        return inRegular && !isVPExecutiveRole(r.name);
      });
    }

    if (selectedFilter === MEETING_CATEGORIES.SPECIAL) {
      return roles
        .filter((r) => {
          const cat = normalizeRoleCategory(r.category);
          return (
            cat === ROLE_CATEGORIES.SPECIAL_ONLY ||
            cat === ROLE_CATEGORIES.REGULAR_AND_SPECIAL
          );
        })
        .filter((r) => !isVPExecutiveRole(r.name));
    }

    if (selectedFilter === MEETING_CATEGORIES.CONTEST) {
      return roles
        .filter(
          (r) =>
            normalizeRoleCategory(r.category) === ROLE_CATEGORIES.CONTEST_ONLY ||
            isBallotCounterRole(r.name)
        )
        .filter((r) => !isVPExecutiveRole(r.name));
    }

    return roles;
  }, [roles, selectedFilter]);

  /* ---------- search + sort ---------- */
  const displayedRoles = useMemo(() => {
    const term = normalizeText(search);
    const sortByName = (arr) =>
      arr
        .slice()
        .sort((a, b) =>
          sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
        );

    if (!term) return sortByName(filteredRoles);

    const starts = [];
    const contains = [];

    for (const r of filteredRoles) {
      const nm = r.nameNormalized || normalizeText(r.name || '');
      if (!nm) continue;

      if (nm.startsWith(term) || anyWordStartsWith(nm, term)) {
        starts.push(r);
      } else if (nm.includes(term)) {
        contains.push(r);
      }
    }

    return [...sortByName(starts), ...sortByName(contains)];
  }, [filteredRoles, search, sortAsc]);

  return (
    <Box sx={{ p: 4 }}>
      {/* Top bar */}
      <div
        className="sticky-top"
        style={{
          background: 'rgba(255,255,255,0.95)',
          padding: '8px 12px',
          zIndex: 10,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
            Roles Management
          </Typography>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              size="small"
              variant="outlined"
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="clear search"
                      onClick={() => setSearch('')}
                      edge="end"
                      size="small"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{ width: 320 }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSortAsc((s) => !s)}
            >
              Sort: {sortAsc ? 'A→Z' : 'Z→A'}
            </Button>
            {isVPEducation && (
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAdd}
            >
              Add Role
            </Button>
          )}
          <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={fetchRoles}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </Stack>
        </Stack>
      </div>

      {/* Filter controls */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 2, mt: 2 }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel id="roles-category-filter-label">Filter by</InputLabel>
          <Select
            labelId="roles-category-filter-label"
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
          >
            <MenuItem value="NONE">Please select a meeting category</MenuItem>
            <MenuItem value={MEETING_CATEGORIES.REGULAR}>
              {MEETING_CATEGORY_LABELS[MEETING_CATEGORIES.REGULAR]}
            </MenuItem>
            <MenuItem value={MEETING_CATEGORIES.SPECIAL}>
              {MEETING_CATEGORY_LABELS[MEETING_CATEGORIES.SPECIAL]}
            </MenuItem>
            <MenuItem value={MEETING_CATEGORIES.CONTEST}>
              {MEETING_CATEGORY_LABELS[MEETING_CATEGORIES.CONTEST]}
            </MenuItem>
            <MenuItem value={ROLE_CATEGORIES.SHARED_ALL_MEETINGS}>
              All Meetings (Shared roles)
            </MenuItem>
            <MenuItem value="ALL">All Roles</MenuItem>
          </Select>
        </FormControl>
        {!loading && (
          <Typography variant="body2" color="text.secondary">
            Showing roles for: {selectedFilter === 'NONE' ? '—' : selectedFilter}
          </Typography>
        )}
      </Stack>

      {/* Table */}
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}
      {!loading && error && <Alert severity="warning">{error}</Alert>}

      {!loading && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <div className="table-responsive">
            <table className="table table-striped table-hover table-bordered shadow-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead className="table-dark">
                <tr>
                  <th style={{ position: 'sticky', top: 0, background: '#212529', color: '#fff', width: 220, whiteSpace: 'nowrap', fontWeight: 700, zIndex: 3 }}>Name</th>
                  <th style={{ position: 'sticky', top: 0, background: '#212529', color: '#fff', whiteSpace: 'nowrap', fontWeight: 700, zIndex: 3 }}>Description</th>
                  <th style={{ position: 'sticky', top: 0, background: '#212529', color: '#fff', width: 220, whiteSpace: 'nowrap', fontWeight: 700, zIndex: 3 }}>Category</th>
                  <th className="text-end" style={{ position: 'sticky', top: 0, background: '#212529', color: '#fff', width: 150, whiteSpace: 'nowrap', fontWeight: 700, zIndex: 3 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedRoles.map((role) => (
                  <tr key={role.id}>
                    <td>{role.name}</td>
                    <td>
                      <div className="text-truncate" style={{ maxWidth: 420 }} title={role.description || ''}>
                        {role.description}
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const norm = normalizeRoleCategory(role.category);
                        const label =
                          norm && ROLE_CATEGORY_LABELS[norm]
                            ? ROLE_CATEGORY_LABELS[norm]
                            : 'None';
                        const badgeClass = (() => {
                          switch (norm) {
                            case ROLE_CATEGORIES.SHARED_ALL_MEETINGS:
                              return 'bg-secondary';
                            case ROLE_CATEGORIES.REGULAR_ONLY:
                              return 'bg-primary';
                            case ROLE_CATEGORIES.SPECIAL_ONLY:
                              return 'bg-warning text-dark';
                            case ROLE_CATEGORIES.CONTEST_ONLY:
                              return 'bg-danger';
                            case ROLE_CATEGORIES.REGULAR_AND_SPECIAL:
                              return 'bg-success';
                            default:
                              return 'bg-light text-dark';
                          }
                        })();
                        return (
                          <span className={`badge rounded-pill ${badgeClass}`}>
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => handleEdit(role.id)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDelete(role.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {displayedRoles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center">
                      No roles found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Paper>
      )}
    </Box>
  );
};

export default EnhancedRolesViewClean;
