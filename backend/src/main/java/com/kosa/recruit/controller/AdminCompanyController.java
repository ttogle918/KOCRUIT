package com.kosa.recruit.controller;


import org.springframework.web.bind.annotation.PathVariable;

import com.kosa.recruit.dto.company.CompanyDetailDto;
import com.kosa.recruit.security.auth.CustomUserDetails;

import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kosa.recruit.service.CompanyQueryService;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/company")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@Tag(name = "회사 API", description = "회사 등록, 조회, 수정, 삭제 API")
public class AdminCompanyController {
    private final CompanyQueryService companyService;

    @Operation(summary = "회사 등록", description = "회사를 새로 작성합니다.")
    @PostMapping("/")
    public ResponseEntity<CompanyDetailDto> createCompany(
            @RequestBody CompanyDetailDto requestDto,
            @AuthenticationPrincipal CustomUserDetails customUserDetails) {

        CompanyDetailDto createdCompany = companyService.createCompany(requestDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdCompany);
    }

    @Operation(summary = "회사 수정", description = "특정 ID의 회사를 수정합니다. 모든 필드를 입력해야 합니다.")
    @PutMapping("/{id}")
    public ResponseEntity<CompanyDetailDto> updateCompany(
            @PathVariable Long id,
            @RequestBody CompanyDetailDto requestDto) {
        CompanyDetailDto updatedCompany = companyService.updateCompany(id, requestDto);
        return ResponseEntity.ok(updatedCompany);
    }

    @Operation(summary = "회사 삭제", description = "특정 ID의 회사를 삭제합니다.")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCompany(@PathVariable Long id) {
        companyService.deleteCompany(id);
        return ResponseEntity.noContent().build();
    }
}