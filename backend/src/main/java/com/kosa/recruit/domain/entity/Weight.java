package com.kosa.recruit.domain.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "weight")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Weight {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "target_type", nullable = false)
    private String targetType;
    
    @ManyToOne
    @JoinColumn(name = "jobpost_id",
        foreignKey = @ForeignKey(name = "fk_weight_jobpost"))
    private JobPost jobPost;
    
    @Column(name = "field_name", nullable = false)
    private String fieldName;
    
    @Column(name = "weight_value")
    private Float weightValue;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}