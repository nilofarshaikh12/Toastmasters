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
import CloseIcon from '@mui/icons-material/Close';
import roleService from '../../api/roleservice';

const MeetingRoleAssignment = ({ meetingCategory, onRolesUpdate, initialRoles = [] }) => {
  const [openAddRoleDialog, setOpenAddRoleDialog] = useState(false);
  const [openInstanceDialog, setOpenInstanceDialog] = useState(false);
  const [instanceCount, setInstanceCount] = useState(1);
  const [roleForInstances, setRoleForInstances] = useState(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [availableRoles, setAvailableRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
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

  // Reset assigned roles when meeting category changes
  useEffect(() => {
    setAssignedRoles([]);
    onRolesUpdate([]);
  }, [meetingCategory]);

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
          
          // Normalize category values for comparison
          const category = (role.category || '').toString().toUpperCase().trim();
          const meetingCat = (meetingCategory || '').toString().toUpperCase().replace('_MEETING', '');
          
          console.log('Role details:', {
            roleName: role.roleName,
            roleCategory: category,
            meetingCategory: meetingCat,
            isCustom: role.isCustom
          });
          
          // Define role category mappings
          const roleCategories = {
            // Contest Meeting Roles
            'CONTEST': ['CONTEST_MEETING_ONLY', 'CONTEST', 'CONTEST_MEETING'],
            'CONTESTANT': ['CONTEST_MEETING_ONLY', 'CONTEST', 'CONTEST_MEETING'],
            'BALLOT_COUNTER': ['CONTEST_MEETING_ONLY', 'CONTEST', 'CONTEST_MEETING'],
            'JUDGE': ['CONTEST_MEETING_ONLY', 'CONTEST', 'CONTEST_MEETING'],
            
            // Regular Meeting Roles
            'SPEAKER': ['REGULAR_AND_SPECIAL_MEETINGS', 'REGULAR', 'REGULAR_MEETING'],
            'EVALUATOR': ['REGULAR_AND_SPECIAL_MEETINGS', 'REGULAR', 'REGULAR_MEETING'],
            'TABLE_TOPICS_MASTER': ['REGULAR_AND_SPECIAL_MEETINGS', 'REGULAR', 'REGULAR_MEETING'],
            'GENERAL_EVALUATOR': ['REGULAR_AND_SPECIAL_MEETINGS', 'REGULAR', 'REGULAR_MEETING'],
            
            // Shared Roles (appear in all meeting types)
            'TIMER': ['SHARED_ALL_MEETINGS'],
            'GRAMMARIAN': ['SHARED_ALL_MEETINGS'],
            'AH_COUNTER': ['SHARED_ALL_MEETINGS'],
            'TOASTMASTER': ['SHARED_ALL_MEETINGS'],
            'TOM': ['SHARED_ALL_MEETINGS'],
            'SERGEANT_AT_ARMS': ['SHARED_ALL_MEETINGS']
          };
          
          // Check if role matches the meeting type
          const roleName = role.roleName.toUpperCase().replace(/\s+/g, '_');
          const roleCategory = roleCategories[roleName] || [];
          
          // Check if role is allowed for this meeting type
          const isMatch = roleCategory.some(cat => {
            if (meetingCat === 'REGULAR') {
              return cat.includes('REGULAR') || cat === 'SHARED_ALL_MEETINGS';
            } else if (meetingCat === 'CONTEST') {
              return cat.includes('CONTEST') || cat === 'SHARED_ALL_MEETINGS';
            } else if (meetingCat === 'SPECIAL') {
              return cat.includes('SPECIAL') || cat === 'SHARED_ALL_MEETINGS' || cat.includes('REGULAR');
            }
            return cat === 'SHARED_ALL_MEETINGS';
          });
          
          console.log(`Role ${role.roleName} (${category}) for ${meetingCat}: ${isMatch ? 'MATCH' : 'NO MATCH'}`);
          return isMatch || category === 'SHARED_ALL_MEETINGS';
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

  const handleRemoveRole = (roleId) => {
    // Get the base role ID (without instance number)
    const roleParts = roleId.split('_');
    const baseRoleId = roleParts[0]; // Just get the role ID part (e.g., 'R9' from 'R9_1')
    const isInstanceRole = roleParts.length > 1;
    
    // Remove the role
    const updatedRoles = assignedRoles.filter(role => role.roleId !== roleId);
    
    if (isInstanceRole) {
      // Get the original role from availableRoles to maintain role details
      const originalRole = availableRoles.find(r => r.roleId === baseRoleId);
      
      if (originalRole) {
        // Get all instances of this role and sort them by instance number
        const roleInstances = updatedRoles
          .filter(role => {
            const currentBaseId = role.roleId.split('_')[0];
            return currentBaseId === baseRoleId;
          })
          .sort((a, b) => {
            const aNum = parseInt(a.roleId.split('_')[1] || '0', 10);
            const bNum = parseInt(b.roleId.split('_')[1] || '0', 10);
            return aNum - bNum;
          });
        
        // Rename remaining instances to maintain sequential numbering starting from 1
        const renumberedRoles = updatedRoles.map(role => {
          const currentBaseId = role.roleId.split('_')[0];
          if (currentBaseId === baseRoleId) {
            const instanceIndex = roleInstances.findIndex(r => r.roleId === role.roleId);
            if (instanceIndex >= 0) {
              const newInstanceNum = instanceIndex + 1;
              const newRoleId = `${baseRoleId}_${newInstanceNum}`;
              return {
                ...role,
                roleId: newRoleId,
                roleName: `${originalRole.roleName} ${newInstanceNum}`,
                instanceNumber: newInstanceNum
              };
            }
          }
          return role;
        });
        
        setAssignedRoles(renumberedRoles);
        onRolesUpdate(renumberedRoles);
        return;
      }
    }
    
    // For non-instance roles or if original role not found, just update the state
    setAssignedRoles(updatedRoles);
    onRolesUpdate(updatedRoles);
  };

  const handleAddCustomRole = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    const trimmedName = newRoleName.trim();
    if (!trimmedName) return;
    
    // Ensure we have a valid meeting category
    if (!meetingCategory) {
      alert('Please select a meeting category first');
      return;
    }
    
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
          category: meetingCategory.toUpperCase(),
          meetingSpecific: true
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
      setOpenAddRoleDialog(false);
    } catch (error) {
      console.error('Error adding custom role:', error);
      alert('Failed to add custom role. Please try again.');
    }
  };

  const handleAddRole = (e) => {
    e.preventDefault();
    if (!selectedRole) return;

    const roleKey = selectedRole.roleName.toUpperCase().replace(/\s+/g, '_');
    const meetingType = meetingCategory.toUpperCase();
    
    // Define which roles should have instances based on meeting type
    const regularMeetingMultiInstance = ['SPEAKER', 'EVALUATOR'];
    const contestMeetingMultiInstance = ['TIMER', 'BALLOT_COUNTER', 'CONTESTANT', 'EVALUATOR'];
    const specialMeetingMultiInstance = ['SPEAKER', 'EVALUATOR'];
    
    // Check if the role should have multiple instances based on meeting type
    let shouldHaveInstances = false;
    
    if (meetingType === 'REGULAR_MEETING' && regularMeetingMultiInstance.includes(roleKey)) {
      shouldHaveInstances = true;
    } else if (meetingType === 'CONTEST_MEETING' && contestMeetingMultiInstance.includes(roleKey)) {
      shouldHaveInstances = true;
    } else if (meetingType === 'SPECIAL_MEETING' && specialMeetingMultiInstance.includes(roleKey)) {
      shouldHaveInstances = true;
    }
    
    if (shouldHaveInstances) {
      setRoleForInstances(selectedRole);
      setOpenInstanceDialog(true);
    } else {
      // For single-instance roles
      addRoleInstances(selectedRole, 1);
    }
    setSelectedRole('');
  };

  const addRoleInstances = (role, count) => {
    const newInstances = [];
    const existingInstances = assignedRoles.filter(r => r.roleId.startsWith(role.roleId));
    const startIndex = existingInstances.length + 1;

    for (let i = 0; i < count; i++) {
      const instanceNum = startIndex + i;
      newInstances.push({
        ...role,
        roleId: `${role.roleId}_${instanceNum}`,
        roleName: `${role.roleName} ${instanceNum}`,
        instanceNumber: instanceNum,
        originalRoleId: role.roleId
      });
    }

    const newAssignedRoles = [...assignedRoles, ...newInstances];
    setAssignedRoles(newAssignedRoles);
    // Update parent with full role objects
    onRolesUpdate(newAssignedRoles);
  };

  // Get base roles (without instance numbers) to track which roles are already assigned
  const getBaseRoleId = (roleId) => {
    // For roles with instance numbers (e.g., 'R9_1' or 'TIMER_2'), get the base ID
    const parts = roleId.split('_');
    // If it's a role with an instance number (e.g., 'R9_1'), return just 'R9'
    if (parts.length > 1 && !isNaN(parts[1])) {
      return parts[0];
    }
    // Otherwise return the full ID (for non-instance roles)
    return roleId;
  };
  
  // Only consider a role fully assigned if it's not a multi-instance role or if it's a custom role
  const isRoleAssigned = (role) => {
    // Check if this is a multi-instance role that should allow multiple instances
    const isMultiInstanceRole = ['SPEAKER', 'EVALUATOR', 'TIMER', 'BALLOT_COUNTER', 'CONTESTANT']
      .some(roleType => role.roleName.toUpperCase().includes(roleType));
    
    // If it's a multi-instance role, it's never fully assigned (can always add more)
    if (isMultiInstanceRole) {
      return false;
    }
    
    // For non-multi-instance roles, check if it's already assigned
    const baseRoleId = getBaseRoleId(role.roleId);
    return assignedRoles.some(r => getBaseRoleId(r.roleId) === baseRoleId);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mt: 3, width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Assign Meeting Roles
      </Typography>
      
      {/* Instance Count Dialog */}
      <Dialog open={openInstanceDialog} onClose={() => setOpenInstanceDialog(false)}>
        <DialogTitle>Add Multiple {roleForInstances?.roleName} Roles</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Number of Instances"
            type="number"
            fullWidth
            value={instanceCount}
            onChange={(e) => setInstanceCount(Math.max(1, parseInt(e.target.value) || 1))}
            inputProps={{ min: 1, max: 10 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInstanceDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              addRoleInstances(roleForInstances, instanceCount);
              setOpenInstanceDialog(false);
            }}
            variant="contained"
            color="primary"
          >
            Add {instanceCount} {instanceCount === 1 ? 'Instance' : 'Instances'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Box sx={{ width: '100%' }}>
        <Box sx={{ 
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' },
          alignItems: 'center',
          width: '100%'
        }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Role</InputLabel>
            <Select
              value={selectedRole?.roleId || ''}
              onChange={(e) => {
                const role = availableRoles.find(r => r.roleId === e.target.value);
                setSelectedRole(role || null);
              }}
              label="Select Role"
            >
              {availableRoles
                .filter(role => !isRoleAssigned(role))
                .map((role) => (
                  <MenuItem key={role.roleId} value={role.roleId}>
                    {role.roleName}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          
          <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
            <Button 
              variant="contained" 
              onClick={handleAddRole}
              fullWidth
              disabled={!selectedRole}
              sx={{ flex: 2 }}
            >
              Add Role
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => setOpenAddRoleDialog(true)}
              startIcon={<AddCircleOutlineIcon />}
              sx={{ flex: 1 }}
            >
              Custom
            </Button>
          </Box>
        </Box>
        
        <Box sx={{ mt: 2, width: '100%' }}>
          <Typography variant="subtitle2" gutterBottom>
            Assigned Roles:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {assignedRoles.map((role) => (
                  <Box key={role.roleId}>
                    <Chip
                    label={role.roleName}
                    onDelete={() => handleRemoveRole(role.roleId)}
                    color="primary"
                    variant="outlined"
                    deleteIcon={
                      <Tooltip title="Remove role">
                        <CloseIcon />
                      </Tooltip>
                    }
                    sx={{
                      '& .MuiChip-deleteIcon': {
                        color: 'inherit',
                        '&:hover': {
                          color: 'inherit',
                          opacity: 0.8,
                        },
                      },
                    }}
                  />
                  </Box>
                ))}
              </Box>
            </Box>
      </Box>

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
