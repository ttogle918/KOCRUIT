package com.kosa.recruit.controller.common;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import io.swagger.v3.oas.annotations.Operation;

import org.springframework.data.domain.Page;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.kosa.recruit.dto.company.CompanyDetailDto;
import com.kosa.recruit.dto.company.CompanyListDto;
import com.kosa.recruit.service.CompanyQueryService;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/common/company")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@Tag(name = "회사 API", description = "회사 조회 API")
public class CompanyController {
    private final CompanyQueryService companyService;

    // GET /common/company -> 회사 목록 조회
    @Operation(summary = "회사 목록 조회", description = "키워드로 회사를 검색하고 페이징 처리된 목록을 조회합니다.")
    @GetMapping({ "/", "" })
    public List<CompanyListDto> getAllCompanies(
            @RequestParam(required = false) String keyword) {
        return companyService.getAllCompanies();
    }

    // GET /common/company/{id} → 회사 1건 상세 조회
    @Operation(summary = "회사 상세 조회", description = "특정 ID의 회사 상세 내용을 조회합니다.")
    @GetMapping("/{id}")
    public ResponseEntity<CompanyDetailDto> getCompanyById(@PathVariable Long id) {
        CompanyDetailDto company = companyService.getCompanyById(id);
        return ResponseEntity.ok(company);
    }

}
