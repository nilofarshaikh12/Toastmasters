package com.example.toastMasters.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class EvaluatorWithSpeakersDTO {
    private String evaluatorName;
    private List<String> speakerNames;
}
