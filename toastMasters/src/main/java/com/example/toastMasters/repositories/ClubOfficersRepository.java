package com.example.toastMasters.repositories;

import com.example.toastMasters.entity.ClubOfficers;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ClubOfficersRepository extends JpaRepository<ClubOfficers, Integer> {

    List<ClubOfficers> findByMember_MemberId(int memberId);

    List<ClubOfficers> findByLeadershipRole(String leadershipRole);
}
