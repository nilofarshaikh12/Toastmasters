package com.example.toastMasters.mapper;

import com.example.toastMasters.dto.AvailableMemberRequestDTO;
import com.example.toastMasters.dto.AvailableMemberResponseDTO;
import com.example.toastMasters.dto.RoleResponseDTOForAvailable;
import com.example.toastMasters.entity.AvailableMember;
import com.example.toastMasters.entity.Meeting;
import com.example.toastMasters.entity.Member;
import com.example.toastMasters.entity.Roles;
import com.example.toastMasters.repositories.RolesRepository;
import org.mapstruct.Context;
import org.mapstruct.Mapper;

import java.util.ArrayList;
import java.util.List;

@Mapper(componentModel = "spring")
public interface AvailableMemberMapper {

    // Convert Request DTO to Entity
    default AvailableMember toEntity(AvailableMemberRequestDTO dto, Meeting meeting, Member member, @Context RolesRepository roleRepository) {
        if (dto == null) return null;

        AvailableMember availableMember = new AvailableMember();
        availableMember.setMeeting(meeting);
        availableMember.setMember(member);
        availableMember.setAvailabilityStatus(dto.getAvailabilityStatus());

        // Map role IDs to entities in list
        availableMember.setPreferredRoles(mapRoleIdsToEntities(dto.getPreferredRoleIds(), roleRepository));

        return availableMember;
    }

    // Convert Entity to Response DTO
    default AvailableMemberResponseDTO toResponseDTO(AvailableMember availableMember) {
        if (availableMember == null) {
            return null;
        }

        AvailableMemberResponseDTO dto = new AvailableMemberResponseDTO();

        // Set internal ID
        dto.setId(availableMember.getId());

        // Map meeting ID
        if (availableMember.getMeeting() != null) {
            dto.setMeetingId(availableMember.getMeeting().getMeetingId());
        }

        // Map member ID
        if (availableMember.getMember() != null) {
            dto.setMemberId(availableMember.getMember().getMemberId());
        }

        // Map availability status
        dto.setAvailabilityStatus(availableMember.getAvailabilityStatus());

        // Map preferred roles
        dto.setPreferredRoles(mapRolesToRoleResponseDTOs(availableMember.getPreferredRoles()));

        return dto;
    }

    // Map role IDs from request DTO to Roles entities (maintain order)
    default List<Roles> mapRoleIdsToEntities(List<String> roleIds, @Context RolesRepository roleRepository) {
        List<Roles> roles = new ArrayList<>();
        if (roleIds != null) {
            for (String roleId : roleIds) {
                Roles role = roleRepository.findById(roleId).orElse(null);
                if (role != null) {
                    roles.add(role);
                } else {
                    throw new RuntimeException("Role not found: " + roleId);
                }
            }
        }
        return roles;
    }

    // Map Roles entities to RoleResponseDTOForAvailable (keep order)
    default List<RoleResponseDTOForAvailable> mapRolesToRoleResponseDTOs(List<Roles> roles) {
        List<RoleResponseDTOForAvailable> dtos = new ArrayList<>();
        if (roles != null) {
            for (Roles role : roles) {
                RoleResponseDTOForAvailable dto = new RoleResponseDTOForAvailable();
                dto.setRoleId(role.getRoleId());
                dto.setRoleName(role.getRoleName());
                dtos.add(dto);
            }
        }
        return dtos;
    }
}
