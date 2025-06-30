package com.kosa.recruit.dto.applicant;

import lombok.Getter;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Getter
public class ApplicationListDto {
    private Long jobPostId;
    private Long resumeId;
}
