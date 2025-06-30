package com.kosa.recruit.dto.common;
import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDto {
    private Long id;
    private String message;
    private String type;
    private boolean read;
    private LocalDateTime createdAt;
}