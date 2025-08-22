package com.example.toastMasters.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Data
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int memberId;

    @Column(nullable = false)
    private String memberName;

    @Column(nullable = false, unique = true)
    private String email;
    private String contact;
    private String address;
    private String gender;
    private LocalDate joiningDate;
    private LocalDate dob;
    private String hobbies;
    private String role;

    @Column(nullable = false)
    private String password;
    private Integer mentorId;

    @Column(nullable = false)
    private boolean deleted = false;

    @Column(nullable = false, unique = true, length = 8)
    private String membershipId;
}
