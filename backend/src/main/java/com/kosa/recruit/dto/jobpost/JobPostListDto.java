package com.kosa.recruit.dto.jobpost;

import com.kosa.recruit.domain.entity.JobPost;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class JobPostListDto {

    @Schema(description = "공고 ID", example = "1")
    private Long id;

    @Schema(description = "공고 제목", example = "백엔드 개발자 모집")
    private String title;
    private String procedure;
    private Integer headcount;
    private LocalDateTime startDate;
    @Schema(description = "마감일", example = "2025-06-30T23:59:59")
    private LocalDateTime endDate;
    @Schema(description = "회사명", example = "네이버")
    private String companyName;

    public JobPostListDto(Long id, String title, LocalDateTime endDate, String companyName) {
        this.id = id;
        this.title = title;
        this.endDate = endDate;
        this.companyName = companyName;
    }

    public JobPostListDto(JobPost jobPost) {
        this.id = jobPost.getId();
        this.title = jobPost.getTitle();
        this.companyName = jobPost.getCompany() != null ? jobPost.getCompany().getName() : null;
        // 나머지 필드는 기본값이나 null로 설정될 수 있음
    }
    
    public static JobPostListDto from(JobPost jobPost) {
        return new JobPostListDto(
                jobPost.getId(),
                jobPost.getTitle(),
                jobPost.getProcedure() != null ? jobPost.getProcedure() : "",
                jobPost.getHeadcount() != null ? jobPost.getHeadcount() : 0,
                jobPost.getStartDate()  != null ? jobPost.getStartDate() : LocalDateTime.now(),
                jobPost.getEndDate()    != null ? jobPost.getEndDate() : LocalDateTime.now(),
                jobPost.getCompany() != null ? jobPost.getCompany().getName() : null
        );
    }
}
