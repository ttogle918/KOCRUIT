package com.kosa.recruit.dto.jobpost;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateJobPostDto {
    private String title;
    private String qualifications;
    private String conditions;
    private String jobDetails;
    private String procedure;
    private Integer headcount;
    private LocalDateTime endDate;
    // private String location;
    // private String employmentType;
    private LocalDateTime deadline;
    private LocalDateTime updatedAt;
}
