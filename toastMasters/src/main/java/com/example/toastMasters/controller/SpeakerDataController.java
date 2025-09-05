package com.example.toastMasters.controller;

import com.example.toastMasters.dto.SpeakerDataRequestDTO;
import com.example.toastMasters.dto.SpeakerDataResponseDTO;
import com.example.toastMasters.services.SpeakerDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/speaker-data")
@RequiredArgsConstructor
public class SpeakerDataController {

    @Autowired
    private SpeakerDataService speakerDataService;

    @PostMapping("add")
    public ResponseEntity<SpeakerDataResponseDTO> addSpeakerData(@RequestBody SpeakerDataRequestDTO dto) {
        SpeakerDataResponseDTO response = speakerDataService.addSpeakerData(dto);
        return ResponseEntity.ok(response);
    }

    @PutMapping("update/{speakerId}")
    public ResponseEntity<SpeakerDataResponseDTO> updateSpeakerData(
            @PathVariable int speakerId,
            @RequestBody SpeakerDataRequestDTO dto) {
        SpeakerDataResponseDTO response = speakerDataService.updateSpeakerData(speakerId, dto);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("delete/{speakerId}")
    public ResponseEntity<String> deleteSpeakerData(@PathVariable int speakerId) {
        speakerDataService.deleteSpeakerData(speakerId);
        return ResponseEntity.ok("SpeakerData deleted successfully with id: " + speakerId);
    }

    @GetMapping("getDataById/{speakerId}")
    public ResponseEntity<SpeakerDataResponseDTO> getSpeakerDataById(@PathVariable int speakerId) {
        SpeakerDataResponseDTO response = speakerDataService.getSpeakerDataById(speakerId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("get")
    public ResponseEntity<List<SpeakerDataResponseDTO>> getAllSpeakerData() {
        List<SpeakerDataResponseDTO> list = speakerDataService.getAllSpeakerData();
        return ResponseEntity.ok(list);
    }

    @GetMapping("getByMemberId/member/{memberId}")
    public ResponseEntity<List<SpeakerDataResponseDTO>> getByMemberId(@PathVariable int memberId) {
        List<SpeakerDataResponseDTO> list = speakerDataService.getByMemberId(memberId);
        return ResponseEntity.ok(list);
    }

    @GetMapping("getByMeetingId/meeting/{meetingId}")
    public ResponseEntity<List<SpeakerDataResponseDTO>> getByMeetingId(@PathVariable String meetingId) {
        List<SpeakerDataResponseDTO> list = speakerDataService.getByMeetingId(meetingId);
        return ResponseEntity.ok(list);
    }
}
