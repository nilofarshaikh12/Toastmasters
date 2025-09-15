package com.example.toastMasters.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class SpeakerEvaluatorMappingResponseDTO {

    private int speakerEvaluatorMappingid;
    private String meetingId;
    private int speakerId;
    private String speakerName;
    private int evaluatorId;
    private String evaluatorName;
}
