package com.kosa.recruit.controller.applicant;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kosa.recruit.domain.entity.Application;
import com.kosa.recruit.dto.applicant.ApplicantListDto;
import com.kosa.recruit.dto.applicant.ApplicationDetailDto;
import com.kosa.recruit.dto.applicant.ApplicationListDto;
import com.kosa.recruit.security.auth.CustomUserDetails;
import com.kosa.recruit.service.application.ApplicantApplicationFacade;

import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "공고 지원하기", description = "구직자 공고 지원/취소/조회 관련 API")
@RestController
@RequestMapping("/applicant/applications")
@RequiredArgsConstructor
public class ApplicantApplicationController {

    private final ApplicantApplicationFacade facade;

    // @AuthenticationPrincipal
    @GetMapping
    public List<ApplicantListDto> getMyApplications(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return facade.getMyApplications(userDetails.getUserId());
    }

    // 지원하기 (공고 ID + 이력서 ID)
    @Operation(summary = "나의 지원서 목록 조회", description = "채용공고에 지원한 지원자의 지원서 요약 정보를 반환합니다.")
    @PostMapping
    public ResponseEntity<Application> apply(@AuthenticationPrincipal CustomUserDetails userDetails,
                                             @RequestBody ApplicationListDto request) {
        Application application = facade.apply(userDetails.getUserId(), request.getJobPostId(), request.getResumeId());
        return ResponseEntity.status(HttpStatus.CREATED).body(application);
    }

    @Operation(summary = "지원 취소", description = "지원을 취소합니다.")
    @DeleteMapping("/{applicationId}")
    public ResponseEntity<Void> delete(@PathVariable Long applicationId) {
        facade.deleteApplication(applicationId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "나의 지원서 상세 조회", description = "나의 지원서를 반환합니다.")
    @GetMapping("/{applicationId}/resumes/{resumeId}")
    public ApplicationDetailDto getApplicationDetail(@PathVariable Long applicationId,
                                                     @PathVariable Long resumeId) {
        return facade.getApplicationDetail(applicationId);
    }
}
