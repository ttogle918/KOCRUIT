package com.kosa.recruit.controller;

import com.kosa.recruit.dto.common.NotificationDto;
import com.kosa.recruit.security.auth.CustomUserDetails;
import com.kosa.recruit.service.NotificationService;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // 알림 목록 조회
    @GetMapping
    public ResponseEntity<List<NotificationDto>> getNotifications(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            System.out.println("userDetails is null! 로그인 상태 아님");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(
                notificationService.getNotificationsForUser(userDetails.getUser()));
    }

    // 읽음 처리
    @PutMapping("/{id}/read")
    public ResponseEntity<String> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok("알림을 읽음 처리했습니다.");
    }

    @GetMapping("/unread")
    public ResponseEntity<List<NotificationDto>> getUnreadNotifications(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(notificationService.getUnreadNotifications(userDetails.getUser()));
    }

    @PutMapping("/read/all")
    public ResponseEntity<String> markAllAsRead(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        notificationService.markAllAsRead(userDetails.getUser());
        return ResponseEntity.ok("모든 알림을 읽음 처리했습니다.");
    }
    // 단일 알림 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok("알림이 삭제되었습니다.");
    }

    // 전체 알림 삭제
    @DeleteMapping("/all")
    public ResponseEntity<String> deleteAllNotifications(@AuthenticationPrincipal CustomUserDetails userDetails) {
        notificationService.deleteAllNotifications(userDetails.getUser());
        return ResponseEntity.ok("모든 알림이 삭제되었습니다.");
    }

}