package com.example.toastMasters.mapper;

import com.example.toastMasters.dto.GrammarianRequestDTO;
import com.example.toastMasters.dto.GrammarianResponseDTO;
import com.example.toastMasters.entity.Grammarian;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface GrammarianMapper {

    @Mapping(target = "member", ignore = true)
    @Mapping(target = "meeting", ignore = true)
    @Mapping(target = "grammarianDataCreatedAt", expression = "java(java.time.LocalDateTime.now())")
    Grammarian toEntity(GrammarianRequestDTO dto);

    @Mapping(source = "member.memberId", target = "memberId")
    @Mapping(source = "meeting.meetingId", target = "meetingId")
    GrammarianResponseDTO toResponseDTO(Grammarian entity);
}
