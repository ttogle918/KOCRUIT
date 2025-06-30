package com.kosa.recruit.domain.entity;

// 프론트/리스트/검색/필터링에서 즉시 사용
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

import com.kosa.recruit.domain.enums.ApplyStatus;

@Entity
@Table(name = "application_status_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ApplicationStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 어떤 지원서에 대한 이력인가
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    // 상태가 어떻게 바뀌었는지
    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 20)
    private ApplyStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", length = 20)
    private ApplyStatus toStatus;

    // 변경한 사용자 (ex. 기업 관리자)
    @Column(name = "changed_by", nullable = false)
    private Long changedByUserId;

    // 언제 바뀜
    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;
}