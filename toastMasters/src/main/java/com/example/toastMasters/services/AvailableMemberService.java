package com.example.toastMasters.services;

import com.example.toastMasters.dto.AvailableMemberRequestDTO;
import com.example.toastMasters.dto.AvailableMemberResponseDTO;
import java.util.List;


public interface AvailableMemberService {

    AvailableMemberResponseDTO addAvailableMember(AvailableMemberRequestDTO requestDTO);

    List<AvailableMemberResponseDTO> getAllAvailableMembers();

    AvailableMemberResponseDTO updateAvailableMember(Long id, AvailableMemberRequestDTO requestDTO);

    void deleteAvailableMember(Long id);
}
