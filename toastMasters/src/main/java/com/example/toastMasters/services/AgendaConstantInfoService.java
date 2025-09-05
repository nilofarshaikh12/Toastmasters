package com.example.toastMasters.services;

import com.example.toastMasters.dto.AgendaConstantInfoRequestDTO;
import com.example.toastMasters.dto.AgendaConstantInfoResponseDTO;
import java.util.List;

public interface AgendaConstantInfoService {

    AgendaConstantInfoResponseDTO createAgendaInfo(AgendaConstantInfoRequestDTO dto);

    AgendaConstantInfoResponseDTO updateAgendaInfo(int agendaInfoId, AgendaConstantInfoRequestDTO dto);

    AgendaConstantInfoResponseDTO getAgendaInfoById(int agendaInfoId);

    List<AgendaConstantInfoResponseDTO> getAllAgendaInfo();

    void deleteAgendaInfo(int agendaInfoId);
}
