package com.example.toastMasters.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;


@Data
@AllArgsConstructor
@NoArgsConstructor
public class MeetingResponseDTO {
    private String meetingId;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private String theme;
    private String venue;
    private String category;
    private List<MeetingRoleDTO> roles;
    private boolean isPublish;
}
