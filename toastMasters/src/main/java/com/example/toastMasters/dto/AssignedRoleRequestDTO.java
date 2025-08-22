package com.example.toastMasters.dto;

import lombok.Data;

@Data
public class AssignedRoleRequestDTO {
    private String meetingId;
    private int memberId;
    private String roleId;
    private Boolean forceAssign = false;
}