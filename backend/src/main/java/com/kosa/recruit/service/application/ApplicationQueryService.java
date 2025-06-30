package com.kosa.recruit.service.application;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.kosa.recruit.domain.entity.Application;
import com.kosa.recruit.dto.applicant.ApplicantListDto;
import com.kosa.recruit.dto.applicant.ApplicationDetailDto;
import com.kosa.recruit.dto.common.FieldNameScoreDto;
import com.kosa.recruit.exception.EntityNotFoundException;
import com.kosa.recruit.repository.ApplicationRepository;
import com.kosa.recruit.repository.FieldNameScoreRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ApplicationQueryService {

    private final ApplicationRepository applicationRepository;
    private final FieldNameScoreRepository fieldNameScoreRepository;

    // jobPostId를 기준으로 지원자 목록 조회
    public List<ApplicantListDto> findByJobPost(Long jobPostId) {
        return applicationRepository.findByAppliedPostId(jobPostId).stream()
                .map(ApplicantListDto::new)
                .collect(Collectors.toList());
    }
    // userId(지원자)를 기준으로 지원자 목록 조회
    public List<ApplicantListDto> findByUser(Long userId ) {
        return applicationRepository.findByApplicant_Id(userId).stream()
                .map(ApplicantListDto::new)
                .collect(Collectors.toList());
    }
    
    // 지원서 상세(점수 포함)
    public ApplicationDetailDto findDetail(Long applicationId) {
        Application app = applicationRepository.findById(applicationId)
            .orElseThrow(() -> new EntityNotFoundException("Application not found"));

        List<FieldNameScoreDto> scores = fieldNameScoreRepository
            .findByApplicationIdOrderByScoreDesc(applicationId)
            .stream()
            .map(FieldNameScoreDto::new)
            .collect(Collectors.toList());

        return ApplicationDetailDto.builder()
            .id(app.getId())
            .applicantName(app.getApplicant().getName())
            .status(app.getStatus())
            .appliedAt(app.getAppliedAt())
            .fieldNameScores(scores)
            .build();
    }

    // jobPostId와 status를 기준으로 지원서 상세 조회
    // 지원서 상태가 통과된 지원서 상세 조회
    public List<ApplicationDetailDto> findPassedDetail(Long jobPostId) {
        // "PASSED" 상태만 조회
        List<Application> applications = applicationRepository
                .findByPassedAppliedPostId(jobPostId);

        if (applications.isEmpty()) {
            throw new IllegalArgumentException("합격한 지원서가 없습니다.");
        }

        return applications.stream()
            .map(app -> findDetail(app.getId()))
            .collect(Collectors.toList());
    }
}
