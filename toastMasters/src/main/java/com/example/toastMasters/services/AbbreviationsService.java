package com.example.toastMasters.services;

import com.example.toastMasters.dto.AbbreviationsRequestDTO;
import com.example.toastMasters.dto.AbbreviationsResponseDTO;
import java.util.List;


public interface AbbreviationsService {
    AbbreviationsResponseDTO createAbbreviation(AbbreviationsRequestDTO dto);
    AbbreviationsResponseDTO getAbbreviationById(int abbreviationId);
    List<AbbreviationsResponseDTO> getAllAbbreviations();
    AbbreviationsResponseDTO updateAbbreviation(int abbreviationId, AbbreviationsRequestDTO dto);
    void deleteAbbreviation(int abbreviationId);
}
