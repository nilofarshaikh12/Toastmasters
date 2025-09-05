package com.example.toastMasters.services;

import com.example.toastMasters.dto.AgendaRequestDTO;
import com.example.toastMasters.dto.AgendaResponseDTO;
import java.util.List;

public interface AgendaService {
    List<AgendaResponseDTO> saveAgendaRows(List<AgendaRequestDTO> agendaRows);

    AgendaResponseDTO getAgendaById(int agendaId);

    List<AgendaResponseDTO> getAgendasByMeetingId(String meetingId);

    List<AgendaResponseDTO> getAgendasByMemberId(int memberId);
}
