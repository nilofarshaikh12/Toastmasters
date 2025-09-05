package com.example.toastMasters.controller;

import com.example.toastMasters.dto.ClubOfficersRequestDTO;
import com.example.toastMasters.dto.ClubOfficersResponseDTO;
import com.example.toastMasters.services.ClubOfficersService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/club-officers")
public class ClubOfficersController {

    private final ClubOfficersService clubOfficersService;

    public ClubOfficersController(ClubOfficersService clubOfficersService) {
        this.clubOfficersService = clubOfficersService;
    }

    @PostMapping("/add")
    public ResponseEntity<ClubOfficersResponseDTO> addClubOfficer(@RequestBody ClubOfficersRequestDTO dto) {
        return ResponseEntity.ok(clubOfficersService.addClubOfficer(dto));
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<ClubOfficersResponseDTO> updateClubOfficer(@PathVariable("id") int clubOfficersId,
                                                       @RequestBody ClubOfficersRequestDTO dto) {
        return ResponseEntity.ok(clubOfficersService.updateClubOfficer(clubOfficersId, dto));
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> deleteClubOfficer(@PathVariable("id") int clubOfficersId) {
        clubOfficersService.deleteClubOfficer(clubOfficersId);
        return ResponseEntity.ok("Club Officer deleted successfully with ID: " + clubOfficersId);
    }

    @GetMapping("/getById/{id}")
    public ResponseEntity<ClubOfficersResponseDTO> getClubOfficerById(@PathVariable("id") int clubOfficersId) {
        return ResponseEntity.ok(clubOfficersService.getClubOfficerById(clubOfficersId));
    }

    @GetMapping("/getAll")
    public ResponseEntity<List<ClubOfficersResponseDTO>> getAllClubOfficers() {
        return ResponseEntity.ok(clubOfficersService.getAllClubOfficers());
    }

    @GetMapping("/getByMemberId/member/{memberId}")
    public ResponseEntity<List<ClubOfficersResponseDTO>> getByMemberId(@PathVariable("memberId") int memberId) {
        return ResponseEntity.ok(clubOfficersService.getByMemberId(memberId));
    }

    @GetMapping("/getByLeadershipRole/role/{role}")
    public ResponseEntity<List<ClubOfficersResponseDTO>> getByLeadershipRole(@PathVariable("role") String leadershipRole) {
        return ResponseEntity.ok(clubOfficersService.getByLeadershipRole(leadershipRole));
    }
}
