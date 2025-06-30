package com.kosa.recruit.service.application;

import java.util.List;

import org.springframework.stereotype.Service;

import com.kosa.recruit.domain.entity.Application;
import com.kosa.recruit.dto.applicant.ApplicantListDto;
import com.kosa.recruit.dto.applicant.ApplicationDetailDto;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ApplicantApplicationFacade {
    // 지원자 입장에서 사용할 기능들을 조합 (조회, 생성, 삭제 등)
    private final ApplicationQueryService queryService;
    private final ApplicationCommandService commandService;
    
    // 1. 지원자 목록 조회
    public List<ApplicantListDto> getMyApplications(Long userId ) {
        return queryService.findByUser(userId);
    }
    
    // 4. 지원( 생성 )
    public Application apply(Long userId, Long jobPostId, Long resumeId) {
        return commandService.create(userId, jobPostId, resumeId);
    }

    public void deleteApplication(Long applicationId) {
        commandService.delete(applicationId);
    }

    public ApplicationDetailDto getApplicationDetail(Long applicationId) {
        return queryService.findDetail(applicationId);
    }
}
