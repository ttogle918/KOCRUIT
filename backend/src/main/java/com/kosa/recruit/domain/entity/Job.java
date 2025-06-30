package com.kosa.recruit.domain.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "job")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Job {
    @EmbeddedId
    private JobId jobId;

    @ManyToOne
    @MapsId("jobPostId")
    @JoinColumn(name = "jobpost_id",
        foreignKey = @ForeignKey(name = "fk_job_jobpost"))
    private JobPost jobPost;

    @ManyToOne
    @MapsId("userId")
    @JoinColumn(name = "user_id",
        foreignKey = @ForeignKey(name = "fk_job_user"))
    private User user;

    @Column(name = "invited_at")
    private LocalDateTime invitedAt;

    @Embeddable
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class JobId implements java.io.Serializable {
        private Long jobPostId;
        private Long userId;
    }
} 