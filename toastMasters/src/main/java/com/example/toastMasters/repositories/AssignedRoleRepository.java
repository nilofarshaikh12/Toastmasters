package com.example.toastMasters.repositories;

import com.example.toastMasters.entity.AssignedRole;
import com.example.toastMasters.entity.Member;
import com.example.toastMasters.entity.Meeting;
import com.example.toastMasters.entity.Roles;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssignedRoleRepository extends JpaRepository<AssignedRole, Long> {

    // Get assigned roles for a member ordered by meeting date (latest first)
    @Query("SELECT ar FROM AssignedRole ar " +
            "WHERE ar.member = :member " +
            "ORDER BY ar.meeting.date DESC")
    List<AssignedRole> findRecentRolesByMember(Member member);

    List<AssignedRole> findByMeeting(Meeting meeting);
    List<AssignedRole> findByMeetingAndRole(Meeting meeting, Roles role);

    // Method to find a specific role instance within a meeting
    Optional<AssignedRole> findByMeetingAndRoleAndInstanceNumber(Meeting meeting, Roles role, Integer instanceNumber);

    // Method to find all assignments for a given meeting, member, and role
    List<AssignedRole> findByMeetingAndMemberAndRole(Meeting meeting, Member member, Roles role);
}