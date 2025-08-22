package com.example.toastMasters.controller;

import com.example.toastMasters.constants.MeetingConstants;
import com.example.toastMasters.dto.MeetingRequestDTO;
import com.example.toastMasters.dto.MeetingResponseDTO;
import com.example.toastMasters.exceptions.ResponseMessage;
import com.example.toastMasters.services.MeetingService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

//@CrossOrigin(origins = "http://localhost:5173/")
@RestController
@RequestMapping("/meeting")
public class MeetingController {

    @Autowired
    private MeetingService meetingService;

    @PostMapping("/addMeeting")
    public ResponseEntity<ResponseMessage<Void>> addMeeting(@Valid @RequestBody MeetingRequestDTO meetingRequestDTO) {
        meetingService.addMeeting(meetingRequestDTO);
        ResponseMessage<Void> response = new ResponseMessage<>(MeetingConstants.MEETING_ADDED, HttpStatus.CREATED.value());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/getMeetings")
    public ResponseEntity<ResponseMessage<List<MeetingResponseDTO>>> getAllMeetings() {
        List<MeetingResponseDTO> allMeetings = meetingService.getAllMeetings();
        ResponseMessage<List<MeetingResponseDTO>> response = new ResponseMessage<>(MeetingConstants.MEETINGS_FETCHED, HttpStatus.OK.value(), allMeetings);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @GetMapping("/getMeetingById/{meetingId}")
    public ResponseEntity<ResponseMessage<MeetingResponseDTO>> getMeetingById(@PathVariable String meetingId) {
        MeetingResponseDTO meetingById = meetingService.getMeetingById(meetingId);
        ResponseMessage<MeetingResponseDTO> response = new ResponseMessage<>(MeetingConstants.MEETING_FETCHED, HttpStatus.OK.value(), meetingById);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PatchMapping("/updateMeeting/{meetingId}")
    public ResponseEntity<ResponseMessage<MeetingResponseDTO>> updateMeeting(@PathVariable String meetingId, @Valid @RequestBody MeetingRequestDTO meetingRequestDTO) {
        MeetingResponseDTO meetingResponseDTO = meetingService.updateMeeting(meetingId, meetingRequestDTO);
        ResponseMessage<MeetingResponseDTO> response = new ResponseMessage<>(MeetingConstants.MEETING_UPDATED, HttpStatus.OK.value(), meetingResponseDTO);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @DeleteMapping("/deleteMeeting/{meetingId}")
    public ResponseEntity<ResponseMessage<Void>> deleteMeeting(@PathVariable String meetingId) {
        meetingService.deleteMeeting(meetingId);
        ResponseMessage<Void> response = new ResponseMessage<>(MeetingConstants.MEETING_DELETED, HttpStatus.OK.value());
        return new ResponseEntity<>(response, HttpStatus.OK);
    }
}
