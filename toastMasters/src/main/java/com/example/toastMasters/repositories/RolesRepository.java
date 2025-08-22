package com.example.toastMasters.repositories;

import com.example.toastMasters.entity.Member;
import com.example.toastMasters.entity.Roles;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RolesRepository extends JpaRepository<Roles,String> {

    Roles findByRoleId(String roleId);

}
