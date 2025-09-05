package com.example.toastMasters.services;

import com.example.toastMasters.dto.ClubOfficersRequestDTO;
import com.example.toastMasters.dto.ClubOfficersResponseDTO;
import com.example.toastMasters.entity.ClubOfficers;
import com.example.toastMasters.entity.Member;
import com.example.toastMasters.exceptions.MemberNotFoundException;
import com.example.toastMasters.mapper.ClubOfficersMapper;
import com.example.toastMasters.repositories.ClubOfficersRepository;
import com.example.toastMasters.repositories.MemberRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ClubOfficersServiceImpl implements ClubOfficersService{

    private final ClubOfficersRepository clubOfficersRepository;
    private final MemberRepository memberRepository;
    private final ClubOfficersMapper mapper;

    public ClubOfficersServiceImpl(ClubOfficersRepository clubOfficersRepository,
                                   MemberRepository memberRepository, ClubOfficersMapper mapper) {
        this.clubOfficersRepository = clubOfficersRepository;
        this.memberRepository = memberRepository;
        this.mapper = mapper;
    }

    @Override
    public ClubOfficersResponseDTO addClubOfficer(ClubOfficersRequestDTO dto) {
        Member member = memberRepository.findByMemberIdAndDeletedFalse(dto.getMemberId());
        if (member == null) {
            throw new MemberNotFoundException("Member not found with id " + dto.getMemberId());
        }

        ClubOfficers clubOfficers = mapper.toEntity(dto);
        clubOfficers.setMember(member);

        ClubOfficers saved = clubOfficersRepository.save(clubOfficers);
        return mapper.toResponseDTO(saved);
    }

    @Override
    public ClubOfficersResponseDTO updateClubOfficer(int clubOfficersId, ClubOfficersRequestDTO dto) {
        ClubOfficers existing = clubOfficersRepository.findById(clubOfficersId)
                .orElseThrow(() -> new RuntimeException("ClubOfficer not found with id: " + clubOfficersId));

        if (dto.getLeadershipRole() != null) {
            existing.setLeadershipRole(dto.getLeadershipRole());
        }

        if (dto.getMemberId() != 0) {
            Member member = memberRepository.findByMemberIdAndDeletedFalse(dto.getMemberId());
            if (member == null) {
                throw new MemberNotFoundException("Member not found with id " + dto.getMemberId());
            }
            existing.setMember(member);
        }

        ClubOfficers updated = clubOfficersRepository.save(existing);
        return mapper.toResponseDTO(updated);
    }

    @Override
    public void deleteClubOfficer(int clubOfficersId) {
        if (!clubOfficersRepository.existsById(clubOfficersId)) {
            throw new RuntimeException("ClubOfficer not found with id: " + clubOfficersId);
        }
        clubOfficersRepository.deleteById(clubOfficersId);
    }

    @Override
    public ClubOfficersResponseDTO getClubOfficerById(int clubOfficersId) {
        ClubOfficers entity = clubOfficersRepository.findById(clubOfficersId)
                .orElseThrow(() -> new RuntimeException("ClubOfficer not found with id: " + clubOfficersId));
        return mapper.toResponseDTO(entity);
    }

    @Override
    public List<ClubOfficersResponseDTO> getAllClubOfficers() {
        return clubOfficersRepository.findAll()
                .stream()
                .map(mapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<ClubOfficersResponseDTO> getByMemberId(int memberId) {
        return clubOfficersRepository.findByMember_MemberId(memberId)
                .stream()
                .map(mapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<ClubOfficersResponseDTO> getByLeadershipRole(String leadershipRole) {
        return clubOfficersRepository.findByLeadershipRole(leadershipRole)
                .stream()
                .map(mapper::toResponseDTO)
                .collect(Collectors.toList());
    }
}
