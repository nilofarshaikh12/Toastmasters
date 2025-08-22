package com.example.toastMasters.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Roles {

        @Id
        @GeneratedValue(generator = "role-id-generator")
        @GenericGenerator(
                name = "role-id-generator",
                strategy = "com.example.toastMasters.config.RoleIdGenerator"
        )
        @Column(length = 10)
        private String roleId;

        @Column(nullable = false, length = 50)
        private String roleName;

        @Column(nullable = false, length = 100)
        private String roleDescription;

        @Column(length = 255)
        private String rolePlayerDocument;

        private String category;
}
