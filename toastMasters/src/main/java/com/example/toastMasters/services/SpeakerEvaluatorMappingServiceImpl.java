package com.example.toastMasters.services;

import com.example.toastMasters.dto.EvaluatorWithSpeakersDTO;
import com.example.toastMasters.dto.SpeakerEvaluatorMappingResponseDTO;
import com.example.toastMasters.dto.SpeakerWithEvaluatorsDTO;
import com.example.toastMasters.entity.SpeakerEvaluatorMapping;
import com.example.toastMasters.mapper.SpeakerEvaluatorMappingMapper;
import com.example.toastMasters.repositories.MeetingRepository;
import com.example.toastMasters.repositories.MemberRepository;
import com.example.toastMasters.repositories.SpeakerEvaluatorMappingRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SpeakerEvaluatorMappingServiceImpl implements SpeakerEvaluatorMappingService{

    private final SpeakerEvaluatorMappingRepository mappingRepo;
    private final MeetingRepository meetingRepo;
    private final MemberRepository memberRepo;
    private final SpeakerEvaluatorMappingMapper mapper;

    public SpeakerEvaluatorMappingServiceImpl(SpeakerEvaluatorMappingRepository mappingRepo, MeetingRepository meetingRepo, MemberRepository memberRepo, SpeakerEvaluatorMappingMapper mapper) {
        this.mappingRepo = mappingRepo;
        this.meetingRepo = meetingRepo;
        this.memberRepo = memberRepo;
        this.mapper = mapper;
    }

    @Override
    public SpeakerEvaluatorMappingResponseDTO assignEvaluator(String meetingId, int speakerId, int evaluatorId) {

        boolean exists = mappingRepo.existsByMeeting_MeetingIdAndSpeaker_MemberIdAndEvaluator_MemberId(
                meetingId, speakerId, evaluatorId
        );
        if (exists) {
            throw new IllegalStateException("Mapping already exists for this speaker-evaluator in meeting " + meetingId);
        }

        SpeakerEvaluatorMapping mapping = new SpeakerEvaluatorMapping();

        mapping.setMeeting(meetingRepo.findById(meetingId)
                .orElseThrow(() -> new IllegalArgumentException("Meeting not found with id: " + meetingId)));

        mapping.setSpeaker(memberRepo.findById(speakerId)
                .orElseThrow(() -> new IllegalArgumentException("Speaker not found with id: " + speakerId)));

        mapping.setEvaluator(memberRepo.findById(evaluatorId)
                .orElseThrow(() -> new IllegalArgumentException("Evaluator not found with id: " + evaluatorId)));

        SpeakerEvaluatorMapping saved = mappingRepo.save(mapping);
        return mapper.toDto(saved);
    }

    @Override
    public List<SpeakerEvaluatorMappingResponseDTO> getAllMappingsForMeeting(String meetingId) {
        List<SpeakerEvaluatorMapping> mappings = mappingRepo.findByMeeting_MeetingId(meetingId);
        return mappings.stream()
                .map(mapper::toDto)
                .toList();
    }

    @Override
    public List<SpeakerWithEvaluatorsDTO> getEvaluatorsGroupedBySpeaker(String meetingId) {
        List<SpeakerEvaluatorMapping> mappings = mappingRepo.findByMeeting_MeetingId(meetingId);

        return mappings.stream()
                .collect(Collectors.groupingBy(
                        mapping -> mapping.getSpeaker().getMemberName(),
                        Collectors.mapping(m -> m.getEvaluator().getMemberName(), Collectors.toList())
                ))
                .entrySet().stream()
                .map(e -> new SpeakerWithEvaluatorsDTO(e.getKey(), e.getValue()))
                .toList();
    }

    @Override
    public List<EvaluatorWithSpeakersDTO> getSpeakersGroupedByEvaluator(String meetingId) {
        List<SpeakerEvaluatorMapping> mappings = mappingRepo.findByMeeting_MeetingId(meetingId);

        return mappings.stream()
                .collect(Collectors.groupingBy(
                        mapping -> mapping.getEvaluator().getMemberName(),
                        Collectors.mapping(m -> m.getSpeaker().getMemberName(), Collectors.toList())
                ))
                .entrySet().stream()
                .map(e -> new EvaluatorWithSpeakersDTO(e.getKey(), e.getValue()))
                .toList();
    }

    @Override
    public void deleteMapping(int speakerEvaluatorMappingId) {
        if (!mappingRepo.existsById(speakerEvaluatorMappingId)) {
            throw new IllegalArgumentException("Mapping not found with id: " + speakerEvaluatorMappingId);
        }
        mappingRepo.deleteById(speakerEvaluatorMappingId);
    }

    @Override
    @Transactional
    public void removeEvaluator(String meetingId, int speakerId, int evaluatorId) {
        mappingRepo.deleteByMeeting_MeetingIdAndSpeaker_MemberIdAndEvaluator_MemberId(meetingId, speakerId, evaluatorId);
    }
}
