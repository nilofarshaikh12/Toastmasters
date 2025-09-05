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
public class AgendaJoinServiceImpl implements AgendaJoinService{

    private final AgendaConstantInfoRepository agendaConstantInfoRepository;
    private final ClubOfficersRepository clubOfficersRepository;
    private final AgendaRepository agendaRepository;
    private final SpeakerDataRepository speakerDataRepository;
    private final GrammarianRepository grammarianRepository;
    private final AbbreviationsRepository abbreviationsRepository;
    private final MemberRepository memberRepository;
    private final MeetingRepository meetingRepository;

    public AgendaJoinServiceImpl(AgendaConstantInfoRepository agendaConstantInfoRepository, ClubOfficersRepository clubOfficersRepository, AgendaRepository agendaRepository, SpeakerDataRepository speakerDataRepository, GrammarianRepository grammarianRepository, AbbreviationsRepository abbreviationsRepository, MemberRepository memberRepository, MeetingRepository meetingRepository) {
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
    public ResponseEntity<ResponseMessage<AgendaJoinDTO>> getAgenda(int speakerId, int grammarianId,String meetingId) {
       /* Optional<Member> member = memberRepository.findById(memberId);
        Member memberData = member.get();

        Optional<Meeting> meeting = meetingRepository.findById(meetingId);
        Meeting meetingData = meeting.get();*/

        Member speakerData = memberRepository.findById(speakerId)
                .orElseThrow(() -> new RuntimeException("Member with id " + speakerId + " not found"));

        Member grammarianData = memberRepository.findById(grammarianId)
                .orElseThrow(() -> new RuntimeException("Member with id " + grammarianId + " not found"));

        Meeting meetingData = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting with id " + meetingId + " not found"));

        List<AgendaConstantInfo> staticInfo = agendaConstantInfoRepository.findAll();

        List<ClubOfficers> clubOfficer = clubOfficersRepository.findAll();

        List<Agenda> agendaList = agendaRepository.findAllByMeeting(meetingData);

        List<SpeakerData> speakerSpeeches = speakerDataRepository.findAllByMemberAndMeeting(speakerData, meetingData);

        List<Grammarian> grammarians = grammarianRepository.findAllByMemberAndMeeting(grammarianData, meetingData);

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
}
