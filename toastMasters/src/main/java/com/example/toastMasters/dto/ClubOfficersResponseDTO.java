package com.example.toastMasters.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ClubOfficersResponseDTO {
    private int clubOfficersId;
    private String leadershipRole;
    private String memberName;
}
