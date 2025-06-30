package com.kosa.recruit.controller.applicant;

import com.kosa.recruit.domain.entity.Resume;
import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.dto.resume.ResumeRequestDto;
import com.kosa.recruit.dto.resume.ResumeResponseDto;
import com.kosa.recruit.security.auth.CustomUserDetails;
import com.kosa.recruit.service.ResumeCommandService;
import com.kosa.recruit.service.ResumeQueryService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequiredArgsConstructor
@RequestMapping("/applicant/resumes")
@Tag(name = "이력서 API", description = "이력서 등록, 조회, 수정, 삭제 API")
public class ApplicantResumeController {
    private final ResumeQueryService resumeQueryService;
    private final ResumeCommandService resumeCommandService;

    @Operation(summary = "이력서 상세 조회", description = "특정 ID의 이력서 상세 내용을 조회합니다.")
    @GetMapping("/{id}")
    public ResponseEntity<ResumeResponseDto> getResumeById(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails customUserDetails) {
        ResumeResponseDto resume = resumeQueryService.getResumeById(id);
        return ResponseEntity.ok(resume);
    }

    @Operation(summary = "이력서 등록", description = "이력서를 새로 작성합니다.")
    @PostMapping("/")
    public ResponseEntity<ResumeResponseDto> createResume(
            @RequestBody ResumeRequestDto requestDto,
            @AuthenticationPrincipal CustomUserDetails customUserDetails) {

        User user = customUserDetails.getUser();
        Resume resume = resumeCommandService.createResume(requestDto, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(new ResumeResponseDto(resume));
    }

    @Operation(summary = "이력서 수정", description = "특정 ID의 이력서를 수정합니다. 모든 필드를 입력해야 합니다.")
    @PutMapping("/{id}")
    public ResponseEntity<ResumeResponseDto> updateResume(
            @PathVariable Long id,
            @RequestBody ResumeRequestDto requestDto,
            @AuthenticationPrincipal CustomUserDetails customUserDetails) {
        Long userId = customUserDetails.getUserId();
        Resume resume = resumeCommandService.updateResumeByUser(id, requestDto, userId);
        return ResponseEntity.ok(new ResumeResponseDto(resume));
    }

    @Operation(summary = "이력서 삭제", description = "특정 ID의 이력서를 삭제합니다.")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResume(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails customUserDetails) {
        resumeCommandService.deleteResumeByUser(id, customUserDetails.getUserId());
        return ResponseEntity.noContent().build();
    }
}
