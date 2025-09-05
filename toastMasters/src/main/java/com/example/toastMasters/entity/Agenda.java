package com.example.toastMasters.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class Agenda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int agendaId;
    private int minTime;
    private int avgTime;
    private int maxTime;
    private String activity;

    @ManyToOne
    @JoinColumn(name="member_id",nullable = false)
    private Member member;

    @ManyToOne
    @JoinColumn(name = "meeting_id",nullable = false)
    private Meeting meeting;

    private LocalDateTime agendaCreatedAt;
}
