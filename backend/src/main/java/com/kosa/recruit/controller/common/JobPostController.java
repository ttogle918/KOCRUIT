package com.kosa.recruit.controller.common;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.kosa.recruit.dto.jobpost.JobPostDetailDto;
import com.kosa.recruit.service.JobPostService;

import lombok.RequiredArgsConstructor;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "채용공고 - 공통", description = "지원자, 기업, 비회원 모두 접근 가능한 채용공고 조회 API")
@RestController
@RequestMapping("/common/jobposts")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@RequiredArgsConstructor
public class JobPostController {
    
    private final JobPostService jobService;

    @Operation(summary = "공고 목록 조회", description = "키워드를 통해 채용공고를 검색하거나, 전체 공고를 최신순으로 조회합니다.")
    @GetMapping({"/", ""})
    public List<JobPostDetailDto> getJobPosts(
            @RequestParam(required = false) String keyword  ) {
        return jobService.searchJobPosts(keyword);
    }
    
    // GET /jobposts/{id} → 채용공고 1건 상세 조회    => Applicant, Company 모두 가능
    @Operation(summary = "공고 상세 조회", description = "특정 채용공고를 ID로 조회합니다.")
    @GetMapping("/{id}")
    public ResponseEntity<JobPostDetailDto> getJobPostById(@PathVariable Long id) {
        JobPostDetailDto jobPost = jobService.getJobPostById(id);
        return ResponseEntity.ok(jobPost);
    }
}
