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

    default AvailableMember toEntity(AvailableMemberRequestDTO dto, Meeting meeting, Member member, @Context RolesRepository roleRepository) {
        if (dto == null) return null;

        AvailableMember availableMember = new AvailableMember();
        availableMember.setMeeting(meeting);
        availableMember.setMember(member);
        availableMember.setAvailabilityStatus(dto.getAvailabilityStatus());

        availableMember.setPreferredRoles(mapRoleIdsToEntities(dto.getPreferredRoleIds(), roleRepository));

        return availableMember;
    }

    default AvailableMemberResponseDTO toResponseDTO(AvailableMember availableMember) {
        if (availableMember == null) {
            return null;
        }

        AvailableMemberResponseDTO dto = new AvailableMemberResponseDTO();
        dto.setId(availableMember.getId());

        if (availableMember.getMeeting() != null) {
            dto.setMeetingId(availableMember.getMeeting().getMeetingId());
        }

        if (availableMember.getMember() != null) {
            dto.setMemberId(availableMember.getMember().getMemberId());
        }

        dto.setAvailabilityStatus(availableMember.getAvailabilityStatus());
        dto.setPreferredRoles(mapRolesToRoleResponseDTOs(availableMember.getPreferredRoles()));

        return dto;
    }

    // UPDATED: Map role IDs from request DTO to Roles entities
    default List<Roles> mapRoleIdsToEntities(List<String> roleIds, @Context RolesRepository roleRepository) {
        List<Roles> roles = new ArrayList<>();
        if (roleIds != null) {
            for (String roleId : roleIds) {
                // Check for the special "custom" role ID
                if ("custom".equalsIgnoreCase(roleId)) {
                    // If it's a custom role, create a new Roles object
                    Roles customRole = new Roles();
                    customRole.setRoleId("custom");
                    customRole.setRoleName("Custom");
                    // You can add other properties as needed
                    roles.add(customRole);
                } else {
                    // For all other roles, perform the database lookup
                    Roles role = roleRepository.findByRoleIdIgnoreCase(roleId).orElse(null);
                    if (role != null) {
                        roles.add(role);
                    } else {
                        throw new RuntimeException("Role not found: " + roleId);
                    }
                }
            }
        }
        return roles;
    }

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