package com.kosa.recruit.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kosa.recruit.domain.entity.ApplicationViewLog;

public interface ApplicationViewLogRepository extends JpaRepository<ApplicationViewLog, Long> {
    // 필요하면 추가 쿼리 선언
}