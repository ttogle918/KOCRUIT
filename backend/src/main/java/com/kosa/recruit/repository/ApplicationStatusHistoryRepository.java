package com.kosa.recruit.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kosa.recruit.domain.entity.ApplicationStatusHistory;

public interface ApplicationStatusHistoryRepository extends JpaRepository<ApplicationStatusHistory, Long> {
}