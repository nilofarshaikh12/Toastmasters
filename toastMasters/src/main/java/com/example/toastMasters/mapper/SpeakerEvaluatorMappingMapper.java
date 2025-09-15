package com.example.toastMasters.mapper;

import com.example.toastMasters.dto.SpeakerEvaluatorMappingResponseDTO;
import com.example.toastMasters.entity.SpeakerEvaluatorMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SpeakerEvaluatorMappingMapper {

    @Mapping(source = "meeting.meetingId", target = "meetingId")
    @Mapping(source = "speaker.memberId", target = "speakerId")
    @Mapping(source = "speaker.memberName", target = "speakerName")
    @Mapping(source = "evaluator.memberId", target = "evaluatorId")
    @Mapping(source = "evaluator.memberName", target = "evaluatorName")
    SpeakerEvaluatorMappingResponseDTO toDto(SpeakerEvaluatorMapping mapping);
}


