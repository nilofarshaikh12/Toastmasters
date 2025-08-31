import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography,
  Chip,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import MeetingRoleAssignmentNew from './MeetingRoleAssignmentNew';

const MeetingRoleAssignmentWithDelete = ({ meetingCategory, onRolesUpdate, initialRoles = [] }) => {
  const [openRoleModal, setOpenRoleModal] = useState(false);
  const [assignedRoles, setAssignedRoles] = useState([]);
  const [previousCategory, setPreviousCategory] = useState(meetingCategory);

  // Reset roles only when meeting category actually changes (not on initial load)
  useEffect(() => {
    if (previousCategory && previousCategory !== meetingCategory) {
      setAssignedRoles([]);
      if (onRolesUpdate) onRolesUpdate([]);
    }
    setPreviousCategory(meetingCategory);
  }, [meetingCategory, onRolesUpdate, previousCategory]);

  // Initialize assigned roles from initial roles
  useEffect(() => {
    if (!initialRoles || initialRoles.length === 0) {
      setAssignedRoles([]);
      return;
    }

    const normalizedRoles = initialRoles.map((role, index) => ({
      id: `${role.roleId}_${index}`, // Unique ID for each role instance
      roleId: role.roleId,
      roleName: role.roleName,
      isCustom: Boolean(role.isCustom),
      instanceNumber: role.instanceNumber,
      originalIndex: index
    }));

    setAssignedRoles(normalizedRoles);
  }, [JSON.stringify(initialRoles)]);

  // Function to renumber instances of the same role type
  const renumberRoleInstances = (roles) => {
    const roleGroups = {};
    
    // Group roles by base role name and type
    roles.forEach(role => {
      const baseKey = role.isCustom ? `custom_${role.roleName}` : role.roleId.split('_')[0];
      if (!roleGroups[baseKey]) {
        roleGroups[baseKey] = [];
      }
      roleGroups[baseKey].push(role);
    });

    // Renumber each group
    const renumberedRoles = [];
    Object.values(roleGroups).forEach(group => {
      group.forEach((role, index) => {
        const instanceNumber = group.length > 1 ? index + 1 : null;
        const displayName = group.length > 1 
          ? `${role.roleName.replace(/\s+\d+$/, '')} ${instanceNumber}`
          : role.roleName.replace(/\s+\d+$/, '');
        
        renumberedRoles.push({
          ...role,
          instanceNumber,
          displayName,
          roleName: role.roleName.replace(/\s+\d+$/, '') // Clean base name
        });
      });
    });

    return renumberedRoles;
  };

  const handleRemoveRole = (roleIdToRemove) => {
    const updatedRoles = assignedRoles.filter(role => role.id !== roleIdToRemove);
    const renumberedRoles = renumberRoleInstances(updatedRoles);
    
    // Convert back to the format expected by the parent component
    const formattedRoles = renumberedRoles.map(role => ({
      roleId: role.roleId.split('_')[0], // Clean roleId
      roleName: role.roleName,
      isCustom: role.isCustom,
      instanceNumber: role.instanceNumber
    }));

    setAssignedRoles(renumberedRoles);
    if (onRolesUpdate) onRolesUpdate(formattedRoles);
  };

  const handleRolesUpdate = (newRoles) => {
    // Convert incoming roles to internal format with unique IDs
    const rolesWithIds = newRoles.map((role, index) => ({
      id: `${role.roleId}_${Date.now()}_${index}`,
      roleId: role.roleId,
      roleName: role.roleName,
      isCustom: role.isCustom,
      instanceNumber: role.instanceNumber,
      originalIndex: index
    }));

    const renumberedRoles = renumberRoleInstances(rolesWithIds);
    setAssignedRoles(renumberedRoles);
    
    // Send back the clean format
    const formattedRoles = renumberedRoles.map(role => ({
      roleId: role.roleId.split('_')[0],
      roleName: role.roleName,
      isCustom: role.isCustom,
      instanceNumber: role.instanceNumber
    }));
    
    if (onRolesUpdate) onRolesUpdate(formattedRoles);
  };

  // Get display name for each role
  const getDisplayName = (role) => {
    if (role.displayName) return role.displayName;
    return role.instanceNumber ? `${role.roleName} ${role.instanceNumber}` : role.roleName;
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mt: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Meeting Roles ({assignedRoles.length} assigned)
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => setOpenRoleModal(true)}
          startIcon={<EditIcon />}
        >
          Manage Roles
        </Button>
      </Box>
      
      {/* Assigned Roles Display - Each role instance shown individually */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {assignedRoles && assignedRoles.length > 0 ? (
          assignedRoles.map((role) => (
            <Chip
              key={role.id}
              label={getDisplayName(role)}
              onDelete={() => handleRemoveRole(role.id)}
              color={role.isCustom ? "secondary" : "primary"}
              variant="outlined"
              deleteIcon={
                <Tooltip title="Remove this role instance">
                  <CloseIcon />
                </Tooltip>
              }
            />
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            No roles assigned yet. Click "Manage Roles" to add roles.
          </Typography>
        )}
      </Box>

      {/* Role Assignment Modal */}
      <MeetingRoleAssignmentNew
        open={openRoleModal}
        onClose={() => setOpenRoleModal(false)}
        meetingCategory={meetingCategory}
        onRolesUpdate={handleRolesUpdate}
        initialRoles={assignedRoles.map(role => ({
          roleId: role.roleId.split('_')[0],
          roleName: role.roleName,
          isCustom: role.isCustom,
          instanceNumber: role.instanceNumber
        }))}
      />
    </Paper>
  );
};

export default MeetingRoleAssignmentWithDelete;
