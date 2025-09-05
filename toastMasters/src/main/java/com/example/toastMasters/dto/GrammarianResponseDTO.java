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
public class GrammarianResponseDTO {
    private int grammarianId;
    private String type;
    private String word;
    private String meaning;
    private String example;
    private int memberId;
    private String meetingId;
    private LocalDateTime grammarianDataCreatedAt;
}
