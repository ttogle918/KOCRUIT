package com.kosa.recruit.dto.common;

import java.math.BigDecimal;
import java.util.List;

import com.kosa.recruit.domain.entity.FieldNameScore;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "지원서 평가 항목별 점수 DTO")
public class FieldNameScoreDto {

    @Schema(description = "식별자(PK)", example = "1")
    private Long id;

    @Schema(description = "지원서 ID (FK)", example = "101")
    private Long applicationId;

    @Schema(description = "평가 항목명", example = "자기소개서")
    private String fieldName;

    @Schema(description = "해당 항목 평가 점수", example = "87.25")
    private BigDecimal score;


    public FieldNameScoreDto(FieldNameScore entity) {
        this.id = entity.getId();
        this.applicationId = entity.getApplication() != null ? entity.getApplication().getId() : null;
        this.fieldName = entity.getFieldName();
        this.score = entity.getScore();
    }

}
