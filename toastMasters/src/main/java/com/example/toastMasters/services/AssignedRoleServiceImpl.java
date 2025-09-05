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
import java.util.Optional;

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
        Meeting meeting = meetingRepository.findById(requestDTO.getMeetingId()).orElseThrow(() -> new RuntimeException("Meeting not found"));

        // Fetch member
        Member member = memberRepository.findById(requestDTO.getMemberId()).orElseThrow(() -> new RuntimeException("Member not found"));

        // Fetch role
        Roles role = roleRepository.findById(requestDTO.getRoleId()).orElseThrow(() -> new RuntimeException("Role not found"));

        // All validation checks that can be overridden by forceAssign
        if (!Boolean.TRUE.equals(requestDTO.getForceAssign())) {
            // Check if meeting is in the past
            if (isMeetingInPast(meeting)) {
                throw new RuntimeException(String.format(
                        "Cannot assign role to past meeting (ID: %s). Set forceAssign to true to override.",
                        requestDTO.getMeetingId()
                ));
            }

//            // Check recent roles (This logic is currently commented out, so we'll leave it as is)
//            List<AssignedRole> recentRoles = assignedRoleRepository.findRecentRolesByMember(member);
//            long roleCount = recentRoles.stream()
//                    .filter(ar -> ar.getRole() != null && Objects.equals(ar.getRole().getRoleId(), role.getRoleId()))
//                    .count();
//
//            if (roleCount > 0) {
//                throw new RuntimeException("Role already assigned in last 3 meetings");
//            }
        }

        // A true conflict that cannot be overridden
        validateRoleAssignment(meeting, member, role, requestDTO.getInstanceNumber());

        // Save or update new role assignment
        Optional<AssignedRole> existingAssignment = Optional.empty();

        // If an instance number is provided, we check for that specific instance.
        // If not, we check for any existing assignment of this role to this member.
        if (requestDTO.getInstanceNumber() != null) {
            existingAssignment = assignedRoleRepository.findByMeetingAndRoleAndInstanceNumber(meeting, role, requestDTO.getInstanceNumber());
        } else {
            // This part handles the case where no instance number is provided.
            // It will check if the role is already assigned to the member for this meeting.
            existingAssignment = assignedRoleRepository.findByMeetingAndRole(meeting, role).stream()
                    .filter(ar -> Objects.equals(ar.getMember().getMemberId(), member.getMemberId()))
                    .findFirst();
        }

        AssignedRole assignedRole;

        if (existingAssignment.isPresent()) {
            assignedRole = existingAssignment.get();
            // A true conflict occurs if a different member has the role and we are NOT forcing assignment
            if (!Objects.equals(assignedRole.getMember().getMemberId(), member.getMemberId()) && !Boolean.TRUE.equals(requestDTO.getForceAssign())) {
                throw new RuntimeException("This specific role instance is already assigned to another member.");
            }
        } else {
            // Check for max count only when creating a new assignment,
            // and only for duplicatable roles.
            if (canRoleBeDuplicated(meeting.getCategory(), role.getRoleName())) {
                List<AssignedRole> allAssignmentsForRole = assignedRoleRepository.findByMeetingAndRole(meeting, role);
                int maxCount = getMaxRoleCount(meeting.getCategory(), role.getRoleName());
                if (allAssignmentsForRole.size() >= maxCount) {
                    throw new RuntimeException("Role '" + role.getRoleName() + "' has reached maximum assignments (" + allAssignmentsForRole.size() + "/" + maxCount + ")");
                }

                // If instance number is null, assign the next available instance number
                if (requestDTO.getInstanceNumber() == null) {
                    int nextInstanceNumber = allAssignmentsForRole.size() + 1;
                    if (nextInstanceNumber > maxCount) {
                        throw new RuntimeException("Role '" + role.getRoleName() + "' has reached maximum assignments. Cannot assign a new instance.");
                    }
                    requestDTO.setInstanceNumber(nextInstanceNumber);
                }
            } else {
                // If it's a single-instance role and no instance number is provided, default to 1
                if (requestDTO.getInstanceNumber() == null) {
                    requestDTO.setInstanceNumber(1);
                }
            }

            assignedRole = new AssignedRole();
        }

        // Set the fields of the assigned role
        assignedRole.setMeeting(meeting);
        assignedRole.setMember(member);
        assignedRole.setRole(role);
        assignedRole.setInstanceNumber(requestDTO.getInstanceNumber());

        AssignedRole saved = assignedRoleRepository.save(assignedRole);

        return AssignedRoleMapper.toResponseDTO(saved);
    }

    @Override
    public boolean isMeetingInPast(String meetingId) {
        Meeting meeting = meetingRepository.findById(meetingId).orElse(null);
        return meeting != null && isMeetingInPast(meeting);
    }

    @Override
    public boolean deleteAssignedRole(Long assignedRoleId) {
        if (assignedRoleId == null) {
            return false;
        }
        try {
            assignedRoleRepository.deleteById(assignedRoleId);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isMeetingInPast(Meeting meeting) {
        if (meeting == null || meeting.getDate() == null) {
            return false;
        }
        LocalDate today = LocalDate.now();
        return meeting.getDate().isBefore(today);
    }

    private void validateRoleAssignment(Meeting meeting, Member member, Roles role, Integer instanceNumber) {
        String meetingCategory = meeting.getCategory();
        String roleName = role.getRoleName();

        boolean canDuplicate = canRoleBeDuplicated(meetingCategory, roleName);

        if (!canDuplicate) {
            // Logic for non-duplicatable roles
            if (instanceNumber != null && instanceNumber > 1) {
                throw new RuntimeException("A non-duplicatable role cannot have an instance number greater than 1.");
            }
            // Check if this single-instance role is already assigned
            List<AssignedRole> existingAssignments = assignedRoleRepository.findByMeetingAndRole(meeting, role);
            if (!existingAssignments.isEmpty()) {
                AssignedRole existing = existingAssignments.get(0);
                if (!Objects.equals(existing.getMember().getMemberId(), member.getMemberId())) {
                    throw new RuntimeException("Role '" + roleName + "' is already assigned to another member. This role can only be assigned to one person.");
                }
            }
        } else {
            // Logic for duplicatable roles
            int maxCount = getMaxRoleCount(meetingCategory, roleName);

            // If an instance number is provided, validate its range
            if (instanceNumber != null && (instanceNumber < 1 || instanceNumber > maxCount)) {
                throw new RuntimeException("Invalid instance number. Must be between 1 and " + maxCount + ".");
            }

            // If a specific instance is requested, check if it's already taken by another member.
            if (instanceNumber != null) {
                Optional<AssignedRole> existingInstanceAssignment = assignedRoleRepository.findByMeetingAndRoleAndInstanceNumber(meeting, role, instanceNumber);
                if (existingInstanceAssignment.isPresent()) {
                    AssignedRole assigned = existingInstanceAssignment.get();
                    if (!Objects.equals(assigned.getMember().getMemberId(), member.getMemberId())) {
                        throw new RuntimeException("Instance " + instanceNumber + " of role '" + roleName + "' is already assigned to another member.");
                    }
                }
            }
            // If no instance number is provided, we check if the member already has this role in this meeting.
            // This prevents a member from holding the same duplicatable role multiple times unless a specific instance is requested.
            else {
                List<AssignedRole> assignmentsForMember = assignedRoleRepository.findByMeetingAndMemberAndRole(meeting, member, role);
                if (!assignmentsForMember.isEmpty()) {
                    throw new RuntimeException("Member already assigned to role '" + roleName + "'. To assign another instance, please provide an instance number.");
                }
            }
        }
    }


    private boolean canRoleBeDuplicated(String meetingCategory, String roleName) {
        if (meetingCategory == null || roleName == null) {
            return false;
        }

        String lowerRoleName = roleName.toLowerCase();

        switch (meetingCategory.toUpperCase()) {
            case "REGULAR":
            case "CONTEST":
            case "SPECIAL":
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

        if ("CONTEST_MEETING".equalsIgnoreCase(meetingCategory) && lowerRoleName.equals("timer")) {
            return 2;
        }

        return 50;
    }

    @Override
    public List<AssignedRoleResponseDTO> getRolesByMeeting(String meetingId) {
        Meeting meeting = meetingRepository.findById(meetingId).orElse(null);
        if (meeting == null) {
            throw new RuntimeException("Meeting not found");
        }

        List<AssignedRole> roles = assignedRoleRepository.findByMeeting(meeting);

        List<AssignedRoleResponseDTO> responseList = new ArrayList<>();
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

        return recentRoles.stream()
                .limit(3)
                .map(AssignedRoleMapper::toResponseDTO)
                .collect(Collectors.toList());
    }
}