package com.example.toastMasters.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SpeakerDataResponseDTO {

    private int speakerId;
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
    private LocalDateTime speechCreatedAt;
}
