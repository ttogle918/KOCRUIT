package com.kosa.recruit.domain.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "resume_memo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumeMemo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "user_id",
        foreignKey = @ForeignKey(name = "fk_resumememo_user"))
    private CompanyUser user;
    
    @ManyToOne
    @JoinColumn(name = "application_id",
        foreignKey = @ForeignKey(name = "fk_resumememo_application"))
    private Application application;
    
    private String content;
    private LocalDateTime created_at;
}