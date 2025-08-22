package com.example.toastMasters.services;

import com.example.toastMasters.dto.AvailableMemberRequestDTO;
import com.example.toastMasters.dto.AvailableMemberResponseDTO;
import com.example.toastMasters.entity.AvailableMember;
import com.example.toastMasters.entity.Meeting;
import com.example.toastMasters.entity.Member;
import com.example.toastMasters.mapper.AvailableMemberMapper;
import com.example.toastMasters.repositories.AvailableMemberRepository;
import com.example.toastMasters.repositories.MeetingRepository;
import com.example.toastMasters.repositories.MemberRepository;
import com.example.toastMasters.repositories.RolesRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AvailableMemberServiceImpl implements AvailableMemberService {

    @Autowired
    private AvailableMemberRepository availableMemberRepository;

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private RolesRepository rolesRepository;

    @Autowired
    private AvailableMemberMapper availableMemberMapper;

    @Override
    public AvailableMemberResponseDTO addAvailableMember(AvailableMemberRequestDTO requestDTO) {
        Meeting meeting = meetingRepository.findById(requestDTO.getMeetingId()).orElse(null);
        if (meeting == null) {
            throw new RuntimeException("Meeting not found with ID: " + requestDTO.getMeetingId());
        }

        Member member = memberRepository.findById(requestDTO.getMemberId()).orElse(null);
        if (member == null) {
            throw new RuntimeException("Member not found with ID: " + requestDTO.getMemberId());
        }

        AvailableMember availableMember = availableMemberMapper
                .toEntity(requestDTO, meeting, member, rolesRepository);

        availableMember = availableMemberRepository.save(availableMember);

        return availableMemberMapper.toResponseDTO(availableMember);
    }

    @Override
    public List<AvailableMemberResponseDTO> getAllAvailableMembers() {
        List<AvailableMember> availableMembers = availableMemberRepository.findAll();
        List<AvailableMemberResponseDTO> dtoList = new ArrayList<>();

        for (AvailableMember am : availableMembers) {
            dtoList.add(availableMemberMapper.toResponseDTO(am));
        }
        return dtoList;
    }

    @Override
    public AvailableMemberResponseDTO updateAvailableMember(Long id, AvailableMemberRequestDTO requestDTO) {
        AvailableMember availableMember = availableMemberRepository.findById(id).orElse(null);
        if (availableMember == null) {
            throw new RuntimeException("AvailableMember not found with ID: " + id);
        }

        Meeting meeting = meetingRepository.findById(requestDTO.getMeetingId()).orElse(null);
        if (meeting == null) {
            throw new RuntimeException("Meeting not found with ID: " + requestDTO.getMeetingId());
        }

        Member member = memberRepository.findById(requestDTO.getMemberId()).orElse(null);
        if (member == null) {
            throw new RuntimeException("Member not found with ID: " + requestDTO.getMemberId());
        }

        availableMember.setMeeting(meeting);
        availableMember.setMember(member);
        availableMember.setAvailabilityStatus(requestDTO.getAvailabilityStatus());
        availableMember.setPreferredRoles(
                availableMemberMapper.mapRoleIdsToEntities(requestDTO.getPreferredRoleIds(), rolesRepository)
        );

        availableMember = availableMemberRepository.save(availableMember);

        return availableMemberMapper.toResponseDTO(availableMember);
    }

    @Override
    public void deleteAvailableMember(Long id) {
        AvailableMember availableMember = availableMemberRepository.findById(id).orElse(null);
        if (availableMember == null) {
            throw new RuntimeException("AvailableMember not found with ID: " + id);
        }
        availableMemberRepository.delete(availableMember);
    }
}
