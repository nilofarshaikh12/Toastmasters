package com.example.toastMasters.controller;

import com.example.toastMasters.dto.AgendaConstantInfoRequestDTO;
import com.example.toastMasters.dto.AgendaConstantInfoResponseDTO;
import com.example.toastMasters.services.AgendaConstantInfoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/agenda-constant-info")
public class AgendaConstantInfoController {

    private final AgendaConstantInfoService service;

    public AgendaConstantInfoController(AgendaConstantInfoService service) {
        this.service = service;
    }

    @PostMapping("/add")
    public ResponseEntity<AgendaConstantInfoResponseDTO> create(@RequestBody AgendaConstantInfoRequestDTO dto) {
        AgendaConstantInfoResponseDTO response = service.createAgendaInfo(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<AgendaConstantInfoResponseDTO> update(@PathVariable int id, @RequestBody AgendaConstantInfoRequestDTO dto) {
        AgendaConstantInfoResponseDTO response = service.updateAgendaInfo(id, dto);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/getById/{id}")
    public ResponseEntity<AgendaConstantInfoResponseDTO> getById(@PathVariable int id) {
        AgendaConstantInfoResponseDTO response = service.getAgendaInfoById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/getAll")
    public ResponseEntity<List<AgendaConstantInfoResponseDTO>> getAll() {
        List<AgendaConstantInfoResponseDTO> responseList = service.getAllAgendaInfo();
        return ResponseEntity.ok(responseList);
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        service.deleteAgendaInfo(id);
        return ResponseEntity.noContent().build();
    }
}
