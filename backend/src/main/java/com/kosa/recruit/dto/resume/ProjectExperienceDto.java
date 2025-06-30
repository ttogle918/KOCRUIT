package com.kosa.recruit.dto.resume;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectExperienceDto {
    private String title;
    private String role;
    private String description;
    private List<String> technologies;
    private String duration;
}
