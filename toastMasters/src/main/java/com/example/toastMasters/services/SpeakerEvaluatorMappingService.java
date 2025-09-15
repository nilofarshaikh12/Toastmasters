package com.example.toastMasters.services;

import com.example.toastMasters.dto.EvaluatorWithSpeakersDTO;
import com.example.toastMasters.dto.SpeakerEvaluatorMappingResponseDTO;
import com.example.toastMasters.dto.SpeakerWithEvaluatorsDTO;

import java.util.List;

public interface SpeakerEvaluatorMappingService {
    SpeakerEvaluatorMappingResponseDTO assignEvaluator(String meetingId, int speakerId, int evaluatorId);
    List<SpeakerEvaluatorMappingResponseDTO> getAllMappingsForMeeting(String meetingId);
    List<SpeakerWithEvaluatorsDTO> getEvaluatorsGroupedBySpeaker(String meetingId);
    List<EvaluatorWithSpeakersDTO> getSpeakersGroupedByEvaluator(String meetingId);
    void deleteMapping(int speakerEvaluatorMappingId);
    void removeEvaluator(String meetingId, int speakerId, int evaluatorId);
}
