package com.example.toastMasters.services;

import com.example.toastMasters.dto.GrammarianRequestDTO;
import com.example.toastMasters.dto.GrammarianResponseDTO;
import com.example.toastMasters.entity.Grammarian;
import com.example.toastMasters.entity.Meeting;
import com.example.toastMasters.entity.Member;
import com.example.toastMasters.exceptions.MeetingNotFoundException;
import com.example.toastMasters.exceptions.MemberNotFoundException;
import com.example.toastMasters.mapper.GrammarianMapper;
import com.example.toastMasters.repositories.GrammarianRepository;
import com.example.toastMasters.repositories.MeetingRepository;
import com.example.toastMasters.repositories.MemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GrammarianServiceImpl implements GrammarianService{

    @Autowired
    private GrammarianRepository grammarianRepository;

    @Autowired
    private GrammarianMapper grammarianMapper;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private MeetingRepository meetingRepository;

    @Override
    public GrammarianResponseDTO addGrammarian(GrammarianRequestDTO dto) {
        Grammarian grammarian = grammarianMapper.toEntity(dto);

        Member member = memberRepository.findByMemberIdAndDeletedFalse(dto.getMemberId());
        System.out.println("Looking for Member with ID: " + dto.getMemberId());
        System.out.println("Found Member: " + member);
        if (member == null) {
            throw new MemberNotFoundException("Member not found with id " + dto.getMemberId());
        }

        Meeting meeting = meetingRepository.findByMeetingIdAndDeletedFalse(dto.getMeetingId());
        System.out.println("Looking for Meeting with ID: " + dto.getMeetingId());
        System.out.println("Found Meeting: " + meeting);
        if (meeting == null) {
            throw new MeetingNotFoundException("Meeting not found with id " + dto.getMeetingId());
        }

        grammarian.setMember(member);
        grammarian.setMeeting(meeting);

        Grammarian saved = grammarianRepository.save(grammarian);
        return grammarianMapper.toResponseDTO(saved);
    }

    @Override
    public GrammarianResponseDTO updateGrammarian(int grammarianId, GrammarianRequestDTO dto) {
        Grammarian existing = grammarianRepository.findById(grammarianId)
                .orElseThrow(() -> new RuntimeException("Grammarian not found with id: " + grammarianId));

        if (dto.getType() != null) existing.setType(dto.getType());
        if (dto.getWord() != null) existing.setWord(dto.getWord());
        if (dto.getMeaning() != null) existing.setMeaning(dto.getMeaning());
        if (dto.getExample() != null) existing.setExample(dto.getExample());

        if (dto.getMemberId() != 0) {
            Member member = memberRepository.findByMemberIdAndDeletedFalse(dto.getMemberId());
            if (member == null) {
                throw new MemberNotFoundException("Member not found with id " + dto.getMemberId());
            }
            existing.setMember(member);
        }

        if (dto.getMeetingId() != null) {
            Meeting meeting = meetingRepository.findByMeetingIdAndDeletedFalse(dto.getMeetingId());
            if (meeting == null) {
                throw new MeetingNotFoundException("Meeting not found with id " + dto.getMeetingId());
            }
            existing.setMeeting(meeting);
        }

        Grammarian updated = grammarianRepository.save(existing);
        return grammarianMapper.toResponseDTO(updated);
    }

    @Override
    public void deleteGrammarian(int grammarianId) {
        if (!grammarianRepository.existsById(grammarianId)) {
            throw new RuntimeException("Grammarian not found with id: " + grammarianId);
        }
        grammarianRepository.deleteById(grammarianId);
    }

    @Override
    public GrammarianResponseDTO getGrammarianById(int grammarianId) {
        Grammarian entity = grammarianRepository.findById(grammarianId)
                .orElseThrow(() -> new RuntimeException("Grammarian not found with id: " + grammarianId));
        return grammarianMapper.toResponseDTO(entity);
    }

    @Override
    public List<GrammarianResponseDTO> getAllGrammarians() {
        return grammarianRepository.findAll()
                .stream()
                .map(grammarianMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<GrammarianResponseDTO> getByMemberId(int memberId) {
        return grammarianRepository.findByMember_MemberId(memberId)
                .stream()
                .map(grammarianMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<GrammarianResponseDTO> getByMeetingId(String meetingId) {
        return grammarianRepository.findByMeeting_MeetingId(meetingId)
                .stream()
                .map(grammarianMapper::toResponseDTO)
                .collect(Collectors.toList());
    }
}
