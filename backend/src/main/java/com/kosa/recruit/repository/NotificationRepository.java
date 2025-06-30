package com.kosa.recruit.repository;

import com.kosa.recruit.domain.entity.Notification;
import com.kosa.recruit.domain.entity.User;

import org.springframework.data.repository.query.Param;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    // 전체 알림 최신순
    @Query("SELECT n FROM Notification n WHERE n.user = :user ORDER BY n.createdAt DESC")
    List<Notification> findByReceiverOrderByCreatedAtDesc(User user);

    // 안읽은 알림만 최신순
    @Query("SELECT n FROM Notification n WHERE n.user = :user AND n.isRead = false ORDER BY n.createdAt DESC")
    List<Notification> findByUserAndIsReadFalse(@Param("user") User user);

    void deleteByUser(User user);
}