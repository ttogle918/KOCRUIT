package com.kosa.recruit.domain.entity;
import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notification")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String message;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id",
        foreignKey = @ForeignKey(name = "fk_notification_user"))
    private User user;
    
    private String type;
    @Column(name = "is_read")
    private boolean isRead;
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
}