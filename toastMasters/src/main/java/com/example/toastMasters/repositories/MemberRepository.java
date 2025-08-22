package com.example.toastMasters.repositories;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.toastMasters.entity.Member;

public interface MemberRepository extends JpaRepository<Member, Integer> {
    List<Member> findAllByDeletedFalse();
    Member findByMemberIdAndDeletedFalse(Integer memberId);
    boolean existsByMembershipId(String membershipId);
    Member findByMembershipIdAndDeletedFalse(String membershipId);
}
