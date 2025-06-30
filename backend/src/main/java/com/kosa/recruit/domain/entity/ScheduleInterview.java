package com.kosa.recruit.domain.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "schedule_interview")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleInterview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "schedule_id",
        foreignKey = @ForeignKey(name = "fk_scheduleinterview_schedule"))
    private Schedule schedule;

    @ManyToOne
    @JoinColumn(name = "user_id",
        foreignKey = @ForeignKey(name = "fk_scheduleinterview_user"))
    private CompanyUser user;
    
    private LocalDateTime schedule_date;

    private String status;
}