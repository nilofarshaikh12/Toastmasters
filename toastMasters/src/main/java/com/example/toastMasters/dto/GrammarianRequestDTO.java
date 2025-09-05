package com.example.toastMasters.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class GrammarianRequestDTO {
    private String type;
    private String word;
    private String meaning;
    private String example;
    private int memberId;
    private String meetingId;
}
