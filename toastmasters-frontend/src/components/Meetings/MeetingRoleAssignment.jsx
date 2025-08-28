import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Grid, 
  Typography,
  Chip,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import roleService from '../../api/roleservice';

const MeetingRoleAssignment = ({ meetingCategory, onRolesUpdate, initialRoles = [] }) => {
  const [openAddRoleDialog, setOpenAddRoleDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [availableRoles, setAvailableRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [assignedRoles, setAssignedRoles] = useState(initialRoles || []);

  // Handle initial roles
  useEffect(() => {
    if (initialRoles && initialRoles.length > 0) {
      // Make sure we have proper role objects
      const roles = initialRoles.map(role => ({
        roleId: role.roleId || role.id,
        roleName: role.roleName || role.name || 'Unnamed Role',
        isCustom: role.isCustom || (role.roleId && role.roleId.startsWith('custom_'))
      }));
      setAssignedRoles(roles);
    } else {
      setAssignedRoles([]);
    }
  }, [initialRoles]);

  // Fetch and filter roles based on meeting category
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        console.log('Fetching roles for category:', meetingCategory);
        const response = await roleService.getAllRoles();
        console.log('Roles API Response:', response);
        
        // Handle different possible response structures
        let roles = [];
        if (Array.isArray(response)) {
          roles = response;
        } else if (response && response.data) {
          roles = Array.isArray(response.data) ? response.data : 
                 (response.data.data || []);
        }
        
        console.log('Extracted roles:', roles);
        
        // Filter roles based on meeting category
        const filteredRoles = roles.filter(role => {
          if (!role) return false;
          
          // Always include custom roles
          if (role.isCustom) return true;
          
          // If no category, include only for SHARED_ALL_MEETINGS
          if (!role.category) {
            return meetingCategory === 'SHARED_ALL_MEETINGS';
          }
          
          const category = (role.category || '').toUpperCase().trim();
          const meetingCat = (meetingCategory || '').toUpperCase().trim();
          
          console.log(`Checking role ${role.roleName} (${category}) for meeting type: ${meetingCat}`);
          
          if (meetingCat === 'REGULAR') {
            return category === 'SHARED_ALL_MEETINGS' || 
                   category === 'REGULAR_AND_SPECIAL_MEETINGS';
          } else if (meetingCat === 'CONTEST') {
            return category === 'CONTEST_MEETING_ONLY' || 
                   category === 'SHARED_ALL_MEETINGS';
          } else {
            return category === 'SHARED_ALL_MEETINGS';
          }
        });
        
        console.log('Filtered roles for', meetingCategory, ':', filteredRoles);
        setAvailableRoles(filteredRoles);
      } catch (error) {
        console.error('Error fetching roles:', error);
        // Set empty array on error to prevent undefined errors
        setAvailableRoles([]);
      }
    };

    fetchRoles();
  }, [meetingCategory]);

  const handleAddCustomRole = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    const trimmedName = newRoleName.trim();
    if (!trimmedName) return;
    
    try {
      // Check if a role with this name already exists
      if (assignedRoles.some(r => r.roleName.toLowerCase() === trimmedName.toLowerCase())) {
        alert('A role with this name already exists');
        return;
      }

      const newRole = {
        roleId: `custom_${Date.now()}`,
        roleName: trimmedName,
        roleDescription: newRoleDescription.trim(),
        isCustom: true,
        category: meetingCategory || 'CUSTOM'
      };
      
      // Add to available roles first
      setAvailableRoles(prev => [...prev, newRole]);
      
      // Then add to assigned roles
      const newAssignedRoles = [...assignedRoles, newRole];
      setAssignedRoles(newAssignedRoles);
      
      // Update parent with full role objects
      onRolesUpdate(newAssignedRoles);
      
      // Reset and close
      setNewRoleName('');
      setNewRoleDescription('');
      setSelectedRoleId('');
      setOpenAddRoleDialog(false);
    } catch (error) {
      console.error('Error adding custom role:', error);
      alert('Failed to add custom role. Please try again.');
    }
  };

  const handleAddRole = (e) => {
    e?.preventDefault();
    if (!selectedRoleId) return;
    
    const roleToAdd = availableRoles.find(r => r.roleId === selectedRoleId);
    if (roleToAdd) {
      // Check if role is already assigned
      if (assignedRoles.some(r => r.roleId === selectedRoleId)) {
        return; // Don't add duplicate roles
      }
      
      const newAssignedRoles = [...assignedRoles, roleToAdd];
      setAssignedRoles(newAssignedRoles);
      // Pass full role objects to parent
      onRolesUpdate(newAssignedRoles);
      setSelectedRoleId('');
    }
  };

  const handleRemoveRole = (roleIdToRemove) => {
    const newAssignedRoles = assignedRoles.filter(role => role.roleId !== roleIdToRemove);
    setAssignedRoles(newAssignedRoles);
    // Update parent with full role objects
    onRolesUpdate(newAssignedRoles);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Assign Meeting Roles
      </Typography>
      
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={5}>
          <FormControl fullWidth size="small">
            <InputLabel>Select Role</InputLabel>
            <Select
              value={selectedRoleId || ''}
              label="Select Role"
              onChange={(e) => setSelectedRoleId(e.target.value)}
              displayEmpty
              renderValue={(selected) => {
                if (!selected) return <em>Select a role</em>;
                const role = availableRoles.find(r => r.roleId === selected);
                return role ? role.roleName : '';
              }}
            >
              <MenuItem value="" disabled>
                <em>Select a role</em>
              </MenuItem>
              {availableRoles.length > 0 ? (
              availableRoles.map((role) => (
                <MenuItem key={role.roleId} value={role.roleId}>
                  {role.roleName} {role.isCustom && '(Custom)'}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>No roles available for this meeting type</MenuItem>
            )}
              <MenuItem 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpenAddRoleDialog(true);
                }}
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <AddCircleOutlineIcon sx={{ mr: 1 }} />
                Add Custom Role
              </MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={2}>
          <Button 
            variant="contained" 
            onClick={handleAddRole}
            fullWidth
            disabled={!selectedRoleId}
          >
            Add Role
          </Button>
        </Grid>
        
        <Grid item xs={12}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Assigned Roles:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {assignedRoles.length > 0 ? (
                assignedRoles.map((role) => (
                  <Chip
                    key={role.roleId}
                    label={role.roleName}
                    onDelete={() => handleRemoveRole(role.roleId)}
                    color="primary"
                    variant="outlined"
                    sx={{ m: 0.5 }}
                  />
                ))
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No roles assigned yet
                </Typography>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Add Custom Role Dialog */}
      <Dialog 
        open={openAddRoleDialog} 
        onClose={() => setOpenAddRoleDialog(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAddCustomRole(e);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <DialogTitle>Add Custom Role</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, minWidth: 400 }}>
              <TextField
                fullWidth
                label="Role Name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                margin="normal"
                required
                autoFocus
              />
              <TextField
                fullWidth
                label="Description (Optional)"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                margin="normal"
                multiline
                rows={3}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              type="button" 
              onClick={(e) => {
                e.stopPropagation();
                setOpenAddRoleDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              variant="contained"
              disabled={!newRoleName.trim()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddCustomRole(e);
              }}
            >
              Add Role
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
};

export default MeetingRoleAssignment;
