package com.kosa.recruit.dto.applicant;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import com.fasterxml.jackson.databind.ObjectMapper;


import com.kosa.recruit.domain.entity.Application;
import com.kosa.recruit.domain.entity.Spec;
import com.kosa.recruit.domain.enums.ApplyStatus;
import com.kosa.recruit.domain.enums.GenderType;
import com.kosa.recruit.domain.enums.SpecType;
import com.kosa.recruit.dto.common.FieldNameScoreDto;
import com.kosa.recruit.dto.resume.AwardDto;
import com.kosa.recruit.dto.resume.CertificateDto;
import com.kosa.recruit.dto.resume.EducationDto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import io.swagger.v3.oas.annotations.media.Schema;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Schema(description = "지원서 상세 정보 + 평가 항목별 점수 리스트")
public class ApplicationDetailDto {
    @Schema(description = "지원서 ID")
    private Long id;

    @Schema(description = "지원자 이름")
    private String applicantName;
    
    @Schema(description = "지원자 성별")
    private GenderType gender;

    @Schema(description = "지원자 생년월일")
    private LocalDate birthDate;
    
    @Schema(description = "지원자 이메일")
    private String email;
    
    @Schema(description = "지원자 주소")
    private String address;

    @Schema(description = "지원자 휴대폰번호")
    private String phone;

    @Schema(description = "지원자 학력")
    private List<EducationDto> educations;
    private List<AwardDto> awards;
    private List<CertificateDto> certificates;

    @Schema(description = "지원 회사")
    private String appliedCompany;

    @Schema(description = "지원 부서")
    private String appliedDepartment;

    @Schema(description = "지원자 스펙")
    private List<Spec> spec;

    @Schema(description = "자기소개서 내용")
    private String content;

    @Schema(description = "자기소개서 첨부 파일 URL")
    private String fileUrl;

    @Schema(description = "지원 상태")
    private ApplyStatus status;
    
    @Schema(description = "지원 일시")
    private LocalDateTime appliedAt;
    
    @Schema(description = "평가 항목별 점수 리스트")
    private List<FieldNameScoreDto> fieldNameScores;



    public ApplicationDetailDto(Application application) {
        this.id = application != null ? application.getId() : null;

        // 지원자 정보
        if (application != null && application.getApplicant() != null) {
            this.applicantName = safe(application.getApplicant().getName());
            this.gender = application.getApplicant().getGender() != null ? application.getApplicant().getGender() : GenderType.UNKNOWN;
            this.birthDate = application.getApplicant().getBirthDate() != null ? application.getApplicant().getBirthDate() : null;
            this.email = safe(application.getApplicant().getEmail());
            this.address = safe(application.getApplicant().getAddress());
            this.phone = safe(application.getApplicant().getPhone());
        } else {
            this.applicantName = "";
            this.gender = GenderType.UNKNOWN;
            this.birthDate = null;
            this.email = "";
            this.address = "";
            this.phone = "";
        }

        // 학력/수상/자격증 등은 Spec 테이블에서 파싱
        this.educations = Collections.emptyList();
        this.awards = Collections.emptyList();
        this.certificates = Collections.emptyList();
        this.spec = application.getResume().getSpecs() != null ? application.getResume().getSpecs() : Collections.emptyList();
        this.fileUrl = "";
        this.content = "";

        if (application != null && application.getResume() != null) {
            List<Spec> specs = application.getResume().getSpecs();
            ObjectMapper objectMapper = new ObjectMapper();

            if (specs != null && !specs.isEmpty()) {
                this.educations = specs.stream()
                    .filter(s -> s.getSpecType() == SpecType.EDUCATION)
                    .map(s -> {
                        try {
                            return objectMapper.readValue(s.getSpecDescription(), EducationDto.class);
                        } catch (Exception e) {
                            return null;
                        }
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

                this.awards = specs.stream()
                    .filter(s -> s.getSpecType() == SpecType.AWARDS)
                    .map(s -> {
                        try {
                            return objectMapper.readValue(s.getSpecDescription(), AwardDto.class);
                        } catch (Exception e) {
                            return null;
                        }
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

                this.certificates = specs.stream()
                    .filter(s -> s.getSpecType() == SpecType.CERTIFICATIONS)
                    .map(s -> {
                        try {
                            return objectMapper.readValue(s.getSpecDescription(), CertificateDto.class);
                        } catch (Exception e) {
                            return null;
                        }
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            }

            this.spec = specs; // 필요시 List<Spec> 전체도 할당
            this.fileUrl = safe(application.getResume().getFileUrl());
            this.content = safe(application.getResume().getContent());
        }

        // 회사/부서 정보
        if (application != null && application.getAppliedPost() != null && application.getAppliedPost().getCompany() != null) {
            this.appliedCompany = safe(application.getAppliedPost().getCompany().getName());
        } else {
            this.appliedCompany = "";
        }
        this.appliedDepartment = (application != null && application.getAppliedPost() != null)
            ? safe(application.getAppliedPost().getDepartment()) : "";

        this.status = application != null ? application.getStatus() : null;
        this.appliedAt = application != null ? application.getAppliedAt() : null;

        // 평가항목 점수는 서비스에서 세팅
        this.fieldNameScores = Collections.emptyList();
    }

    // 안전하게 널 체크 & trim
    private static String safe(String value) {
        return value != null ? value.trim() : "";
    }

}