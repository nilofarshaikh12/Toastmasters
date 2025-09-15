package com.example.toastMasters.dto;

import lombok.*;

@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AgendaRequestDTO {
    private int minTime;
    private int avgTime;
    private int maxTime;
    private String activity;
    private int memberId;
    private String meetingId;
    private Integer orderIndex;
}
