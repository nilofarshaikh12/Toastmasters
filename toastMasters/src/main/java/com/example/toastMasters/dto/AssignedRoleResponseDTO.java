package com.example.toastMasters.dto;

import lombok.Data;

@Data
public class AssignedRoleResponseDTO {
    private Long id;
    private String meetingId;
    private int memberId;
    private String memberName;
    private String roleId;
    private String roleName;
}
