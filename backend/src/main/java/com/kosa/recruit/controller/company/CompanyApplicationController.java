package com.kosa.recruit.controller.company;

import com.kosa.recruit.dto.applicant.ApplicantListDto;
import com.kosa.recruit.dto.applicant.ApplicationDetailDto;
import com.kosa.recruit.dto.common.LogViewDto;
import com.kosa.recruit.dto.common.StatusUpdateDto;
import com.kosa.recruit.security.auth.CustomUserDetails;
import com.kosa.recruit.service.application.CompanyApplicationFacade;
import com.kosa.recruit.service.application.ApplicationQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/company/jobposts/{jobPostId}/applications")
@RequiredArgsConstructor
@Tag(name = "회사 - 지원서 API", description = "회사에서 지원자/지원서 처리 관련 API")
public class CompanyApplicationController {
    
    private final CompanyApplicationFacade facade;
    private final ApplicationQueryService applicationQueryService;

    @Operation(summary = "지원자 목록 조회", description = "특정 채용공고에 지원한 지원자 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<List<ApplicantListDto>> getApplicants(@PathVariable Long jobPostId) {
        List<ApplicantListDto> applicants = applicationQueryService.findByJobPost(jobPostId);
        return ResponseEntity.ok(applicants);
    }

    @Operation(summary = "지원 상태 변경", description = "지원 상태(PASSED, REJECTED 등)를 변경합니다.")
    @PatchMapping("/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable Long jobPostId,
            @PathVariable Long applicationId,
            @RequestBody StatusUpdateDto request,
            @AuthenticationPrincipal CustomUserDetails user) {
        facade.updateStatus(jobPostId, applicationId, request.getStatus(), user.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/applications/{id}/log-view")
    public ResponseEntity<?> logView(
        @PathVariable Long id,
        @RequestBody LogViewDto dto,
        @AuthenticationPrincipal CustomUserDetails user
    ) {
        facade.logView(id, user.getUserId(), dto.getAction(), dto.getMemo(), dto.getUserAgent(), dto.getIpAddress());
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "지원서 상세 조회", description = "지원서 및 이력서 상세 정보를 반환합니다.")
    @GetMapping("/{applicationId}")
    public ApplicationDetailDto getApplicationDetail(
            @PathVariable Long jobPostId,
            @PathVariable Long applicationId) {
        return facade.getApplicationDetail(jobPostId, applicationId);
    }

    
    @Operation(summary = "합격자 지원서 조회", description = "합격 지원서 및 이력서 상세 정보를 반환합니다.")
    @GetMapping("/passed")
    public List<ApplicationDetailDto> getApplicationPassedDetail(@PathVariable Long jobPostId) {
        return facade.getApplicationPassedDetail(jobPostId);
    }

}