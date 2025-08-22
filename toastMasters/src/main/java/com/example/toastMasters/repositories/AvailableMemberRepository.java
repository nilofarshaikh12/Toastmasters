package com.example.toastMasters.repositories;

import com.example.toastMasters.entity.AvailableMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface AvailableMemberRepository extends JpaRepository<AvailableMember, Long> {
}
