package com.example.toastMasters.services;

import com.example.toastMasters.dto.AgendaRequestDTO;
import com.example.toastMasters.dto.AgendaResponseDTO;
import com.example.toastMasters.entity.Agenda;
import com.example.toastMasters.entity.Meeting;
import com.example.toastMasters.entity.Member;
import com.example.toastMasters.exceptions.MeetingNotFoundException;
import com.example.toastMasters.mapper.AgendaMapper;
import com.example.toastMasters.repositories.AgendaRepository;
import com.example.toastMasters.repositories.MeetingRepository;
import com.example.toastMasters.repositories.MemberRepository;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AgendaServiceImpl implements AgendaService {

    private final AgendaRepository agendaRepository;
    private final AgendaMapper agendaMapper;
    private final MeetingRepository meetingRepository;
    private final MemberRepository memberRepository;

    public AgendaServiceImpl(AgendaRepository agendaRepository, AgendaMapper agendaMapper,
                             MeetingRepository meetingRepository, MemberRepository memberRepository) {
        this.agendaRepository = agendaRepository;
        this.agendaMapper = agendaMapper;
        this.meetingRepository = meetingRepository;
        this.memberRepository = memberRepository;
    }

    @Override
    public List<AgendaResponseDTO> saveAgendaRows(List<AgendaRequestDTO> agendaRows) {
        if (agendaRows == null || agendaRows.isEmpty()) {
            throw new IllegalArgumentException("Agenda rows cannot be null or empty");
        }

        // Get meetingId from first request row
        String meetingId = agendaRows.get(0).getMeetingId();

        // Fetch meeting
        Meeting meeting = meetingRepository.findByMeetingIdAndDeletedFalse(meetingId);
        if (meeting == null) {
            throw new MeetingNotFoundException("Meeting not found with id " + meetingId);
        }

        // Clear old agendas for this meeting
        agendaRepository.deleteAllByMeeting(meeting);

        // Convert and link entities
        List<Agenda> agendaList = new ArrayList<>();
        for (AgendaRequestDTO dto : agendaRows) {
            Agenda agenda = agendaMapper.toEntity(dto);

            // Set meeting reference
            agenda.setMeeting(meeting);

            // Fetch member reference
            Member member = memberRepository.findByMemberIdAndDeletedFalse(dto.getMemberId());
            if (member == null) {
                throw new RuntimeException("Member not found with id " + dto.getMemberId());
            }
            agenda.setMember(member);

            agendaList.add(agenda);
        }

        // Save all agendas
        List<Agenda> savedAgendas = agendaRepository.saveAll(agendaList);

        // Map to DTOs and enrich with memberName
        return savedAgendas.stream()
                .map(agenda -> {
                    AgendaResponseDTO dto = agendaMapper.toResponseDTO(agenda);
                    dto.setMemberName(agenda.getMember().getMemberName());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    public AgendaResponseDTO getAgendaById(int agendaId) {
        Agenda agenda = agendaRepository.findById(agendaId)
                .orElseThrow(() -> new RuntimeException("Agenda not found with id: " + agendaId));
        AgendaResponseDTO dto = agendaMapper.toResponseDTO(agenda);
        dto.setMemberName(agenda.getMember().getMemberName());
        return dto;
    }

    @Override
    public List<AgendaResponseDTO> getAgendasByMeetingId(String meetingId) {
        List<Agenda> agendas = agendaRepository.findByMeeting_MeetingId(meetingId);
        if (agendas.isEmpty()) {
            throw new MeetingNotFoundException("No agendas found for meeting id " + meetingId);
        }

        return agendas.stream()
                .map(agenda -> {
                    AgendaResponseDTO dto = agendaMapper.toResponseDTO(agenda);
                    dto.setMemberName(agenda.getMember().getMemberName());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<AgendaResponseDTO> getAgendasByMemberId(int memberId) {
        List<Agenda> agendas = agendaRepository.findByMember_MemberId(memberId);
        if (agendas.isEmpty()) {
            throw new RuntimeException("No agendas found for member id " + memberId);
        }

        return agendas.stream()
                .map(agenda -> {
                    AgendaResponseDTO dto = agendaMapper.toResponseDTO(agenda);
                    dto.setMemberName(agenda.getMember().getMemberName());
                    return dto;
                })
                .collect(Collectors.toList());
    }
}
