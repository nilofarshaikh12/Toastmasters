package com.example.toastMasters.controller;

import com.example.toastMasters.dto.EvaluatorWithSpeakersDTO;
import com.example.toastMasters.dto.SpeakerEvaluatorMappingResponseDTO;
import com.example.toastMasters.dto.SpeakerWithEvaluatorsDTO;
import com.example.toastMasters.services.SpeakerEvaluatorMappingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/semappings")
public class SpeakerEvaluatorMappingController {

    private final SpeakerEvaluatorMappingService mappingService;

    public SpeakerEvaluatorMappingController(SpeakerEvaluatorMappingService mappingService) {
        this.mappingService = mappingService;
    }

    @PostMapping("/assign/{meetingId}/{speakerId}/{evaluatorId}")
    public ResponseEntity<SpeakerEvaluatorMappingResponseDTO> assignEvaluator(
            @PathVariable String meetingId, @PathVariable int speakerId, @PathVariable int evaluatorId) {

        SpeakerEvaluatorMappingResponseDTO dto = mappingService.assignEvaluator(meetingId, speakerId, evaluatorId);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/meeting/{meetingId}")
    public ResponseEntity<List<SpeakerEvaluatorMappingResponseDTO>> getMappingsForMeeting(
            @PathVariable String meetingId) {

        List<SpeakerEvaluatorMappingResponseDTO> mappings = mappingService.getAllMappingsForMeeting(meetingId);
        return ResponseEntity.ok(mappings);
    }

    @GetMapping("/getEvaluators/meeting/{meetingId}/by-speaker")
    public ResponseEntity<List<SpeakerWithEvaluatorsDTO>> getEvaluatorsGroupedBySpeaker(
            @PathVariable String meetingId) {

        List<SpeakerWithEvaluatorsDTO> grouped = mappingService.getEvaluatorsGroupedBySpeaker(meetingId);
        return ResponseEntity.ok(grouped);
    }

    @GetMapping("/getSpeakers/meeting/{meetingId}/by-evaluator")
    public ResponseEntity<List<EvaluatorWithSpeakersDTO>> getSpeakersGroupedByEvaluator(
            @PathVariable String meetingId) {

        List<EvaluatorWithSpeakersDTO> grouped = mappingService.getSpeakersGroupedByEvaluator(meetingId);
        return ResponseEntity.ok(grouped);
    }

    @DeleteMapping("/{speakerEvaluatorMappingId}")
    public ResponseEntity<Void> deleteMapping(@PathVariable int speakerEvaluatorMappingId) {
        mappingService.deleteMapping(speakerEvaluatorMappingId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/remove/{meetingId}/{speakerId}/{evaluatorId}")
    public ResponseEntity<Void> removeEvaluator(
            @PathVariable String meetingId, @PathVariable int speakerId, @PathVariable int evaluatorId) {
        mappingService.removeEvaluator(meetingId, speakerId, evaluatorId);
        return ResponseEntity.noContent().build();
    }
}
