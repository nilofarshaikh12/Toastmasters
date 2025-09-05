package com.example.toastMasters.services;

import com.example.toastMasters.dto.AbbreviationsRequestDTO;
import com.example.toastMasters.dto.AbbreviationsResponseDTO;
import com.example.toastMasters.entity.Abbreviations;
import com.example.toastMasters.mapper.AbbreviationsMapper;
import com.example.toastMasters.repositories.AbbreviationsRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AbbreviationsServiceImpl implements AbbreviationsService{

    private final AbbreviationsRepository abbreviationsRepository;
    private final AbbreviationsMapper abbreviationsMapper;

    public AbbreviationsServiceImpl(AbbreviationsRepository abbreviationsRepository,
                                    AbbreviationsMapper abbreviationsMapper) {
        this.abbreviationsRepository = abbreviationsRepository;
        this.abbreviationsMapper = abbreviationsMapper;
    }

    @Override
    public AbbreviationsResponseDTO createAbbreviation(AbbreviationsRequestDTO dto) {
        Abbreviations entity = abbreviationsMapper.toEntity(dto);
        Abbreviations saved = abbreviationsRepository.save(entity);
        return abbreviationsMapper.toResponseDTO(saved);
    }

    @Override
    public AbbreviationsResponseDTO getAbbreviationById(int abbreviationId) {
        Abbreviations abbreviation = abbreviationsRepository.findById(abbreviationId)
                .orElseThrow(() -> new RuntimeException("Abbreviation not found with id: " + abbreviationId));
        return abbreviationsMapper.toResponseDTO(abbreviation);
    }

    @Override
    public List<AbbreviationsResponseDTO> getAllAbbreviations() {
        return abbreviationsRepository.findAll()
                .stream()
                .map(abbreviationsMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public AbbreviationsResponseDTO updateAbbreviation(int abbreviationId, AbbreviationsRequestDTO dto) {
        Abbreviations abbreviation = abbreviationsRepository.findById(abbreviationId)
                .orElseThrow(() -> new RuntimeException("Abbreviation not found with id: " + abbreviationId));

        if (dto.getAbbreviation() != null && !dto.getAbbreviation().isBlank()) {
            abbreviation.setAbbreviation(dto.getAbbreviation());
        }

        if (dto.getDescription() != null && !dto.getDescription().isBlank()) {
            abbreviation.setDescription(dto.getDescription());
        }

        Abbreviations updated = abbreviationsRepository.save(abbreviation);
        return abbreviationsMapper.toResponseDTO(updated);
    }

    @Override
    public void deleteAbbreviation(int abbreviationId) {
        Abbreviations abbreviation = abbreviationsRepository.findById(abbreviationId)
                .orElseThrow(() -> new RuntimeException("Abbreviation not found with id: " + abbreviationId));
        abbreviationsRepository.delete(abbreviation);
    }
}
