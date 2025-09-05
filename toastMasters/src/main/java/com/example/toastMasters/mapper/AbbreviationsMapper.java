package com.example.toastMasters.mapper;

import com.example.toastMasters.dto.AbbreviationsRequestDTO;
import com.example.toastMasters.dto.AbbreviationsResponseDTO;
import com.example.toastMasters.entity.Abbreviations;
import org.mapstruct.Mapper;


@Mapper(componentModel = "spring")
public interface AbbreviationsMapper {

    Abbreviations toEntity(AbbreviationsRequestDTO dto);

    AbbreviationsResponseDTO toResponseDTO(Abbreviations entity);
}
