package com.kosa.recruit.service.application;

import java.util.List;

import org.springframework.stereotype.Service;

import com.kosa.recruit.domain.entity.Application;
import com.kosa.recruit.domain.enums.ApplicationViewAction;
import com.kosa.recruit.domain.enums.ApplyStatus;
import com.kosa.recruit.domain.enums.Status;
import com.kosa.recruit.dto.applicant.ApplicantListDto;
import com.kosa.recruit.dto.applicant.ApplicationDetailDto;
import com.kosa.recruit.service.ApplicationViewLogService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CompanyApplicationFacade {

    private final ApplicationQueryService queryService;
    private final ApplicationCommandService commandService;
    private final ApplicationViewLogService viewLogService;

    // 1. 지원자 목록 조회
    public List<ApplicantListDto> getApplicants(Long jobPostId) {
        return queryService.findByJobPost(jobPostId);
    }

    // 2. 지원 상태 변경
    public ApplyStatus updateStatus(Long jobPostId, Long applicationId, ApplyStatus status, Long userId) {
        commandService.updateStatus(jobPostId, applicationId, status, userId);
        return status; // 그대로 리턴해도 충분
    }

    // 3. 지원서 상세 조회
    public ApplicationDetailDto getApplicationDetail(Long jobPostId, Long applicationId) {
        // jobPostId 검증이 필요하다면 이곳에 넣을 수 있음
        return queryService.findDetail(applicationId);
    }

    public List<ApplicationDetailDto> getApplicationPassedDetail(Long jobPostId) {
        return queryService.findPassedDetail(jobPostId);
    }

    public void logView(Long id, Long userId, ApplicationViewAction action, String memo, String userAgent,
            String ipAddress) {
        viewLogService.save(id, userId, action, memo, userAgent, ipAddress);
    }

}