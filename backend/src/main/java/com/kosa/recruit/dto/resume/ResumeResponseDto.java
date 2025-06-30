package com.kosa.recruit.dto.resume;

import com.kosa.recruit.domain.entity.Resume;
import com.kosa.recruit.domain.entity.Spec;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class ResumeResponseDto {
    private Long id;
    private String title;
    private List<Spec> specs;
    private String content;
    private String fileUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ResumeResponseDto(Resume resume) {
        this.id = resume.getId();
        this.title = resume.getTitle();
        this.specs = resume.getSpecs();
        this.content = resume.getContent();
        this.fileUrl = resume.getFileUrl();
        this.createdAt = resume.getCreatedAt();
        this.updatedAt = resume.getUpdatedAt();
    }
}