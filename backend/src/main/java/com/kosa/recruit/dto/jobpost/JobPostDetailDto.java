package com.kosa.recruit.dto.jobpost;

import java.util.List;
import java.util.stream.Collectors;

import com.kosa.recruit.domain.entity.Company;
import com.kosa.recruit.domain.entity.JobPost;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "채용공고 응답 DTO")
public class JobPostDetailDto {

    @Schema(description = "채용공고 ID")
    private Long id;

    @Schema(description = "공고 제목")
    private String title;

    @Schema(description = "회사명")
    private String companyName;

    @Schema(description = "지원자격")
    private String qualifications;

    @Schema(description = "근무조건")
    private String conditions;

    @Schema(description = "모집분야 및 자격요건")
    private String jobDetails;

    @Schema(description = "전형절차")
    private String procedure;

    @Schema(description = "모집인원")
    private Integer headcount;

    @Schema(description = "시작일")
    private String startDate;

    @Schema(description = "종료일")
    private String endDate;

    @Schema(description = "채용팀 멤버")
    private List<TeamMemberDto> teamMembers;

    @Schema(description = "평가 가중치")
    private List<WeightDto> weights;

    @Getter
    @AllArgsConstructor
    public static class TeamMemberDto {
        private String email;
        private String role;
    }

    @Getter
    @AllArgsConstructor
    public static class WeightDto {
        private String item;
        private Float score;
    }

    public JobPostDetailDto(JobPost jobPost) {
        this.id = jobPost.getId();
        this.title = jobPost.getTitle();
        this.qualifications = jobPost.getQualifications();
        this.conditions = jobPost.getConditions();
        this.jobDetails = jobPost.getJobDetails();
        this.procedure = jobPost.getProcedure();
        this.headcount = jobPost.getHeadcount();
        this.startDate = jobPost.getStartDate() != null ? jobPost.getStartDate().toString() : null;
        this.endDate = jobPost.getEndDate() != null ? jobPost.getEndDate().toString() : null;

        Company comp = jobPost.getCompany();
        this.companyName = (comp != null) ? comp.getName() : null;

        // Convert team members
        this.teamMembers = jobPost.getTeamMembers().stream()
            .map(job -> new TeamMemberDto(
                job.getUser().getEmail(),
                job.getUser().getRole().name()))
            .collect(Collectors.toList());

        // Convert weights
        this.weights = jobPost.getWeights().stream()
            .map(weight -> new WeightDto(
                weight.getFieldName(),
                weight.getWeightValue()))
            .collect(Collectors.toList());
    }

    public static JobPostDetailDto from(JobPost jobPost) {
        return new JobPostDetailDto(jobPost);
    }
}
