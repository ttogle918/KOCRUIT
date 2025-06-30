package com.kosa.recruit.controller.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kosa.recruit.dto.applicant.ApplicationDetailDto;
import com.kosa.recruit.service.application.ApplicantApplicationFacade;

import lombok.RequiredArgsConstructor;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "지원서 - 공통", description = "기업과 지원자 공용 지원서 관련 API")
@RestController
@RequestMapping("/common/jobpost/{jobpost_id}/applications")
@RequiredArgsConstructor
public class ApplicationController {
    // 공통 기능 ( 기업/개인 회원, 지원서는 비회원이 열람 불가.  )
    private final ApplicantApplicationFacade applicationService;

    // // 공고별 지원자 목록 조회 => 기업

    // @Operation(summary = "지원서 상세 조회", description = "특정 공고에서 지원자의 상세 지원 정보를 조회합니다.")
    // @GetMapping("/{applicationId}")
    // public ResponseEntity<ApplicationDetailDto> getApplicationDetail(@PathVariable Long jobpost_id,
    //                                                                 @PathVariable Long applicationId) {
    //   /* 지원 상세 조회 (이력서 포함)
    //     *GET /{jobpost_id}/common/applications/{applicationId} 
    //     applicationId: 개별 지원 ID
    //     응답: 지원자의 이력서, 지원 정보
    //   */
    //   ApplicationDetailDto application = applicationService.getApplicationDetail(jobpost_id, applicationId);
    //   return ResponseEntity.ok(application);
    // }
 }