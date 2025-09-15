package com.example.toastMasters.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class SpeakerEvaluatorMappingRequestDTO {

    private String meetingId;
    private int speakerId;
    private int evaluatorId;
}
