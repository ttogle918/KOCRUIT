package com.kosa.recruit.domain.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

import com.kosa.recruit.domain.enums.ApplyStatus;

@Entity
@Table(name = "application")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Application {
    // 지원서
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
        foreignKey = @ForeignKey(name = "fk_application_user"))
    private User applicant;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id",
        foreignKey = @ForeignKey(name = "fk_application_resume"))
    private Resume resume;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "APPLIEDPOST_ID", nullable = false,
        foreignKey = @ForeignKey(name = "fk_application_jobpost"))
    private JobPost appliedPost;

    private Long score;

    @Enumerated(EnumType.STRING)
    private ApplyStatus status;  // 지원 상태: WAITING, PASSED, REJECTED 등

    @Column(name = "applied_at")
    private LocalDateTime appliedAt;

    @Column(name = "application_source")
    private String applicationSource;
}