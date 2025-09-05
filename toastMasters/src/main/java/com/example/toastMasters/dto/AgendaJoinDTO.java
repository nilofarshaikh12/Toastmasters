package com.example.toastMasters.dto;

import com.example.toastMasters.entity.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class AgendaJoinDTO {
    private List<AgendaConstantInfo> agendaConstantInfo;//remain same

    private List<ClubOfficers> clubOfficers;//remain same

    private List<Agenda> agenda;//meetingId

    private List<SpeakerData> speakerSpeech;//userId meetingId

    private List<Grammarian> grammarian;//userId meetingId

    private List<Abbreviations> abbreviations;
}
