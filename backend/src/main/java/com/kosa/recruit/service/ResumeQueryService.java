package com.kosa.recruit.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.kosa.recruit.domain.entity.Resume;
import com.kosa.recruit.dto.resume.ResumeResponseDto;
import com.kosa.recruit.repository.ResumeRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ResumeQueryService {
    private final ResumeRepository resumeRepository;

    public List<ResumeResponseDto> getResumesByCompany(Long companyId) {
        return resumeRepository.findResumesByCompanyId(companyId)
                .stream().map(ResumeResponseDto::new)
                .collect(Collectors.toList());
    }

    public List<ResumeResponseDto> searchResumesByCompany(String keyword, Long companyId) {
        return resumeRepository.searchResumesByCompanyId(keyword, companyId)
                .stream().map(ResumeResponseDto::new)
                .collect(Collectors.toList());
    }

    public ResumeResponseDto getResumeByIdAndCompany(Long resumeId, Long companyId) {
        Resume resume = resumeRepository.findByIdAndCompanyIdViaApplication(resumeId, companyId)
                .orElseThrow(() -> new EntityNotFoundException("해당 이력서를 볼 권한이 없습니다."));
        return new ResumeResponseDto(resume);
    }

    public List<ResumeResponseDto> getResumesByUserId(Long userId) {
        List<Resume> resumes = resumeRepository.findByUserId(userId);
        return resumes.stream()
                .map(ResumeResponseDto::new)
                .toList();
    }

    public ResumeResponseDto getResumeById(Long id) {
        Resume resume = resumeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("해당 ID의 이력서가 존재하지 않습니다: " + id));
        return new ResumeResponseDto(resume);
    }
}
