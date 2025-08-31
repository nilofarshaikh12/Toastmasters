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
import MeetingRoleAssignmentModal from './MeetingRoleAssignmentModalFixed';

const MeetingRoleAssignment = ({ meetingCategory, onRolesUpdate, initialRoles = [] }) => {
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

    const normalizedRoles = initialRoles.map((role) => ({
      roleId: role.roleId,
      roleName: role.roleName,
      isCustom: Boolean(role.isCustom),
      instanceNumber: role.instanceNumber
    }));

    setAssignedRoles(normalizedRoles);
  }, [JSON.stringify(initialRoles)]);

  const handleRemoveRole = (roleIdToRemove) => {
    const updatedRoles = assignedRoles.filter(role => role.roleId !== roleIdToRemove);
    setAssignedRoles(updatedRoles);
    if (onRolesUpdate) onRolesUpdate(updatedRoles);
  };

  const handleRolesUpdate = (newRoles) => {
    setAssignedRoles(newRoles);
    if (onRolesUpdate) onRolesUpdate(newRoles);
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
      
      {/* Assigned Roles Display */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {assignedRoles && assignedRoles.length > 0 ? (
          assignedRoles.map((role) => (
            <Chip
              key={role.roleId}
              label={role.roleName}
              onDelete={() => handleRemoveRole(role.roleId)}
              color={role.isCustom ? "secondary" : "primary"}
              variant="outlined"
              deleteIcon={
                <Tooltip title="Remove role">
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
      <MeetingRoleAssignmentModal
        open={openRoleModal}
        onClose={() => setOpenRoleModal(false)}
        meetingCategory={meetingCategory}
        onRolesUpdate={handleRolesUpdate}
        initialRoles={assignedRoles}
      />
    </Paper>
  );
};

export default MeetingRoleAssignment;
