package com.example.toastMasters.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Meeting {

    @Id
    @GeneratedValue(generator = "meeting-id-generator")
    @GenericGenerator(
            name = "meeting-id-generator",
            strategy = "com.example.toastMasters.config.MeetingIdGenerator"
    )
    @Column(length = 10)
    private String meetingId;

    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private String theme;
    private String venue;
    private String category;

    @Column(nullable = false)
    private boolean deleted = false;
}
