package com.example.toastMasters.entity;

import com.example.toastMasters.AvailabilityEnum.AvailabilityStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AvailableMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;

    @ManyToOne
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Enumerated(EnumType.STRING)
    @Column(name = "availability_status", nullable = false)
    private AvailabilityStatus availabilityStatus;

    @ManyToMany
    @JoinTable(
            name = "available_member_preferred_roles",
            joinColumns = @JoinColumn(name = "available_member_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Roles> preferredRoles = new HashSet<>();
}
