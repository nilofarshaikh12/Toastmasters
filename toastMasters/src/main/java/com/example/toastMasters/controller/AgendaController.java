package com.example.toastMasters.controller;

import com.example.toastMasters.dto.AgendaRequestDTO;
import com.example.toastMasters.dto.AgendaResponseDTO;
import com.example.toastMasters.services.AgendaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/agenda")
public class AgendaController {

    private final AgendaService agendaService;

    public AgendaController(AgendaService agendaService) {
        this.agendaService = agendaService;
    }

    @PostMapping("/add")
    public ResponseEntity<List<AgendaResponseDTO>> saveAgendaRows(@RequestBody List<AgendaRequestDTO> agendaRows) {
        List<AgendaResponseDTO> response = agendaService.saveAgendaRows(agendaRows);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/getAgendaById/{agendaId}")
    public ResponseEntity<AgendaResponseDTO> getAgendaById(@PathVariable int agendaId) {
        AgendaResponseDTO response = agendaService.getAgendaById(agendaId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/getByMeetingId/meeting/{meetingId}")
    public ResponseEntity<List<AgendaResponseDTO>> getAgendasByMeetingId(@PathVariable String meetingId) {
        List<AgendaResponseDTO> response = agendaService.getAgendasByMeetingId(meetingId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/getByMemberId/member/{memberId}")
    public ResponseEntity<List<AgendaResponseDTO>> getAgendasByMemberId(@PathVariable int memberId) {
        List<AgendaResponseDTO> response = agendaService.getAgendasByMemberId(memberId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/copyAgenda/{fromMeetingId}/{toMeetingId}")
    public ResponseEntity<List<AgendaResponseDTO>> copyAgenda(@PathVariable String fromMeetingId, @PathVariable String toMeetingId){
        List<AgendaResponseDTO> response= agendaService.copyAgendaByMeeting(fromMeetingId, toMeetingId);
        return ResponseEntity.ok(response);
    }
}
