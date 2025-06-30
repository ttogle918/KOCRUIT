package com.kosa.recruit.dto.applicant;

import java.time.LocalDateTime;
import java.time.LocalDate;

import com.kosa.recruit.domain.entity.Application;

import lombok.Getter;
import lombok.NoArgsConstructor;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Getter
@NoArgsConstructor
@Schema(description = "지원자 요약 DTO")
@Data
public class ApplicantListDto {
    @Schema(description = "지원자 ID")
    private Long id;

    @Schema(description = "지원자 이름")
    private String name;

    @Schema(description = "지원자 이메일")
    private String email;

    @Schema(description = "지원자 생년월일")
    private LocalDate birthDate;

    @Schema(description = "공고에 대한 지원자 점수")
    private Long score;

    @Schema(description = "지원 날짜")
    private LocalDateTime appliedAt;

    @Schema(description = "지원 상태")
    private String status;

    @Schema(description = "지원 경로")
    private String applicationSource;

    @Schema(description = "이력서 ID")
    private Long resumeId;

    public ApplicantListDto(Application application) {
        this.id = application.getId();
        this.name = application.getApplicant().getName();
        this.email = application.getApplicant().getEmail();
        this.birthDate = application.getApplicant().getBirthDate();
        this.score = application.getScore();
        this.appliedAt = application.getAppliedAt();
        this.status = application.getStatus() != null ? application.getStatus().name() : "WAITING";
        this.applicationSource = application.getApplicationSource();
        this.resumeId = application.getResume() != null ? application.getResume().getId() : null;
    }
}