package com.example.toastMasters.services;

import com.example.toastMasters.dto.AssignedRoleRequestDTO;
import com.example.toastMasters.dto.AssignedRoleResponseDTO;
import com.example.toastMasters.entity.AssignedRole;
import com.example.toastMasters.entity.Meeting;
import com.example.toastMasters.entity.Member;
import com.example.toastMasters.entity.Roles;
import com.example.toastMasters.mapper.AssignedRoleMapper;
import com.example.toastMasters.repositories.AssignedRoleRepository;
import com.example.toastMasters.repositories.MeetingRepository;
import com.example.toastMasters.repositories.MemberRepository;
import com.example.toastMasters.repositories.RolesRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class AssignedRoleServiceImpl implements AssignedRoleService {

    @Autowired
    private AssignedRoleRepository assignedRoleRepository;

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private RolesRepository roleRepository;

    @Override
    public AssignedRoleResponseDTO assignRole(AssignedRoleRequestDTO requestDTO) {
        // Fetch meeting
        Meeting meeting = meetingRepository.findById(requestDTO.getMeetingId()).orElse(null);
        if (meeting == null) {
            throw new RuntimeException("Meeting not found");
        }

        // Check if meeting is in the past and not forcing assignment
        if (isMeetingInPast(meeting) && !Boolean.TRUE.equals(requestDTO.getForceAssign())) {
            throw new RuntimeException(String.format(
                    "Cannot assign role to past meeting (ID: %s). Set forceAssign to true to override.",
                    requestDTO.getMeetingId()
            ));
        }

        // Fetch member
        Member member = memberRepository.findById(requestDTO.getMemberId()).orElse(null);
        if (member == null) {
            throw new RuntimeException("Member not found");
        }

        // Fetch role
        Roles role = roleRepository.findById(requestDTO.getRoleId()).orElse(null);
        if (role == null) {
            throw new RuntimeException("Role not found");
        }

        // Check duplicate role assignment rules
        validateRoleAssignment(meeting, member, role);

        // Get recent roles (last 3 meetings)
        List<AssignedRole> recentRoles = assignedRoleRepository.findRecentRolesByMember(member);

        int count = 0;
        for (AssignedRole ar : recentRoles) {
            if (count >= 3) {
                break; // only check last 3
            }
            if (ar.getRole() != null && ar.getRole().getRoleId().equals(role.getRoleId())) {
                if (!Boolean.TRUE.equals(requestDTO.getForceAssign())) {
                    throw new RuntimeException("Role already assigned in last 3 meetings");
                }
                // else skip restriction if forceAssign = true
            }
            count++;
        }

        // Save new role assignment
        AssignedRole assignedRole = new AssignedRole();
        assignedRole.setMeeting(meeting);
        assignedRole.setMember(member);
        assignedRole.setRole(role);

        AssignedRole saved = assignedRoleRepository.save(assignedRole);

        return AssignedRoleMapper.toResponseDTO(saved);
    }

    @Override
    public boolean isMeetingInPast(String meetingId) {
        Meeting meeting = meetingRepository.findById(meetingId).orElse(null);
        return meeting != null && isMeetingInPast(meeting);
    }

    private boolean isMeetingInPast(Meeting meeting) {
        if (meeting == null || meeting.getDate() == null) {
            return false;
        }
        LocalDate today = LocalDate.now();
        return meeting.getDate().isBefore(today);
    }

    private void validateRoleAssignment(Meeting meeting, Member member, Roles role) {
        String meetingCategory = meeting.getCategory();
        String roleName = role.getRoleName();

        // Check if role can be duplicated for this meeting type
        boolean canDuplicate = canRoleBeDuplicated(meetingCategory, roleName);

        if (!canDuplicate) {
            // Check if role is already assigned to another member in this meeting
            List<AssignedRole> existingAssignments = assignedRoleRepository.findByMeetingAndRole(meeting, role);

            // Filter out assignments to the same member (in case of updates)
            List<AssignedRole> otherMemberAssignments = existingAssignments.stream()
                    .filter(ar -> ar.getMember() != null && !Objects.equals(ar.getMember().getMemberId(), member.getMemberId()))
                    .collect(Collectors.toList());

            if (!otherMemberAssignments.isEmpty()) {
                String assignedMemberName = otherMemberAssignments.get(0).getMember().getMemberName();
                throw new RuntimeException("Role '" + roleName + "' is already assigned to " + assignedMemberName + ". This role can only be assigned to one person.");
            }
        } else {
            // Check if role has reached maximum count
            List<AssignedRole> allAssignments = assignedRoleRepository.findByMeetingAndRole(meeting, role);
            int currentCount = allAssignments.size();
            int maxCount = getMaxRoleCount(meetingCategory, roleName);

            if (currentCount >= maxCount) {
                throw new RuntimeException("Role '" + roleName + "' has reached maximum assignments (" + currentCount + "/" + maxCount + ")");
            }
        }
    }

    private boolean canRoleBeDuplicated(String meetingCategory, String roleName) {
        if (meetingCategory == null || roleName == null) {
            return false;
        }

        String lowerRoleName = roleName.toLowerCase();

        switch (meetingCategory.toUpperCase()) {
            case "REGULAR_MEETING":
            case "SPECIAL_MILESTONE_MEETING":
                return lowerRoleName.equals("speaker") || lowerRoleName.equals("evaluator");

            case "CONTEST_MEETING":
                return lowerRoleName.equals("contestant") ||
                        lowerRoleName.equals("timer") ||
                        lowerRoleName.equals("evaluator") ||
                        lowerRoleName.equals("speech evaluator");

            default:
                return false;
        }
    }

    private int getMaxRoleCount(String meetingCategory, String roleName) {
        if (meetingCategory == null || roleName == null) {
            return 1;
        }

        String lowerRoleName = roleName.toLowerCase();

        // Special case: Contest meetings have fixed 2 timers maximum
        if ("CONTEST_MEETING".equalsIgnoreCase(meetingCategory) && lowerRoleName.equals("timer")) {
            return 2;
        }

        // Default maximum for duplicatable roles
        return 10;
    }

    @Override
    public List<AssignedRoleResponseDTO> getRolesByMeeting(String meetingId) {
        Meeting meeting = meetingRepository.findById(meetingId).orElse(null);
        if (meeting == null) {
            throw new RuntimeException("Meeting not found");
        }

        List<AssignedRole> roles = assignedRoleRepository.findByMeeting(meeting);

        List<AssignedRoleResponseDTO> responseList = new ArrayList<AssignedRoleResponseDTO>();
        for (AssignedRole ar : roles) {
            responseList.add(AssignedRoleMapper.toResponseDTO(ar));
        }

        return responseList;
    }

    @Override
    public List<AssignedRoleResponseDTO> getMemberRoleHistory(int memberId) {
        Member member = memberRepository.findById(memberId).orElse(null);
        if (member == null) {
            throw new RuntimeException("Member not found");
        }

        List<AssignedRole> recentRoles = assignedRoleRepository.findRecentRolesByMember(member);

        // Map the entities to DTOs
        return recentRoles.stream()
                .limit(3) // Only return the last 3 meetings
                .map(AssignedRoleMapper::toResponseDTO)
                .collect(Collectors.toList());
    }
}