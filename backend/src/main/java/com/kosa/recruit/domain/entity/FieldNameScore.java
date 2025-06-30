package com.kosa.recruit.domain.entity;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "FIELD_NAME_SCORE")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "지원서 평가 항목별 점수 엔티티")
public class FieldNameScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID")
    @Schema(description = "식별자(PK)", example = "1")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "APPLICATION_ID", nullable = false, foreignKey = @ForeignKey(name = "FK_FIELD_NAME_APPLICATION"))
    @Schema(description = "지원서 정보 (FK)")
    private Application application;

    @Column(name = "FIELD_NAME", nullable = false, length = 255)
    @Schema(description = "항목명", example = "자기소개서")
    private String fieldName;

    @Column(name = "SCORE", precision = 5, scale = 2)
    @Schema(description = "해당 항목 평가 점수", example = "85.50")
    private BigDecimal score;

}
