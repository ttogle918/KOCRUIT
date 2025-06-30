package com.kosa.recruit.dto.common;

import java.util.List;

import com.kosa.recruit.dto.company.CompanyListDto;
import com.kosa.recruit.dto.jobpost.JobPostListDto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter @Getter
@NoArgsConstructor
@AllArgsConstructor
public class HomeDto {
    private List<JobPostListDto> jobPosts;
    private List<CompanyListDto> companies;
}

