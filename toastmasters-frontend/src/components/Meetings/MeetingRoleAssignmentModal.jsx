import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Grid, 
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Card,
  CardContent,
  Divider,
  Checkbox,
  FormControlLabel,
  TextField,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import roleService from '../../api/roleService';

const MeetingRoleAssignmentModal = ({ 
  open, 
  onClose, 
  meetingCategory, 
  onRolesUpdate, 
  initialRoles = [] 
}) => {
  const [availableRoles, setAvailableRoles] = useState([]);
  const [roleCounts, setRoleCounts] = useState({});
  const [customRoles, setCustomRoles] = useState([]);
  const [newCustomRole, setNewCustomRole] = useState('');
  const [newCustomRoleDescription, setNewCustomRoleDescription] = useState('');
  const [isCustomRoleEnabled, setIsCustomRoleEnabled] = useState(false);

  // Initialize role counts from initial roles
  useEffect(() => {
    if (!initialRoles || initialRoles.length === 0) {
      setRoleCounts({});
      setCustomRoles([]);
      return;
    }

    const counts = {};
    const customs = [];

    initialRoles.forEach(role => {
      if (role.isCustom) {
        const existingCustom = customs.find(c => c.name === role.roleName.replace(/\s+\d+$/, ''));
        if (existingCustom) {
          existingCustom.count++;
        } else {
          customs.push({
            id: role.roleId.split('_')[0],
            name: role.roleName.replace(/\s+\d+$/, ''),
            count: 1
          });
        }
      } else {
        const baseId = role.roleId.split('_')[0];
        counts[baseId] = (counts[baseId] || 0) + 1;
      }
    });

    setRoleCounts(counts);
    setCustomRoles(customs);
  }, [initialRoles]);

  // Fetch available roles based on meeting category
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await roleService.getAllRoles();
        let roles = [];
        
        if (Array.isArray(response)) {
          roles = response;
        } else if (response && response.data) {
          roles = Array.isArray(response.data) ? response.data : (response.data.data || []);
        }

        // Filter roles based on meeting category
        const filteredRoles = roles.filter(role => {
          if (!role || role.isCustom) return false;
          
          const category = (role.category || '').toString().toUpperCase().trim();
          const meetingCat = (meetingCategory || '').toString().toUpperCase().replace('_MEETING', '');
          
          // Define role category mappings
          const roleCategories = {
            'CONTEST': ['CONTEST_MEETING_ONLY'],
            'REGULAR': ['REGULAR_AND_SPECIAL_MEETINGS', 'SHARED_ALL_MEETINGS'],
            'SPECIAL': ['REGULAR_AND_SPECIAL_MEETINGS', 'SHARED_ALL_MEETINGS']
          };

          const allowedCategories = roleCategories[meetingCat] || ['SHARED_ALL_MEETINGS'];
          return allowedCategories.includes(category) || category === 'SHARED_ALL_MEETINGS';
        });

        setAvailableRoles(filteredRoles);
      } catch (error) {
        console.error('Error fetching roles:', error);
        setAvailableRoles([]);
      }
    };

    if (open && meetingCategory) {
      fetchRoles();
    }
  }, [meetingCategory, open]);

  const handleRoleCountChange = (roleId, newCount) => {
    setRoleCounts(prev => ({
      ...prev,
      [roleId]: Math.max(0, newCount)
    }));
  };

  const handleAddCustomRole = () => {
    if (!newCustomRole.trim()) return;
    
    const customId = `custom_${Date.now()}`;
    setCustomRoles(prev => [...prev, {
      id: customId,
      name: newCustomRole.trim(),
      count: 1
    }]);
    
    setNewCustomRole('');
  };

  const handleCustomRoleCountChange = (customId, newCount) => {
    if (newCount <= 0) {
      setCustomRoles(prev => prev.filter(r => r.id !== customId));
    } else {
      setCustomRoles(prev => prev.map(r => 
        r.id === customId ? { ...r, count: newCount } : r
      ));
    }
  };

  const handleDeleteCustomRole = (customId) => {
    setCustomRoles(prev => prev.filter(r => r.id !== customId));
  };

  const handleSaveRoles = () => {
    const allRoles = [];
    
    // Add standard roles with counts
    Object.entries(roleCounts).forEach(([roleId, count]) => {
      const baseRole = availableRoles.find(r => r.roleId === roleId);
      if (baseRole && count > 0) {
        for (let i = 1; i <= count; i++) {
          allRoles.push({
            roleId: count > 1 ? `${roleId}_${i}` : roleId,
            roleName: count > 1 ? `${baseRole.roleName} ${i}` : baseRole.roleName,
            isCustom: false,
            instanceNumber: count > 1 ? i : undefined
          });
        }
      }
    });

    // Add custom roles
    customRoles.forEach(customRole => {
      for (let i = 1; i <= customRole.count; i++) {
        allRoles.push({
          roleId: customRole.count > 1 ? `${customRole.id}_${i}` : customRole.id,
          roleName: customRole.count > 1 ? `${customRole.name} ${i}` : customRole.name,
          isCustom: true,
          instanceNumber: customRole.count > 1 ? i : undefined
        });
      }
    });

    if (onRolesUpdate) {
      onRolesUpdate(allRoles);
    }
    onClose();
  };

  const getTotalRoleCount = () => {
    const standardCount = Object.values(roleCounts).reduce((sum, count) => sum + count, 0);
    const customCount = customRoles.reduce((sum, role) => sum + role.count, 0);
    return standardCount + customCount;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Assign Meeting Roles ({meetingCategory?.replace('_', ' ')})
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Standard Roles Section */}
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
          Standard Roles
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {availableRoles.map((role) => (
            <Grid item xs={12} sm={6} md={4} key={role.roleId}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 'medium', mb: 1, fontSize: '0.9rem' }}>
                    {role.roleName}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleRoleCountChange(role.roleId, (roleCounts[role.roleId] || 0) - 1)}
                      disabled={(roleCounts[role.roleId] || 0) <= 0}
                    >
                      <RemoveIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ minWidth: '30px', textAlign: 'center' }}>
                      {roleCounts[role.roleId] || 0}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleRoleCountChange(role.roleId, (roleCounts[role.roleId] || 0) + 1)}
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Custom Roles Section */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
            Custom Roles
          </Typography>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={isCustomRoleEnabled}
                onChange={(e) => setIsCustomRoleEnabled(e.target.checked)}
              />
            }
            label="Enable Custom Roles"

        {isCustomRoleEnabled && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                label="Custom Role Name"
                value={newCustomRole}
                onChange={(e) => setNewCustomRole(e.target.value)}
                sx={{ flex: 1 }}
                required
              />
              <Button
                variant="contained"
                onClick={handleAddCustomRole}
                disabled={!newCustomRole.trim()}
                startIcon={<AddIcon />}
              >
                Add
              </Button>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'medium', flex: 1, fontSize: '0.9rem' }}>
                              {customRole.name}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteCustomRole(customRole.id)}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleCustomRoleCountChange(customRole.id, customRole.count - 1)}
                              disabled={customRole.count <= 0}
                            >
                              <RemoveIcon />
                            </IconButton>
                            <Typography variant="h6" sx={{ minWidth: '30px', textAlign: 'center' }}>
                              {customRole.count}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleCustomRoleCountChange(customRole.id, customRole.count + 1)}
                            >
                              <AddIcon />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
        </Box>

        {/* Summary */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Selected Roles Summary: {getTotalRoleCount()} total roles
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(roleCounts).map(([roleId, count]) => {
              const role = availableRoles.find(r => r.roleId === roleId);
              if (!role || count === 0) return null;
              return (
                <Chip
                  key={roleId}
                  label={`${role.roleName} (${count})`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              );
            })}
            {customRoles.map((customRole) => (
              <Chip
                key={customRole.id}
                label={`${customRole.name} (${customRole.count})`}
                size="small"
                color="secondary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleSaveRoles}
          disabled={getTotalRoleCount() === 0}
        >
          Save Roles ({getTotalRoleCount()})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MeetingRoleAssignmentModal;
