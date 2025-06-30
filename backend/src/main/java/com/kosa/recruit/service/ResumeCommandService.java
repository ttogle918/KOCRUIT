package com.kosa.recruit.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kosa.recruit.domain.entity.Resume;
import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.dto.resume.ResumeRequestDto;
import com.kosa.recruit.repository.ResumeRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ResumeCommandService {
    private final ResumeRepository resumeRepository;

    @Transactional
    public Resume createResume(ResumeRequestDto dto, User user) {
        Resume resume = Resume.builder()
                .user(user)
                .title(dto.getTitle())
                .specs(dto.getSpec())
                .content(dto.getContent())
                .fileUrl(dto.getFileUrl() != null ? dto.getFileUrl() : "")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return resumeRepository.save(resume);
    }

    @Transactional
    public Resume updateResumeByUser(Long id, ResumeRequestDto requestDto, Long userId) {
        Resume resume = resumeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("이력서를 찾을 수 없습니다: " + id));
        resume.setTitle(requestDto.getTitle());
        resume.setSpecs(requestDto.getSpec());
        resume.setContent(requestDto.getContent());
        resume.setFileUrl(requestDto.getFileUrl());
        resume.setUpdatedAt(LocalDateTime.now());

        return resumeRepository.save(resume);
    }

    @Transactional
    public void deleteResumeByUser(Long resumeId, Long userId) {
        if (!resumeRepository.existsById(resumeId)) {
            throw new EntityNotFoundException("Resume not found with id: " + resumeId);
        }
        resumeRepository.deleteById(resumeId);
    }
}