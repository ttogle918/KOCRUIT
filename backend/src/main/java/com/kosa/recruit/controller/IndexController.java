package com.kosa.recruit.controller;

import com.kosa.recruit.dto.company.CompanyListDto;
import com.kosa.recruit.dto.jobpost.JobPostListDto;
import com.kosa.recruit.service.CompanyQueryService;
import com.kosa.recruit.service.JobPostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/")
@RequiredArgsConstructor
@Tag(name = "기본 API", description = "홈페이지 조회용 API")
public class IndexController {

    private final JobPostService jobPostService;
    private final CompanyQueryService companyService;

    @Operation(summary = "홈", description = "공고와 회사 목록을 페이징으로 조회")
    @GetMapping({"/", "/home"})
    public Map<String, Object> getHome() {
        List<JobPostListDto> jobPosts = jobPostService.getAllJobPosts();
        List<CompanyListDto> companies = companyService.getAllCompanies();

        Map<String, Object> response = new HashMap<>();
        response.put("jobPosts", jobPosts);
        response.put("companies", companies);

        return response;
    }
}
