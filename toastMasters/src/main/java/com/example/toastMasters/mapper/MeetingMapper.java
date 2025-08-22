package com.example.toastMasters.mapper;

import com.example.toastMasters.dto.MeetingRequestDTO;
import com.example.toastMasters.dto.MeetingResponseDTO;
import com.example.toastMasters.entity.Meeting;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface MeetingMapper {

    Meeting toEntity(MeetingRequestDTO meetingRequestDTO);

    MeetingResponseDTO toResponseDTO(Meeting meeting);
}
