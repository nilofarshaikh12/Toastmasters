package com.example.toastMasters.controller;

import com.example.toastMasters.dto.GrammarianRequestDTO;
import com.example.toastMasters.dto.GrammarianResponseDTO;
import com.example.toastMasters.services.GrammarianService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/grammarian")
public class GrammarianController {

    @Autowired
    private GrammarianService grammarianService;

    @PostMapping("/add")
    public ResponseEntity<GrammarianResponseDTO> addGrammarian(@RequestBody GrammarianRequestDTO dto) {
        GrammarianResponseDTO saved = grammarianService.addGrammarian(dto);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/update/{grammarianId}")
    public ResponseEntity<GrammarianResponseDTO> updateGrammarian(
            @PathVariable int grammarianId,
            @RequestBody GrammarianRequestDTO dto) {
        GrammarianResponseDTO updated = grammarianService.updateGrammarian(grammarianId, dto);
        return ResponseEntity.ok(updated);
    }


    @DeleteMapping("/delete/{grammarianId}")
    public ResponseEntity<String> deleteGrammarian(@PathVariable int grammarianId) {
        grammarianService.deleteGrammarian(grammarianId);
        return ResponseEntity.ok("Grammarian with ID " + grammarianId + " deleted successfully.");
    }

    @GetMapping("/getById/{grammarianId}")
    public ResponseEntity<GrammarianResponseDTO> getById(@PathVariable int grammarianId) {
        GrammarianResponseDTO response = grammarianService.getGrammarianById(grammarianId);
        return ResponseEntity.ok(response);
    }


    @GetMapping("/getAll")
    public ResponseEntity<List<GrammarianResponseDTO>> getAll() {
        List<GrammarianResponseDTO> responses = grammarianService.getAllGrammarians();
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/getByMemberId/member/{memberId}")
    public ResponseEntity<List<GrammarianResponseDTO>> getByMemberId(@PathVariable int memberId) {
        List<GrammarianResponseDTO> responses = grammarianService.getByMemberId(memberId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/getByMeetingId/meeting/{meetingId}")
    public ResponseEntity<List<GrammarianResponseDTO>> getByMeetingId(@PathVariable String meetingId) {
        List<GrammarianResponseDTO> responses = grammarianService.getByMeetingId(meetingId);
        return ResponseEntity.ok(responses);
    }
}
