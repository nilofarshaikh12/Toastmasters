package com.example.toastMasters.mapper;

import com.example.toastMasters.dto.ClubOfficersRequestDTO;
import com.example.toastMasters.dto.ClubOfficersResponseDTO;
import com.example.toastMasters.entity.ClubOfficers;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;


@Mapper(componentModel = "spring")
public interface ClubOfficersMapper {

    @Mapping(source = "member.memberName", target = "memberName")
    ClubOfficersResponseDTO toResponseDTO(ClubOfficers entity);

    @Mapping(target = "clubOfficersId", ignore = true)
    @Mapping(target = "member", ignore = true)
    ClubOfficers toEntity(ClubOfficersRequestDTO dto);
}
