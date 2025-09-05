package com.example.toastMasters.controller;

import com.example.toastMasters.dto.AgendaJoinDTO;
import com.example.toastMasters.exceptions.ResponseMessage;
import com.example.toastMasters.services.AgendaJoinService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agenda-join")
public class AgendaJoinController {

    private final AgendaJoinService agendaJoinService;

    public AgendaJoinController(AgendaJoinService agendaJoinService) {
        this.agendaJoinService = agendaJoinService;
    }

    @GetMapping("/getAgenda/{speakerId}/{grammarianId}/{meetingId}")
    public ResponseEntity<ResponseMessage<AgendaJoinDTO>> getAgenda(
            @PathVariable int speakerId, @PathVariable int grammarianId, @PathVariable String meetingId){
        return agendaJoinService.getAgenda(speakerId, grammarianId, meetingId);
    }
}

