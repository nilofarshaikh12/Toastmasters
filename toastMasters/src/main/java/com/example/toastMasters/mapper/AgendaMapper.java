package com.example.toastMasters.mapper;

import com.example.toastMasters.dto.AgendaRequestDTO;
import com.example.toastMasters.dto.AgendaResponseDTO;
import com.example.toastMasters.entity.Agenda;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Mappings;

@Mapper(componentModel = "spring")
public interface AgendaMapper {

    @Mappings({
            @Mapping(target = "member", ignore = true),
            @Mapping(target = "meeting", ignore = true),
            @Mapping(target = "agendaCreatedAt", expression = "java(java.time.LocalDateTime.now())") })
    Agenda toEntity(AgendaRequestDTO dto);


    @Mappings({
            @Mapping(source = "member.memberId", target = "memberId"),
            @Mapping(source = "meeting.meetingId", target = "meetingId")
    })
    AgendaResponseDTO toResponseDTO(Agenda entity);
}
