package com.example.toastMasters.services;

import com.example.toastMasters.dto.SpeakerDataRequestDTO;
import com.example.toastMasters.dto.SpeakerDataResponseDTO;
import com.example.toastMasters.entity.Meeting;
import com.example.toastMasters.entity.Member;
import com.example.toastMasters.entity.SpeakerData;
import com.example.toastMasters.exceptions.MeetingNotFoundException;
import com.example.toastMasters.exceptions.MemberNotFoundException;
import com.example.toastMasters.mapper.SpeakerDataMapper;
import com.example.toastMasters.repositories.MeetingRepository;
import com.example.toastMasters.repositories.MemberRepository;
import com.example.toastMasters.repositories.SpeakerDataRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SpeakerDataServiceImpl implements SpeakerDataService {

    @Autowired
    private SpeakerDataRepository speakerDataRepository;

    @Autowired
    private SpeakerDataMapper speakerDataMapper;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private MeetingRepository meetingRepository;

    @Override
    public SpeakerDataResponseDTO addSpeakerData(SpeakerDataRequestDTO requestDTO) {
        SpeakerData speakerData = speakerDataMapper.toEntity(requestDTO);

        Member member = memberRepository.findByMemberIdAndDeletedFalse(requestDTO.getMemberId());
        System.out.println("Looking for Member with ID: " + requestDTO.getMemberId());
        System.out.println("Found Member: " + member);
        if (member == null) {
            throw new MemberNotFoundException("Member not found or deleted with id: " + requestDTO.getMemberId());
        }

        Meeting meeting = meetingRepository.findByMeetingIdAndDeletedFalse(requestDTO.getMeetingId());
        System.out.println("Looking for Meeting with ID: " + requestDTO.getMeetingId());
        System.out.println("Found Meeting: " + meeting);
        if (meeting == null) {
            throw new MeetingNotFoundException("Meeting not found or deleted with id: " + requestDTO.getMeetingId());
        }

        speakerData.setMember(member);
        speakerData.setMeeting(meeting);

        if (speakerData.getSpeechCreatedAt() == null) {
            speakerData.setSpeechCreatedAt(LocalDateTime.now());
        }

        SpeakerData saved = speakerDataRepository.save(speakerData);
        return speakerDataMapper.toResponseDTO(saved);
    }

    @Override
    public SpeakerDataResponseDTO updateSpeakerData(int speakerId, SpeakerDataRequestDTO dto) {
        SpeakerData existing = speakerDataRepository.findById(speakerId)
                .orElseThrow(() -> new RuntimeException("SpeakerData not found with id: " + speakerId));

        if (dto.getMemberName() != null) existing.setMemberName(dto.getMemberName());
        if (dto.getPathwaysTrack() != null) existing.setPathwaysTrack(dto.getPathwaysTrack());
        if (dto.getLevel() > 0) existing.setLevel(dto.getLevel());
        if (dto.getProjectNo() > 0) existing.setProjectNo(dto.getProjectNo());
        if (dto.getProjectTitle() != null) existing.setProjectTitle(dto.getProjectTitle());
        if (dto.getMinSpeechTime() != 0) existing.setMinSpeechTime(dto.getMinSpeechTime());
        if (dto.getMaxSpeechTime() != 0) existing.setMaxSpeechTime(dto.getMaxSpeechTime());
        if (dto.getSpeechTitle() != null) existing.setSpeechTitle(dto.getSpeechTitle());
        if (dto.getSpeechObjectives() != null) existing.setSpeechObjectives(dto.getSpeechObjectives());

        // Update Member if provided
        if (dto.getMemberId() > 0) {
            Member member = memberRepository.findByMemberIdAndDeletedFalse(dto.getMemberId());
            System.out.println("Looking for Member with ID (update): " + dto.getMemberId());
            System.out.println("Found Member (update): " + member);
            if (member == null) {
                throw new MemberNotFoundException("Member not found or deleted with id: " + dto.getMemberId());
            }
            existing.setMember(member);
        }

        // Update Meeting if provided
        if (dto.getMeetingId() != null) {
            Meeting meeting = meetingRepository.findByMeetingIdAndDeletedFalse(dto.getMeetingId());
            System.out.println("Looking for Meeting with ID (update): " + dto.getMeetingId());
            System.out.println("Found Meeting (update): " + meeting);
            if (meeting == null) {
                throw new MeetingNotFoundException("Meeting not found or deleted with id: " + dto.getMeetingId());
            }
            existing.setMeeting(meeting);
        }

        SpeakerData updated = speakerDataRepository.save(existing);
        return speakerDataMapper.toResponseDTO(updated);
    }

    @Override
    public void deleteSpeakerData(int speakerId) {
        if (!speakerDataRepository.existsById(speakerId)) {
            throw new RuntimeException("SpeakerData not found with id: " + speakerId);
        }
        speakerDataRepository.deleteById(speakerId);
        System.out.println("Deleted SpeakerData with id: " + speakerId);
    }

    @Override
    public SpeakerDataResponseDTO getSpeakerDataById(int speakerId) {
        SpeakerData entity = speakerDataRepository.findById(speakerId)
                .orElseThrow(() -> new RuntimeException("SpeakerData not found with id: " + speakerId));
        return speakerDataMapper.toResponseDTO(entity);
    }

    @Override
    public List<SpeakerDataResponseDTO> getAllSpeakerData() {
        return speakerDataRepository.findAll()
                .stream()
                .map(speakerDataMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<SpeakerDataResponseDTO> getByMemberId(int memberId) {
        return speakerDataRepository.findByMember_MemberId(memberId)
                .stream()
                .map(speakerDataMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<SpeakerDataResponseDTO> getByMeetingId(String meetingId) {
        return speakerDataRepository.findByMeeting_MeetingId(meetingId)
                .stream()
                .map(speakerDataMapper::toResponseDTO)
                .collect(Collectors.toList());
    }
}
