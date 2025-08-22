package com.example.toastMasters.mapper;

import com.example.toastMasters.dto.RoleRequestDTO;
import com.example.toastMasters.dto.RoleResponseDTO;
import com.example.toastMasters.entity.Roles;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface RoleMapper {

    @Mapping(target = "roleId", ignore = true)
    Roles toEntity(RoleRequestDTO roleRequestDTO);

    RoleResponseDTO toResponseDTO(Roles roles);
}
