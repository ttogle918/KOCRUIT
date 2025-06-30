package com.kosa.recruit.dto.resume;

import java.time.LocalDateTime;

import com.kosa.recruit.domain.entity.Resume;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "이력서 응답 DTO")
public class CreateResumeDto {
    @Schema(description = "이력서 ID")
    private Long id;

    @Schema(description = "이력서 제목")
    private String title;

    @Schema(description = "이력서 파일 URL")
    private String fileUrl;

    @Schema(description = "작성일")
    private String createdAt;

    private String content;
    private Double score;
    private LocalDateTime updatedAt;
    private Long userId;

    public CreateResumeDto(Resume resume) {
        this.id = resume.getId();
        this.score = 0.0; // 점수는 초기값으로 설정, 필요시 수정 가능
        this.content = resume.getContent();
        this.fileUrl = resume.getFileUrl();
        //this.createdAt = resume.getCreatedAt();
        //this.updatedAt = resume.getUpdatedAt();
        //this.userId = resume.getUser() != null ? resume.getUser().getId() : null; null 체크
    }
}
