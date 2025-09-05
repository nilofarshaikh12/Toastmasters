package com.example.toastMasters.controller;

import com.example.toastMasters.dto.AbbreviationsRequestDTO;
import com.example.toastMasters.dto.AbbreviationsResponseDTO;
import com.example.toastMasters.services.AbbreviationsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/abbreviations")
public class AbbreviationsController {

    private final AbbreviationsService abbreviationsService;

    public AbbreviationsController(AbbreviationsService abbreviationsService) {
        this.abbreviationsService = abbreviationsService;
    }

    @PostMapping("/add")
    public ResponseEntity<AbbreviationsResponseDTO> createAbbreviation(@RequestBody AbbreviationsRequestDTO dto) {
        AbbreviationsResponseDTO response = abbreviationsService.createAbbreviation(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/update/{abbreviationId}")
    public ResponseEntity<AbbreviationsResponseDTO> updateAbbreviation(
            @PathVariable int abbreviationId,
            @RequestBody AbbreviationsRequestDTO dto) {
        AbbreviationsResponseDTO response = abbreviationsService.updateAbbreviation(abbreviationId, dto);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/delete/{abbreviationId}")
    public ResponseEntity<Void> deleteAbbreviation(@PathVariable int abbreviationId) {
        abbreviationsService.deleteAbbreviation(abbreviationId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/getById/{abbreviationId}")
    public ResponseEntity<AbbreviationsResponseDTO> getAbbreviationById(@PathVariable int abbreviationId) {
        AbbreviationsResponseDTO response = abbreviationsService.getAbbreviationById(abbreviationId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/getAll")
    public ResponseEntity<List<AbbreviationsResponseDTO>> getAllAbbreviations() {
        List<AbbreviationsResponseDTO> responses = abbreviationsService.getAllAbbreviations();
        return ResponseEntity.ok(responses);
    }
}
