package com.example.toastMasters.dto;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MemberResponseDTO {

    private int memberId;
    private String membershipId;
    private String memberName;
    private String email;
    private String contact;
    private String address;
    private String gender;
    private LocalDate joiningDate;
    private LocalDate dob;
    private String hobbies;
    private String role;
    private Integer mentorId;
}
