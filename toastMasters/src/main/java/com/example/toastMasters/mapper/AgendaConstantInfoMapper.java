package com.example.toastMasters.mapper;

import com.example.toastMasters.dto.AgendaConstantInfoRequestDTO;
import com.example.toastMasters.dto.AgendaConstantInfoResponseDTO;
import com.example.toastMasters.entity.AgendaConstantInfo;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AgendaConstantInfoMapper {

    AgendaConstantInfo toEntity(AgendaConstantInfoRequestDTO dto);

    AgendaConstantInfoResponseDTO toResponseDTO(AgendaConstantInfo entity);
}
