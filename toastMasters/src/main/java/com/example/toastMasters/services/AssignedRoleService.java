package com.example.toastMasters.services;

import com.example.toastMasters.dto.AssignedRoleRequestDTO;
import com.example.toastMasters.dto.AssignedRoleResponseDTO;
import java.util.List;


public interface AssignedRoleService {
    AssignedRoleResponseDTO assignRole(AssignedRoleRequestDTO requestDTO);
    List<AssignedRoleResponseDTO> getRolesByMeeting(String meetingId);
    List<AssignedRoleResponseDTO> getMemberRoleHistory(int memberId);
    boolean isMeetingInPast(String meetingId);
    boolean deleteAssignedRole(Long assignedRoleId);
}
