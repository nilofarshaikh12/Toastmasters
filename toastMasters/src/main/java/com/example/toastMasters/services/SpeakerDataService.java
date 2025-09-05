package com.example.toastMasters.services;

import com.example.toastMasters.dto.SpeakerDataRequestDTO;
import com.example.toastMasters.dto.SpeakerDataResponseDTO;
import java.util.List;

public interface SpeakerDataService {

    SpeakerDataResponseDTO addSpeakerData(SpeakerDataRequestDTO dto);

    SpeakerDataResponseDTO updateSpeakerData(int speakerId, SpeakerDataRequestDTO dto);

    void deleteSpeakerData(int speakerId);

    SpeakerDataResponseDTO getSpeakerDataById(int speakerId);

    List<SpeakerDataResponseDTO> getAllSpeakerData();

    List<SpeakerDataResponseDTO> getByMemberId(int memberId);

    List<SpeakerDataResponseDTO> getByMeetingId(String meetingId);
}
