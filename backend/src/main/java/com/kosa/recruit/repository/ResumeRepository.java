package com.kosa.recruit.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.kosa.recruit.domain.entity.Resume;

public interface ResumeRepository extends JpaRepository<Resume, Long> {
    // 기업용

    @Query("""
        SELECT r FROM Application a
        JOIN a.resume r
        WHERE a.appliedPost.company.id = :companyId
    """)
    List<Resume> findResumesByCompanyId(Long companyId);

    @Query("""
        SELECT r FROM Resume r
        JOIN Application a ON a.resume = r
        JOIN JobPost jp ON a.appliedPost = jp
        WHERE jp.company.id = :companyId
        AND (LOWER(r.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(r.content) LIKE LOWER(CONCAT('%', :keyword, '%')))
    """)
    List<Resume> searchResumesByCompanyId(@Param("keyword") String keyword, @Param("companyId") Long companyId);

    @Query("""
        SELECT r FROM Resume r
        JOIN Application a ON a.resume = r
        JOIN JobPost jp ON a.appliedPost = jp
        WHERE jp.company.id = :companyId AND r.id = :resumeId
    """)
    Optional<Resume> findByIdAndCompanyIdViaApplication(@Param("resumeId") Long resumeId, @Param("companyId") Long companyId);

    // 지원자용
    List<Resume> findByUserId(Long userId);

    Optional<Resume> findById(Long resumeId);
    
    @Query("SELECT j FROM Resume j " +
            "WHERE LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "   OR LOWER(j.content) LIKE LOWER(CONCAT('%', :keyword, '%')) ")
    // +" OR LOWER(j.company.companyName) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Resume> searchByKeyword(@Param("keyword") String keyword);

    // keyword로 이력서 검색
    @Query("""
    SELECT r FROM Resume r
    WHERE r.user.id = :userId AND 
          (LOWER(r.title) LIKE LOWER(CONCAT('%', :keyword, '%')) 
          OR LOWER(r.content) LIKE LOWER(CONCAT('%', :keyword, '%')))
    """)
    List<Resume> findByUserIdAndTitleContaining(Long userId, String keyword);

}
