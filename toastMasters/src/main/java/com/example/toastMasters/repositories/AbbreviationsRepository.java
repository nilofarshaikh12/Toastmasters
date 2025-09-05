package com.example.toastMasters.repositories;

import com.example.toastMasters.entity.Abbreviations;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AbbreviationsRepository extends JpaRepository<Abbreviations,Integer> {
    Abbreviations findByAbbreviation(String abbreviation);
}
