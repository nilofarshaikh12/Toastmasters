package com.example.toastMasters.controller;

import com.example.toastMasters.dto.AssignedRoleRequestDTO;
import com.example.toastMasters.dto.AssignedRoleResponseDTO;
import com.example.toastMasters.services.AssignedRoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

//@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/assigned_roles")
public class AssignedRoleController {

    @Autowired
    private AssignedRoleService assignedRoleService;

    @PostMapping
    public ResponseEntity<?> assignRole(@RequestBody AssignedRoleRequestDTO requestDTO) {
        try {
            // Check if the meeting is in the past
            if (assignedRoleService.isMeetingInPast(requestDTO.getMeetingId())) {
                // If forceAssign is not true, return an error
                if (requestDTO.getForceAssign() == null || !requestDTO.getForceAssign()) {
                    return ResponseEntity.badRequest()
                            .body(Map.of(
                                    "message",
                                    String.format("Cannot assign role to past meeting (ID: %s). Set forceAssign to true to override.",
                                            requestDTO.getMeetingId())
                            ));
                }
            }

            AssignedRoleResponseDTO responseDTO = assignedRoleService.assignRole(requestDTO);
            return ResponseEntity.ok(responseDTO);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/meeting/{meetingId}")
    public ResponseEntity<List<AssignedRoleResponseDTO>> getRolesByMeeting(@PathVariable("meetingId") String meetingId) {
        List<AssignedRoleResponseDTO> responseList = assignedRoleService.getRolesByMeeting(meetingId);

        if (responseList == null || responseList.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(responseList);
    }

    @GetMapping("/history/member/{memberId}")
    public ResponseEntity<List<AssignedRoleResponseDTO>> getMemberRoleHistory(@PathVariable("memberId") int memberId) {
        List<AssignedRoleResponseDTO> responseList = assignedRoleService.getMemberRoleHistory(memberId);

        if (responseList == null || responseList.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(responseList);
    }
}