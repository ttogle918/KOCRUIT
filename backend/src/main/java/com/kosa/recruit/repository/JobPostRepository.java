package com.kosa.recruit.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.kosa.recruit.domain.entity.JobPost;
import com.kosa.recruit.dto.jobpost.JobPostListDto;

public interface JobPostRepository extends JpaRepository<JobPost, Long> {

    List<JobPost> findByCompanyIdOrderByEndDateAsc(Long companyId);

    @Query("""
        SELECT new com.kosa.recruit.dto.jobpost.JobPostListDto(j.id, j.title, j.endDate, j.company.name)
        FROM JobPost j
        WHERE j.endDate >= :now
    """)
    List<JobPostListDto> findActiveJobPosts(@Param("now") LocalDateTime now);

    @Query("SELECT j FROM JobPost j ORDER BY j.id DESC")
    List<JobPost> findAllWithPaging(Pageable pageable);

    @Query("""
        SELECT jp FROM JobPost jp 
        WHERE jp.title LIKE %:keyword% 
        OR jp.qualifications LIKE %:keyword% 
        OR jp.conditions LIKE %:keyword% 
        OR jp.jobDetails LIKE %:keyword% 
        OR jp.procedure LIKE %:keyword%
    """)
    List<JobPost> searchJobPosts(@Param("keyword") String keyword);

    List<JobPost> findByCompanyId(Long companyId);
    List<JobPost> findByTitle(String title);
    List<JobPost> findByEndDate(LocalDateTime endDate);
}