package com.kosa.recruit.dto.applicant;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "지원서 생성 요청 DTO")
public class CreateApplicationDto {
    @Schema(description = "채용공고 ID")
    private Long jobPostId;

    @Schema(description = "이력서 ID")
    private Long resumeId;

    @Schema(description = "지원자 ID")
    private Long userId;
}
