package com.example.toastMasters.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Grammarian {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int grammarianId;
    private String type;
    private String word;
    private String meaning;
    private String example;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;
    private LocalDateTime grammarianDataCreatedAt;
}
