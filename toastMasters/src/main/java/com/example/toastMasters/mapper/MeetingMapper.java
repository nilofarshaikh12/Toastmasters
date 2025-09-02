package com.example.toastMasters.mapper;

import com.example.toastMasters.dto.MeetingRequestDTO;
import com.example.toastMasters.dto.MeetingResponseDTO;
import com.example.toastMasters.dto.MeetingRoleDTO;
import com.example.toastMasters.entity.Meeting;
import com.example.toastMasters.entity.MeetingRole;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface MeetingMapper {

    Meeting toEntity(MeetingRequestDTO meetingRequestDTO);

    // ✅ Tell MapStruct to also map roles
    @Mapping(source = "roles", target = "roles")
    MeetingResponseDTO toResponseDTO(Meeting meeting);

    // ✅ Define MeetingRole -> MeetingRoleDTO mapping
    MeetingRoleDTO meetingRoleToDto(MeetingRole role);

    // ✅ Define list mapping (optional, but good for clarity)
    List<MeetingRoleDTO> meetingRolesToDtos(List<MeetingRole> roles);
}
