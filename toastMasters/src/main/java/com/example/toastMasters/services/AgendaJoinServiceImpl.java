package com.example.toastMasters.services;

import com.example.toastMasters.dto.AgendaJoinDTO;
import com.example.toastMasters.entity.*;
import com.example.toastMasters.exceptions.ResponseMessage;
import com.example.toastMasters.repositories.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AgendaJoinServiceImpl implements AgendaJoinService {

    private final AgendaConstantInfoRepository agendaConstantInfoRepository;
    private final ClubOfficersRepository clubOfficersRepository;
    private final AgendaRepository agendaRepository;
    private final SpeakerDataRepository speakerDataRepository;
    private final GrammarianRepository grammarianRepository;
    private final AbbreviationsRepository abbreviationsRepository;
    private final MemberRepository memberRepository;
    private final MeetingRepository meetingRepository;

    public AgendaJoinServiceImpl(
            AgendaConstantInfoRepository agendaConstantInfoRepository,
            ClubOfficersRepository clubOfficersRepository,
            AgendaRepository agendaRepository,
            SpeakerDataRepository speakerDataRepository,
            GrammarianRepository grammarianRepository,
            AbbreviationsRepository abbreviationsRepository,
            MemberRepository memberRepository,
            MeetingRepository meetingRepository
    ) {
        this.agendaConstantInfoRepository = agendaConstantInfoRepository;
        this.clubOfficersRepository = clubOfficersRepository;
        this.agendaRepository = agendaRepository;
        this.speakerDataRepository = speakerDataRepository;
        this.grammarianRepository = grammarianRepository;
        this.abbreviationsRepository = abbreviationsRepository;
        this.memberRepository = memberRepository;
        this.meetingRepository = meetingRepository;
    }

    @Override
    public ResponseEntity<ResponseMessage<AgendaJoinDTO>> getAgenda(String meetingId) {
        Meeting meetingData = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting with id " + meetingId + " not found"));

        List<AgendaConstantInfo> staticInfo = agendaConstantInfoRepository.findAll();
        List<ClubOfficers> clubOfficer = clubOfficersRepository.findAll();
        List<Agenda> agendaList = agendaRepository.findByMeeting_MeetingIdOrderByOrderIndexAsc(meetingId);
        List<SpeakerData> speakerSpeeches = speakerDataRepository.findAllByMeeting(meetingData);
        List<Grammarian> grammarians = grammarianRepository.findAllByMeeting(meetingData);
        List<Abbreviations> abbreviationsList = abbreviationsRepository.findAll();

        AgendaJoinDTO agendaJoinDTO = new AgendaJoinDTO();
        agendaJoinDTO.setAgendaConstantInfo(staticInfo);
        agendaJoinDTO.setClubOfficers(clubOfficer);
        agendaJoinDTO.setAgenda(agendaList);
        agendaJoinDTO.setSpeakerSpeech(speakerSpeeches);
        agendaJoinDTO.setGrammarian(grammarians);
        agendaJoinDTO.setAbbreviations(abbreviationsList);

        ResponseMessage<AgendaJoinDTO> responseMessage =
                new ResponseMessage<>("Agenda fetched successfully", HttpStatus.OK.value(), agendaJoinDTO);

        return ResponseEntity.status(HttpStatus.OK).body(responseMessage);
    }


    @Override
    public ResponseEntity<ResponseMessage<AgendaJoinDTO>> updateAgenda(AgendaJoinDTO agendaJoinDTO, String meetingId) {
        // Validate meeting
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting with id " + meetingId + " not found"));

        // Update static agenda info
        if (agendaJoinDTO.getAgendaConstantInfo() != null) {
            for (AgendaConstantInfo info : agendaJoinDTO.getAgendaConstantInfo()) {
                agendaConstantInfoRepository.save(info);
            }
        }

        // Update club officers
        if (agendaJoinDTO.getClubOfficers() != null) {
            for (ClubOfficers officer : agendaJoinDTO.getClubOfficers()) {
                clubOfficersRepository.save(officer);
            }
        }

        // Update agenda (meeting-specific agenda items)
        if (agendaJoinDTO.getAgenda() != null) {
            for (Agenda agenda : agendaJoinDTO.getAgenda()) {
                agenda.setMeeting(meeting); // ensure correct meeting mapping

                // assign orderIndex if null
                if (agenda.getOrderIndex() == null) {
                    int nextIndex = agendaRepository.countByMeeting(meeting) + 1;
                    agenda.setOrderIndex(nextIndex);
                }

                agendaRepository.save(agenda);
            }
        }


        // Update speaker speeches
        if (agendaJoinDTO.getSpeakerSpeech() != null) {
            for (SpeakerData speech : agendaJoinDTO.getSpeakerSpeech()) {
                speech.setMeeting(meeting);
                speakerDataRepository.save(speech);
            }
        }

        // Update grammarian
        if (agendaJoinDTO.getGrammarian() != null) {
            for (Grammarian grammarian : agendaJoinDTO.getGrammarian()) {
                grammarian.setMeeting(meeting);
                grammarianRepository.save(grammarian);
            }
        }

        // Update abbreviations
        if (agendaJoinDTO.getAbbreviations() != null) {
            for (Abbreviations abbr : agendaJoinDTO.getAbbreviations()) {
                abbreviationsRepository.save(abbr);
            }
        }

        // Fetch updated agenda
        AgendaJoinDTO updatedAgenda = getAgenda(meetingId).getBody().getData();

        ResponseMessage<AgendaJoinDTO> responseMessage =
                new ResponseMessage<>("Agenda updated successfully", HttpStatus.OK.value(), updatedAgenda);

        return ResponseEntity.status(HttpStatus.OK).body(responseMessage);
    }
}
