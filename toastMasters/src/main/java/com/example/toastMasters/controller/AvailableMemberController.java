package com.example.toastMasters.controller;

import com.example.toastMasters.dto.AvailableMemberRequestDTO;
import com.example.toastMasters.dto.AvailableMemberResponseDTO;
import com.example.toastMasters.services.AvailableMemberService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

//@CrossOrigin(origins = "http://localhost:5173/")
@RestController
@RequestMapping("/available-members")
public class AvailableMemberController {

    @Autowired
    private AvailableMemberService availableMemberService;

    @PostMapping("/add")
    public ResponseEntity<AvailableMemberResponseDTO> addAvailableMember(@RequestBody AvailableMemberRequestDTO requestDTO) {
        AvailableMemberResponseDTO responseDTO = availableMemberService.addAvailableMember(requestDTO);
        return ResponseEntity.ok(responseDTO);
    }

    @GetMapping("/getAllMembers")
    public ResponseEntity<List<AvailableMemberResponseDTO>> getAllAvailableMembers() {
        List<AvailableMemberResponseDTO> availableMembers = availableMemberService.getAllAvailableMembers();
        return ResponseEntity.ok(availableMembers);
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<AvailableMemberResponseDTO> updateAvailableMember(
            @PathVariable Long id,
            @RequestBody AvailableMemberRequestDTO requestDTO) {

        AvailableMemberResponseDTO updatedMember = availableMemberService.updateAvailableMember(id, requestDTO);
        return ResponseEntity.ok(updatedMember);
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> deleteAvailableMember(@PathVariable Long id) {
        availableMemberService.deleteAvailableMember(id);
        return ResponseEntity.ok("AvailableMember deleted successfully with ID: " + id);
    }
}
