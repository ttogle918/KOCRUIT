package com.kosa.recruit.domain.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "schedule")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Schedule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String schedule_type;
    
    @ManyToOne
    @JoinColumn(name = "user_id",
        foreignKey = @ForeignKey(name = "fk_schedule_user"))
    private CompanyUser user;

    private String title;
    private String description;
    private String location;
    private LocalDateTime scheduled_at;
    private LocalDateTime created_at;
    private LocalDateTime updated_at;

    private String status;
}