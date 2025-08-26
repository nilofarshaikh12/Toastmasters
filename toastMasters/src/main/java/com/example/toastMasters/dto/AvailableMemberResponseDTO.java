package com.example.toastMasters.dto;

import com.example.toastMasters.AvailabilityEnum.AvailabilityStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.List;

@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class AvailableMemberResponseDTO {
    private Long id;
    private String meetingId;
    private Integer memberId;
    private AvailabilityStatus availabilityStatus;
    private List<RoleResponseDTOForAvailable> preferredRoles;
}
