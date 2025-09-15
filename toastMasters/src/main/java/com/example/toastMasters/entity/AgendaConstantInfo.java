package com.example.toastMasters.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class AgendaConstantInfo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int AgendaInfoId;
    private String infoName;
    private String infoDetail;
}
