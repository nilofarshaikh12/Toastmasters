package com.example.toastMasters.services;

import com.example.toastMasters.dto.RoleRequestDTO;
import com.example.toastMasters.dto.RoleResponseDTO;
import java.util.List;


public interface RoleService {

    RoleResponseDTO addRole(RoleRequestDTO requestDTO);

    List<RoleResponseDTO> getAllRoles();

    RoleResponseDTO getRoleById(String roleId);

    RoleResponseDTO updateRole(String roleId, RoleRequestDTO roleRequestDTO);

    void deleteRole(String roleId);
}
