package com.example.toastMasters.services;

import com.example.toastMasters.constants.RoleConstants;
import com.example.toastMasters.dto.RoleRequestDTO;
import com.example.toastMasters.dto.RoleResponseDTO;
import com.example.toastMasters.entity.Roles;
import com.example.toastMasters.exceptions.RoleNotFoundException;
import com.example.toastMasters.mapper.RoleMapper;
import com.example.toastMasters.repositories.RolesRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class RoleServiceImpl implements RoleService{

    @Autowired
    private RolesRepository rolesRepository;

    @Autowired
    private RoleMapper roleMapper;

    @Override
    public RoleResponseDTO addRole(RoleRequestDTO requestDTO) {
        Roles role = roleMapper.toEntity(requestDTO);
        Roles savedRole = rolesRepository.save(role);
        return roleMapper.toResponseDTO(savedRole);
    }

    @Override
    public List<RoleResponseDTO> getAllRoles() {
        List<Roles> roles = rolesRepository.findAll();
        List<RoleResponseDTO> responseList = new ArrayList<>();
        for (Roles role : roles) {
            responseList.add(roleMapper.toResponseDTO(role));
        }
        return responseList;
    }

    @Override
    public RoleResponseDTO getRoleById(String roleId) {

        Roles role= rolesRepository.findByRoleId(roleId);
        if(role==null){
            throw new RoleNotFoundException(RoleConstants.ROLE_NOT_FOUND);
        }
        return roleMapper.toResponseDTO(role);
    }

    @Override
    public RoleResponseDTO updateRole(String roleId, RoleRequestDTO roleRequestDTO) {
        Roles roles = rolesRepository.findByRoleId(roleId);

        if (roles == null) {
            throw new RoleNotFoundException("Role update failed: Role not found");
        }

        // Update the fields with data from the request DTO
        if(roleRequestDTO.getRoleName() != null) {
            roles.setRoleName(roleRequestDTO.getRoleName());
        }
        if(roleRequestDTO.getRoleDescription() != null) {
            roles.setRoleDescription(roleRequestDTO.getRoleDescription());
        }
        if(roleRequestDTO.getRolePlayerDocument() != null) {
            roles.setRolePlayerDocument(roleRequestDTO.getRolePlayerDocument());
        }
        // New field update
        if(roleRequestDTO.getCategory() != null) {
            roles.setCategory(roleRequestDTO.getCategory());
        }

        rolesRepository.save(roles);
        return roleMapper.toResponseDTO(roles);
    }

    @Override
    public void deleteRole(String roleId) {
        Roles roles = rolesRepository.findByRoleId(roleId);
        if (roles == null) {
            throw new RoleNotFoundException("Role Deletion failed: Role not found");
        }
        rolesRepository.delete(roles);
    }
}