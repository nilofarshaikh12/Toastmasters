package com.example.toastMasters.controller;

import com.example.toastMasters.dto.AgendaJoinDTO;
import com.example.toastMasters.exceptions.ResponseMessage;
import com.example.toastMasters.services.AgendaJoinService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/agenda-join")
public class AgendaJoinController {

    private final AgendaJoinService agendaJoinService;

    public AgendaJoinController(AgendaJoinService agendaJoinService) {
        this.agendaJoinService = agendaJoinService;
    }

    @GetMapping("/getAgenda/{meetingId}")
    public ResponseEntity<ResponseMessage<AgendaJoinDTO>> getAgenda( @PathVariable String meetingId){
        return agendaJoinService.getAgenda(meetingId);
    }

    @PutMapping("/updateAgenda/{meetingId}")
    public ResponseEntity<ResponseMessage<AgendaJoinDTO>> updateAgenda(
            @PathVariable String meetingId, @RequestBody AgendaJoinDTO agendaJoinDTO) {
        return agendaJoinService.updateAgenda(agendaJoinDTO, meetingId);
    }
}

