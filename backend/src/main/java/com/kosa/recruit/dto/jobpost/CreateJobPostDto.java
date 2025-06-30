package com.kosa.recruit.dto.jobpost;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.kosa.recruit.domain.entity.Company;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateJobPostDto {
    private String title;
    private String qualifications;
    private String conditions;
    private String jobDetails;
    private String procedure;
    private Integer headcount;
    private LocalDateTime startDate;
    private LocalDateTime endDate;  // 날짜 + 시간 관리 => LocalDateTime 
    private String location;
    private String employmentType;
    private LocalDateTime deadline;
    private Company company; // 회사 ID 추가
    private Long companyId; // 회사 ID 추가
}
