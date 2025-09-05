package com.example.toastMasters.services;

import com.example.toastMasters.dto.AgendaJoinDTO;
import com.example.toastMasters.exceptions.ResponseMessage;
import org.springframework.http.ResponseEntity;

public interface AgendaJoinService {
    ResponseEntity<ResponseMessage<AgendaJoinDTO>> getAgenda(int speakerId,int grammarianId, String meetingId);
}
