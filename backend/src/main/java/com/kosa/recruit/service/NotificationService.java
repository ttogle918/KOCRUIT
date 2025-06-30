package com.kosa.recruit.service;

import java.time.LocalDateTime;
import java.util.stream.Collectors;
import com.kosa.recruit.domain.entity.Application;
import com.kosa.recruit.domain.entity.Notification;
import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.dto.common.NotificationDto;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

import com.kosa.recruit.repository.NotificationRepository;

import jakarta.transaction.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;

    // 알림 생성
    public void sendResumeViewedNotification(Application application) {
        Notification notification = Notification.builder()
                .user(application.getApplicant())
                .message("[" + application.getAppliedPost().getTitle() + "] 공고에 제출한 이력서를 기업이 열람했습니다.")
                .type("RESUME_VIEWED")
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        notificationRepository.save(notification);
    }

    // 알림 목록 조회
    public List<NotificationDto> getNotificationsForUser(User user) {
        List<NotificationDto> dtoList = notificationRepository.findByReceiverOrderByCreatedAtDesc(user)
                .stream()
                .map(notification -> NotificationDto.builder()
                        .id(notification.getId())
                        .message(notification.getMessage())
                        .type(notification.getType())
                        .read(notification.isRead())
                        .createdAt(notification.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
        System.out.println("알림 수: " + dtoList.size());
        return dtoList;
    }

    public List<NotificationDto> getUnreadNotifications(User user) {
        return notificationRepository.findByUserAndIsReadFalse(user)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private NotificationDto convertToDto(Notification notification) {
        return NotificationDto.builder()
                .id(notification.getId())
                .message(notification.getMessage())
                .type(notification.getType())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }

    // 알림 읽음 처리
    public void markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("알림을 찾을 수 없습니다."));
        notification.setRead(false);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(User user) {
        List<Notification> notifications = notificationRepository.findByUserAndIsReadFalse(user);
        for (Notification notification : notifications) {
            notification.setRead(true);
        }
        notificationRepository.saveAll(notifications);
    }

    @Transactional
    public void deleteNotification(Long id) {
        notificationRepository.deleteById(id);
    }

    @Transactional
    public void deleteAllNotifications(User user) {
        notificationRepository.deleteByUser(user);
    }

}
