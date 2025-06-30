package com.kosa.recruit.controller.applicant;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.kosa.recruit.dto.jobpost.JobPostDetailDto;
import com.kosa.recruit.service.JobPostService;

import lombok.RequiredArgsConstructor;

import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;

@Tag(name = "공고 - 지원자", description = "지원자용 공고 관련 API")
@RestController
@RequestMapping("/applicant/jobposts")
@RequiredArgsConstructor
public class ApplicantJobPostController {
    
    private final JobPostService jobService;

    @Operation(summary = "지원자 공고 목록 조회", description = "키워드로 공고를 검색하거나 전체 공고를 조회합니다.")
    @GetMapping("/{user_id}")
    public List<JobPostDetailDto> getJobPosts(
            @PathVariable Long user_id,
            @RequestParam(required = false) String keyword) {
        
        return jobService.searchJobPosts(keyword);
    }

    @Operation(summary = "공고 상세 조회", description = "채용 공고의 상세 정보를 조회합니다.")
    @GetMapping("/{jobpost_id}")
    public ResponseEntity<JobPostDetailDto> getJobPostById(@PathVariable Long id) {
        JobPostDetailDto jobPost = jobService.getJobPostById(id);
        return ResponseEntity.ok(jobPost);
    }
}
