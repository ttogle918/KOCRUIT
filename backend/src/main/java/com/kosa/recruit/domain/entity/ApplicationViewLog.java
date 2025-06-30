package com.kosa.recruit.domain.entity;

import java.time.LocalDateTime;

import com.kosa.recruit.domain.enums.ApplicationViewAction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/* 누가(기업 사용자), 언제(열람 시각), 뭘 했는지(action: VIEW/CONFIRM 등)
추가적으로 "읽음/미확인" 표시, 알림 등에 활용 */
@Entity
@Table(name = "application_view_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ApplicationViewLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id")
    private Application application;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "viewer_id")
    private User viewer;  // 기업 회원

    private LocalDateTime viewedAt;

    @Column(name = "action", length = 20)
    private ApplicationViewAction action; // VIEW, CONFIRM, DOWNLOAD 등

    @Column(name = "memo", length = 1000)
    private String memo;

    private String userAgent;   // windows or mac.. 등
    private String ipAddress;   // ip 주소값
}
