package com.example.toastMasters.services;

import com.example.toastMasters.dto.AgendaConstantInfoRequestDTO;
import com.example.toastMasters.dto.AgendaConstantInfoResponseDTO;
import com.example.toastMasters.entity.AgendaConstantInfo;
import com.example.toastMasters.mapper.AgendaConstantInfoMapper;
import com.example.toastMasters.repositories.AgendaConstantInfoRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
public class AgendaConstantInfoServiceImpl implements AgendaConstantInfoService{

    private final AgendaConstantInfoRepository repository;
    private final AgendaConstantInfoMapper mapper;

    public AgendaConstantInfoServiceImpl(AgendaConstantInfoRepository repository, AgendaConstantInfoMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    public AgendaConstantInfoResponseDTO createAgendaInfo(AgendaConstantInfoRequestDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("AgendaConstantInfoRequestDTO cannot be null");
        }
        AgendaConstantInfo entity = mapper.toEntity(dto);
        return mapper.toResponseDTO(repository.save(entity));
    }

    @Override
    public AgendaConstantInfoResponseDTO updateAgendaInfo(int agendaInfoId, AgendaConstantInfoRequestDTO dto) {
        AgendaConstantInfo existing = repository.findById(agendaInfoId)
                .orElseThrow(() -> new NoSuchElementException("AgendaConstantInfo not found with id " + agendaInfoId));

        existing.setInfoName(dto.getInfoName());
        existing.setInfoDetail(dto.getInfoDetail());

        return mapper.toResponseDTO(repository.save(existing));
    }

    @Override
    public AgendaConstantInfoResponseDTO getAgendaInfoById(int agendaInfoId) {
        return repository.findById(agendaInfoId)
                .map(mapper::toResponseDTO)
                .orElseThrow(() -> new NoSuchElementException("AgendaConstantInfo not found with id " + agendaInfoId));
    }

    @Override
    public List<AgendaConstantInfoResponseDTO> getAllAgendaInfo() {
        return repository.findAll()
                .stream()
                .map(mapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteAgendaInfo(int agendaInfoId) {
        if (!repository.existsById(agendaInfoId)) {
            throw new NoSuchElementException("AgendaConstantInfo not found with id " + agendaInfoId);
        }
        repository.deleteById(agendaInfoId);
    }
}
