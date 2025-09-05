package com.example.toastMasters.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SpeakerDataRequestDTO {

    private String memberName;
    private String pathwaysTrack;
    private int level;
    private int projectNo;
    private String projectTitle;
    private int minSpeechTime;
    private int maxSpeechTime;
    private String speechTitle;
    private String speechObjectives;
    private int memberId;
    private String meetingId;
}
