package com.example.toastMasters.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RoleRequestDTO {

    private String roleName;
    private String roleDescription;
    private String rolePlayerDocument;
    private String category;
}
