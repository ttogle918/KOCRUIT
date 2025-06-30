package com.kosa.recruit.dto.resume;

import java.util.List;

import com.kosa.recruit.domain.entity.Spec;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResumeRequestDto {
    private String title;
    private List<Spec> spec;
    private String content;
    private String fileUrl;
}
