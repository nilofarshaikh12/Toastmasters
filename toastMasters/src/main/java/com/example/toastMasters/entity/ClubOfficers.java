package com.example.toastMasters.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class ClubOfficers {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int clubOfficersId;
    private String leadershipRole;
    @ManyToOne
    @JoinColumn(name = "memberName",nullable = false)
    private Member member;
}
