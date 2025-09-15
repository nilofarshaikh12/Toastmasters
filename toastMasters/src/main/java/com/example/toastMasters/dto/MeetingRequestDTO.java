package com.example.toastMasters.dto;

import jakarta.persistence.Column;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;


@Data
@AllArgsConstructor
@NoArgsConstructor
public class MeetingRequestDTO {
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    @Column(unique = true)
    private String theme;
    private String venue;
    private String category;
    private List<MeetingRoleDTO> roles;
    private boolean isPublish;
}
