package com.example.toastMasters.services;

import java.util.List;
import org.springframework.stereotype.Repository;
import com.example.toastMasters.dto.MemberRequestDTO;
import com.example.toastMasters.dto.MemberResponseDTO;

@Repository
public interface MemberService {

    MemberResponseDTO addMember(MemberRequestDTO requestDTO);

    List<MemberResponseDTO> getAllMembers();

    MemberResponseDTO getMemberById(Integer memberId);

    MemberResponseDTO updateMember(Integer memberId, MemberRequestDTO memberRequestDTO);

    void deleteMember(Integer memberId);
}
