package com.kosa.recruit.service;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kosa.recruit.repository.SpecRepository;

import lombok.RequiredArgsConstructor;

import com.kosa.recruit.domain.entity.Resume;
import com.kosa.recruit.domain.entity.Spec;
import com.kosa.recruit.domain.enums.SpecType;
import com.kosa.recruit.dto.resume.ProjectExperienceDto;

@Service
@RequiredArgsConstructor
public class SpecService {

    private final SpecRepository specRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // DTO -> JSON 직렬화 후 저장
    public Spec createProjectSpec(Resume resume, ProjectExperienceDto dto) throws Exception {
        String json = objectMapper.writeValueAsString(dto);

        Spec spec = Spec.builder()
                .resume(resume)
                .specType(SpecType.PROJECT_EXPERIENCE) 
                .specDescription(json)
                .build();

        return specRepository.save(spec);
    }

    // JSON 문자열 -> DTO 역직렬화
    public ProjectExperienceDto getProjectSpecDescription(Long specId) throws Exception {
        Spec spec = specRepository.findById(specId)
                .orElseThrow(() -> new IllegalArgumentException("Spec not found"));

        if (!"project_experience".equals(spec.getSpecType())) {
            throw new IllegalArgumentException("Invalid spec type");
        }

        return objectMapper.readValue(spec.getSpecDescription(), ProjectExperienceDto.class);
    }
}