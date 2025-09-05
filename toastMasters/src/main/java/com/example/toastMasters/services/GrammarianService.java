package com.example.toastMasters.services;

import com.example.toastMasters.dto.GrammarianRequestDTO;
import com.example.toastMasters.dto.GrammarianResponseDTO;

import java.util.List;

public interface GrammarianService {

    GrammarianResponseDTO addGrammarian(GrammarianRequestDTO dto);

    GrammarianResponseDTO updateGrammarian(int grammarianId, GrammarianRequestDTO dto);

    void deleteGrammarian(int grammarianId);

    GrammarianResponseDTO getGrammarianById(int grammarianId);

    List<GrammarianResponseDTO> getAllGrammarians();

    List<GrammarianResponseDTO> getByMemberId(int memberId);

    List<GrammarianResponseDTO> getByMeetingId(String meetingId);
}
