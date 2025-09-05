package com.example.toastMasters.dto;

import lombok.*;
import java.time.LocalDateTime;

@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AgendaResponseDTO {
    private int agendaId;
    private int minTime;
    private int avgTime;
    private int maxTime;
    private String activity;
    private int memberId;
    private String meetingId;
    private LocalDateTime agendaCreatedAt;
    private String memberName;
}
