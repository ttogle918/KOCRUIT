package com.kosa.recruit.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kosa.recruit.domain.entity.Job;
import com.kosa.recruit.domain.entity.JobPost;
import com.kosa.recruit.domain.entity.User;

public interface JobRepository extends JpaRepository<Job, Job.JobId> {

    Optional<Job> findByUser(User user);
    Optional<Job> findByJobPost(JobPost jobPost);
    
    boolean existsByJobPostId(Long id);
    void deleteByJobPostId(Long id);
}
