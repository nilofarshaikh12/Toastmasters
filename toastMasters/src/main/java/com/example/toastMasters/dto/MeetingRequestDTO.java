package com.example.toastMasters.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalTime;


@Data
@AllArgsConstructor
@NoArgsConstructor
public class MeetingRequestDTO {
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private String theme;
    private String venue;
    private String category;
}
