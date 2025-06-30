package com.kosa.recruit.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.kosa.recruit.domain.entity.Application;
import com.kosa.recruit.domain.enums.ApplyStatus;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    // 채용 공고 ID로 지원서 목록 조회
    List<Application> findByAppliedPostId(Long jobPostId);

    // 사용자(지원자) ID로 지원서 목록 조회
    List<Application> findByApplicant_Id(Long userId);

    // 지원서 ID + 채용공고 ID로 단건 조회
    Optional<Application> findByIdAndAppliedPostId(Long applicationId, Long jobPostId);

    // 지원서 ID로 단건 조회
    Optional<Application> findById(Long applicationId);

    // 지원서 삭제
    void deleteById(Long applicationId);

    // 상태별로 조회 (예: WAITING 상태만 보기)
    List<Application> findByAppliedPostIdAndStatus(Long jobPostId, ApplyStatus status);

    // 사용자 + 공고 기준 중복 지원 방지
    Optional<Application> findByApplicantIdAndAppliedPostId(Long applicantId, Long jobPostId);

    // 이력서로 연결된 지원서 조회
    List<Application> findByResumeId(Long resumeId);

    // 통과한 지원서 조회 (JPQL 버전)
    @Query("SELECT a FROM Application a WHERE a.status = 'PASSED' AND a.appliedPost.id = :jobPostId")
    List<Application> findByPassedAppliedPostId(@Param("jobPostId") Long jobPostId);
}
