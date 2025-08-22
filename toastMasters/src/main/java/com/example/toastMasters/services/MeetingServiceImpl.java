package com.example.toastMasters.services;

import com.example.toastMasters.constants.MeetingConstants;
import com.example.toastMasters.dto.MeetingRequestDTO;
import com.example.toastMasters.dto.MeetingResponseDTO;
import com.example.toastMasters.entity.Meeting;
import com.example.toastMasters.exceptions.MeetingNotFoundException;
import com.example.toastMasters.mapper.MeetingMapper;
import com.example.toastMasters.repositories.MeetingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class MeetingServiceImpl implements MeetingService{

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private MeetingMapper meetingMapper;

    @Override
    public MeetingResponseDTO addMeeting(MeetingRequestDTO requestDTO) {
        Meeting meeting = meetingMapper.toEntity(requestDTO);
        meeting.setDeleted(false);
        Meeting savedMeeting = meetingRepository.save(meeting);
        return meetingMapper.toResponseDTO(savedMeeting);
    }

    @Override
    public List<MeetingResponseDTO> getAllMeetings() {
        List<Meeting> meetings = meetingRepository.findAllByDeletedFalse();
        List<MeetingResponseDTO> responseList = new ArrayList<>();
        for (Meeting meeting : meetings) {
            responseList.add(meetingMapper.toResponseDTO(meeting));
        }
        return responseList;
    }

    @Override
    public MeetingResponseDTO getMeetingById(String meetingId) {
        Meeting meeting = meetingRepository.findByMeetingIdAndDeletedFalse(meetingId);

        if (meeting==null) {
            throw new MeetingNotFoundException(MeetingConstants.MEETING_NOT_FOUND);
        }
        return meetingMapper.toResponseDTO(meeting);    }

    @Override
    public MeetingResponseDTO updateMeeting(String meetingId, MeetingRequestDTO meetingRequestDTO) {
        Meeting meeting = meetingRepository.findByMeetingIdAndDeletedFalse(meetingId);

        if (meeting == null) {
            throw new MeetingNotFoundException(MeetingConstants.MEETING_NOT_FOUND);
        }
        if (meetingRequestDTO.getDate() != null) {
            meeting.setDate(meetingRequestDTO.getDate());
        }
        if (meetingRequestDTO.getStartTime() != null) {
            meeting.setStartTime(meetingRequestDTO.getStartTime());
        }
        if (meetingRequestDTO.getEndTime() != null) {
            meeting.setEndTime(meetingRequestDTO.getEndTime());
        }
        if (meetingRequestDTO.getTheme() != null && !meetingRequestDTO.getTheme().isEmpty()) {
            meeting.setTheme(meetingRequestDTO.getTheme());
        }
        if (meetingRequestDTO.getVenue() != null && !meetingRequestDTO.getVenue().isEmpty()) {
            meeting.setVenue(meetingRequestDTO.getVenue());
        }
        if (meetingRequestDTO.getCategory() != null && !meetingRequestDTO.getCategory().isEmpty()) {
            meeting.setCategory(meetingRequestDTO.getCategory());
        }

        Meeting updatedMeeting = meetingRepository.save(meeting);
        return meetingMapper.toResponseDTO(updatedMeeting);
    }

    @Override
    public void deleteMeeting(String meetingId) {
        Meeting meeting = meetingRepository.findByMeetingIdAndDeletedFalse(meetingId);
        if (meeting==null) {
            throw new MeetingNotFoundException(MeetingConstants.MEETING_NOT_FOUND);
        }
        meeting.setDeleted(true);
        meetingRepository.save(meeting);
    }
}