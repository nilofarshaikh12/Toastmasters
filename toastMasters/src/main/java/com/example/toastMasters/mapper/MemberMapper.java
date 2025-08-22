package com.example.toastMasters.mapper;

import org.mapstruct.Mapper;
import com.example.toastMasters.dto.MemberRequestDTO;
import com.example.toastMasters.dto.MemberResponseDTO;
import com.example.toastMasters.entity.Member;

@Mapper(componentModel = "spring")
public interface MemberMapper {

    Member toEntity(MemberRequestDTO memberRequestDTO);

    MemberResponseDTO toResponseDTO(Member member);
}
