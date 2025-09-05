package com.example.toastMasters.repositories;

import com.example.toastMasters.entity.AgendaConstantInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AgendaConstantInfoRepository extends JpaRepository<AgendaConstantInfo, Integer> {

    AgendaConstantInfo findByInfoName(String infoName);
}
