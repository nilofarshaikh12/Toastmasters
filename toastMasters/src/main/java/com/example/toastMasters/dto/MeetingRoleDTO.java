package com.example.toastMasters.dto;

import lombok.Data;

@Data
public class MeetingRoleDTO {
    private String roleId;
    private String roleName;
    private boolean isCustom;
    private Integer instanceNumber;
}
