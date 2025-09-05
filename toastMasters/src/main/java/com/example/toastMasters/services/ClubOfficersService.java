package com.example.toastMasters.services;

import com.example.toastMasters.dto.ClubOfficersRequestDTO;
import com.example.toastMasters.dto.ClubOfficersResponseDTO;
import java.util.List;

public interface ClubOfficersService {

    ClubOfficersResponseDTO addClubOfficer(ClubOfficersRequestDTO dto);

    ClubOfficersResponseDTO updateClubOfficer(int clubOfficersId, ClubOfficersRequestDTO dto);

    void deleteClubOfficer(int clubOfficersId);

    ClubOfficersResponseDTO getClubOfficerById(int clubOfficersId);

    List<ClubOfficersResponseDTO> getAllClubOfficers();

    List<ClubOfficersResponseDTO> getByMemberId(int memberId);

    List<ClubOfficersResponseDTO> getByLeadershipRole(String leadershipRole);
}
