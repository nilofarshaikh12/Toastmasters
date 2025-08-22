package com.example.toastMasters.mapper;

import com.example.toastMasters.dto.AssignedRoleRequestDTO;
import com.example.toastMasters.dto.AssignedRoleResponseDTO;
import com.example.toastMasters.entity.AssignedRole;

public class AssignedRoleMapper {

    public static AssignedRoleResponseDTO toResponseDTO(AssignedRole assignedRole) {
        AssignedRoleResponseDTO dto = new AssignedRoleResponseDTO();
        dto.setId(assignedRole.getId());
        dto.setMeetingId(assignedRole.getMeeting().getMeetingId());
        dto.setMemberId(assignedRole.getMember().getMemberId());
        dto.setMemberName(assignedRole.getMember().getMemberName());
        dto.setRoleId(assignedRole.getRole().getRoleId());
        dto.setRoleName(assignedRole.getRole().getRoleName());
        return dto;
    }
}
