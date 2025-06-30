package com.kosa.recruit.dto.resume;

import lombok.Getter;
import lombok.Setter;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "이력서 생성, 수정 DTO")
@Getter
@Setter
public class ResumeListDto {
    @Schema(description = "이력서 제목")
    private String title;

    @Schema(description = "이력서 스펙")
    private String spec;

    @Schema(description = "이력서 내용")
    private String content;

    @Schema(description = "이력서 파일 URL")
    private String fileUrl;
}