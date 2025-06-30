package com.kosa.recruit.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import com.kosa.recruit.domain.entity.ApplicantUser;
import com.kosa.recruit.domain.entity.Application;
import com.kosa.recruit.domain.entity.ApplicationViewLog;
import com.kosa.recruit.domain.entity.CompanyUser;
import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.domain.enums.ApplicationViewAction;
import com.kosa.recruit.repository.ApplicationViewLogRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ApplicationViewLogService {
    private final ApplicationViewLogRepository repository;

    @Transactional
    public void save(Long applicationId, Long viewerId, ApplicationViewAction action, String memo, String userAgent, String ipAddress) {
        // 엔티티 생성 & 저장
        ApplicationViewLog log = ApplicationViewLog.builder()
            .application(Application.builder().id(applicationId).build()) // Proxy 참조
            .viewer(CompanyUser.builder().id(viewerId).build()) // Proxy 참조
            .action(action)
            .memo(memo)
            .userAgent(userAgent)
            .ipAddress(ipAddress)
            .viewedAt(LocalDateTime.now())
            .build();
        repository.save(log);
    }
}