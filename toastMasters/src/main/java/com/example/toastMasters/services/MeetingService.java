package com.example.toastMasters.services;

import java.util.List;
import com.example.toastMasters.dto.MeetingRequestDTO;
import com.example.toastMasters.dto.MeetingResponseDTO;
import org.springframework.stereotype.Service;

@Service
public interface MeetingService {

    MeetingResponseDTO addMeeting(MeetingRequestDTO requestDTO);

    List<MeetingResponseDTO> getAllMeetings();

    MeetingResponseDTO getMeetingById(String meetingId);

    MeetingResponseDTO updateMeeting(String meetingId, MeetingRequestDTO meetingRequestDTO);

    void deleteMeeting(String meetingId);
}
