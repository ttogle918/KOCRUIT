package com.kosa.recruit.controller.company;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kosa.recruit.domain.entity.JobPost;
import com.kosa.recruit.service.JobPostService;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;

import com.kosa.recruit.dto.jobpost.CreateJobPostDto;
import com.kosa.recruit.dto.jobpost.JobPostDetailDto;
import com.kosa.recruit.dto.jobpost.JobPostListDto;
import com.kosa.recruit.dto.jobpost.UpdateJobPostDto;
import com.kosa.recruit.security.auth.CustomUserDetails;

@RestController
@RequestMapping("/company/jobposts")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@RequiredArgsConstructor
public class CompanyJobPostController {
    
    private final JobPostService jobService;
    
    @Operation(summary = "회사별 채용공고 목록 조회", description = "특정 회사의 채용공고 목록을 조회합니다.")
    @GetMapping("/{company_id}")
    public List<JobPostDetailDto> getJobPosts(@PathVariable("company_id") Long companyId) {
        return jobService.getJobPostByCompanyId(companyId);
    }

    @Operation(summary = "회사별 채용공고 상세 조회", description = "특정 회사의 채용공고 상세 정보를 조회합니다.")
    @GetMapping("/{company_id}/{jobpost_id}")
    public ResponseEntity<JobPostDetailDto> getJobPostById(
        @PathVariable("company_id") Long companyId,
        @PathVariable("jobpost_id") Long jobPostId) {
        JobPostDetailDto jobPost = jobService.getJobPostById(jobPostId);
        return ResponseEntity.ok(jobPost);
    }

    @Operation(summary = "공고 ID로 상세 조회", description = "회사 ID 없이 채용공고 상세 정보를 조회합니다.")
    @GetMapping("/detail/{jobpost_id}")
    public ResponseEntity<JobPostDetailDto> getJobPostDetailById(@PathVariable("jobpost_id") Long jobPostId) {
        JobPostDetailDto jobPost = jobService.getJobPostById(jobPostId);
        return ResponseEntity.ok(jobPost);
    }

    @Operation(summary = "전체 채용공고 목록 조회", description = "전체 기업의 모든 채용공고 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<List<JobPostListDto>> getAllJobPosts() {
        List<JobPostListDto> posts = jobService.getAllJobPosts();
        return ResponseEntity.ok(posts);
    }
    
    @Operation(summary = "채용공고 등록", description = "기업 사용자가 새로운 채용공고를 등록합니다.")
    @PostMapping
    public ResponseEntity<JobPost> createJobPost(@RequestBody CreateJobPostDto requestDto,
                                                    Authentication authentication) {
        String userEmail = authentication.getName();
        JobPost createdPost = jobService.createJobPost(requestDto, userEmail);

        return ResponseEntity.status(HttpStatus.CREATED).body(createdPost);
    }

    @Operation(summary = "채용공고 수정", description = "채용공고 일부 필드를 수정합니다. PATCH 방식 사용.")
    @PatchMapping("/{id}")
    public ResponseEntity<JobPost> updateJobPost(
            @PathVariable Long id,
            @RequestBody UpdateJobPostDto requestDto,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        JobPost updatedPost = jobService.updateJobPost(id, requestDto, userDetails.getUserId());
        return ResponseEntity.ok(updatedPost);
    }
    
    @Operation(summary = "채용공고 삭제", description = "채용공고를 삭제합니다.")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJobPost(@PathVariable Long id,
                    @AuthenticationPrincipal CustomUserDetails userDetails) {
        jobService.deleteJobPost(id, userDetails.getUserId());
        return ResponseEntity.noContent().build();
    }
}
