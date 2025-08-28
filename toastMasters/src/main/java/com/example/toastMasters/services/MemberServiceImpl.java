package com.example.toastMasters.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import com.example.toastMasters.constants.MemberConstants;
import com.example.toastMasters.exceptions.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.toastMasters.dto.MemberRequestDTO;
import com.example.toastMasters.dto.MemberResponseDTO;
import com.example.toastMasters.entity.Member;
import com.example.toastMasters.mapper.MemberMapper;
import com.example.toastMasters.repositories.MemberRepository;

@Service
public class MemberServiceImpl implements MemberService {

    @Autowired
    MemberRepository memberRepository;

    @Autowired
    MemberMapper memberMapper;

    private final Random random = new Random();

    private String generateMembershipId() {
        int number = 10000000 + random.nextInt(90000000); // ensures 8-digit
        return String.valueOf(number);
    }

    @Override
    public MemberResponseDTO addMember(MemberRequestDTO requestDTO) {
        if (requestDTO.getDob() != null &&
                java.time.Period.between(requestDTO.getDob(), java.time.LocalDate.now()).getYears() < 18) {
            throw new IllegalArgumentException("Member must be at least 18 years old");
        }

        Member member = memberMapper.toEntity(requestDTO);
        member.setDeleted(false);

        // generate 8-digit membershipId
        String membershipId;
        do {
            membershipId = generateMembershipId();
        } while (memberRepository.existsByMembershipId(membershipId));

        member.setMembershipId(membershipId);

        Member saved = memberRepository.save(member);
        return memberMapper.toResponseDTO(saved);
    }

    @Override
    public List<MemberResponseDTO> getAllMembers() {
        List<Member> members = memberRepository.findAllByDeletedFalse();
        List<MemberResponseDTO> list = new ArrayList<>();
        for (Member mem : members) {
            list.add(memberMapper.toResponseDTO(mem));
        }
        if (list.isEmpty()) {
            throw new MemberNotFoundException(MemberConstants.MEMBER_NOT_FOUND);
        }
        return list;
    }

    @Override
    public MemberResponseDTO getMemberById(Integer memberId) {
        Member member = memberRepository.findByMemberIdAndDeletedFalse(memberId);
        if (member == null) {
            throw new MemberNotFoundException(MemberConstants.MEMBER_NOT_FOUND);
        }
        return memberMapper.toResponseDTO(member);
    }

    @Override
    public MemberResponseDTO updateMember(Integer memberId, MemberRequestDTO memberRequestDTO) {
        Member member = memberRepository.findByMemberIdAndDeletedFalse(memberId);
        if (member == null) {
            throw new MemberUpdateFailedException(MemberConstants.MEMBER_UPDATE_FAILED);
        }

        if (memberRequestDTO.getMemberName() != null) member.setMemberName(memberRequestDTO.getMemberName());
        if (memberRequestDTO.getEmail() != null) member.setEmail(memberRequestDTO.getEmail());
        if (memberRequestDTO.getContact() != null) member.setContact(memberRequestDTO.getContact());
        if (memberRequestDTO.getAddress() != null) member.setAddress(memberRequestDTO.getAddress());
        if (memberRequestDTO.getDob() != null) member.setDob(memberRequestDTO.getDob());
        if (memberRequestDTO.getGender() != null) member.setGender(memberRequestDTO.getGender());
        if (memberRequestDTO.getHobbies() != null) member.setHobbies(memberRequestDTO.getHobbies());
        if (memberRequestDTO.getJoiningDate() != null) member.setJoiningDate(memberRequestDTO.getJoiningDate());
        if (memberRequestDTO.getRole() != null) member.setRole(memberRequestDTO.getRole());
        if (memberRequestDTO.getMentorId() != null) member.setMentorId(memberRequestDTO.getMentorId());
        if (memberRequestDTO.getPassword() != null) member.setPassword(memberRequestDTO.getPassword());

        Member updatedMember = memberRepository.save(member);
        return memberMapper.toResponseDTO(updatedMember);
    }

    @Override
    public void deleteMember(Integer memberId) {
        Member member = memberRepository.findByMemberIdAndDeletedFalse(memberId);
        if (member == null) {
            throw new MemberDeleteFailedException(MemberConstants.MEMBER_DELETE_FAILED);
        }
        member.setDeleted(true);
        memberRepository.save(member);
    }

    @Override
    public MemberResponseDTO login(String email, String password) {
        Member member = memberRepository.findByEmailAndDeletedFalse(email);
        if (member == null || !member.getPassword().equals(password)) {
            throw new MemberNotFoundException("Invalid email or password");
        }
        return memberMapper.toResponseDTO(member);
    }

}
