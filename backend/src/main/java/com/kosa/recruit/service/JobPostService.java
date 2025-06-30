package com.kosa.recruit.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kosa.recruit.domain.entity.Company;
import com.kosa.recruit.domain.entity.CompanyUser;
import com.kosa.recruit.domain.entity.JobPost;
import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.dto.jobpost.CreateJobPostDto;
import com.kosa.recruit.dto.jobpost.JobPostDetailDto;
import com.kosa.recruit.dto.jobpost.JobPostListDto;
import com.kosa.recruit.dto.jobpost.UpdateJobPostDto;
import com.kosa.recruit.repository.CompanyRepository;
import com.kosa.recruit.repository.JobPostRepository;
import com.kosa.recruit.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class JobPostService {
    private final JobPostRepository jobPostRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

    public List<JobPostDetailDto> searchJobPosts(String keyword) {
        List<JobPost> posts;

        if (keyword == null || keyword.trim().isEmpty()) {
            posts = jobPostRepository.findAll();
        } else {
            posts = jobPostRepository.searchJobPosts(keyword);
        }
        return posts.stream().map(JobPostDetailDto::new)
                    .collect(Collectors.toList());
    }
    
    public List<JobPostListDto> getAllJobPosts() {
        return jobPostRepository.findAll().stream()
                .map(JobPostListDto::from).collect(Collectors.toList());
    }

    public JobPostDetailDto getJobPostById(Long id) {
        JobPost jobpost = jobPostRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("JobPost not found"));

        return JobPostDetailDto.from(jobpost);
    }

    public JobPost createJobPost(CreateJobPostDto dto, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
        .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        if (!(user instanceof CompanyUser)) {
            throw new RuntimeException("기업 사용자만 이 기능을 사용할 수 있습니다.");
        }

        CompanyUser companyUser = (CompanyUser) user;
        // 사용자의 회사 정보 가져오기
        Company company = companyUser.getCompany();
        if (company == null) {
            throw new RuntimeException("회사 정보가 없습니다.");
        }
        JobPost jobPost = new JobPost();
        jobPost.setTitle(dto.getTitle() != null ? dto.getTitle() : "");
        jobPost.setQualifications(dto.getQualifications() != null ? dto.getQualifications() : "");
        jobPost.setConditions(dto.getConditions() != null ? dto.getConditions() : "");
        jobPost.setJobDetails(dto.getJobDetails());
        jobPost.setProcedure(dto.getProcedure() != null ? dto.getProcedure() : "");
        jobPost.setHeadcount(dto.getHeadcount() != null ? dto.getHeadcount() : 1);
        jobPost.setStartDate(dto.getStartDate());
        jobPost.setEndDate(dto.getEndDate());
        jobPost.setCompany(company); // 여기서 회사 정보 설정
        jobPost.setCreatedAt(LocalDateTime.now());
        jobPost.setUpdatedAt(LocalDateTime.now());
        return jobPostRepository.save(jobPost);
    }


    @Transactional
    public JobPost updateJobPost(Long id, UpdateJobPostDto dto, Long currentUserId) {
        User user = userRepository.findById(currentUserId)
        .orElseThrow(() -> new RuntimeException("사용자 없음"));

        JobPost jobPost = jobPostRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("JobPost 없음"));
        
        if (!(user instanceof CompanyUser)) {
            throw new RuntimeException("기업 사용자만 이 기능을 사용할 수 있습니다.");
        }
        CompanyUser companyUser = (CompanyUser) user;

        if (!companyUser.getCompany().getId().equals(jobPost.getCompany().getId())) {
            throw new AccessDeniedException("회사 소속이 아닙니다.");
        }

        // 필드가 null이 아닌 경우만 업데이트
        if (dto.getTitle() != null) jobPost.setTitle(dto.getTitle());
        if (dto.getQualifications() != null) jobPost.setQualifications(dto.getQualifications());
        if (dto.getConditions() != null) jobPost.setConditions(dto.getConditions());
        if (dto.getJobDetails() != null) jobPost.setJobDetails(dto.getJobDetails());
        if (dto.getProcedure() != null) jobPost.setProcedure(dto.getProcedure());
        if (dto.getHeadcount() != null) jobPost.setHeadcount(dto.getHeadcount());
        if (dto.getEndDate() != null) jobPost.setEndDate(dto.getEndDate());

        jobPost.setUpdatedAt(LocalDateTime.now());

        return jobPostRepository.save(jobPost);
}

    @Transactional
    public void deleteJobPost(Long id, Long currentUserId) {
        JobPost jobPost = jobPostRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("JobPost not found with id: " + id));

        Long ownerCompanyId = jobPost.getCompany().getId();
    
        // 현재 로그인한 사용자가 해당 회사의 사용자(또는 관리자)인지 확인
        User user = userRepository.findById(currentUserId)
            .orElseThrow(() -> new RuntimeException("CompanyUser not found"));
        
        if (!(user instanceof CompanyUser)) {
            throw new RuntimeException("기업 사용자만 이 기능을 사용할 수 있습니다.");
        }
        CompanyUser companyUser = (CompanyUser) user;

        if (!companyUser.getCompany().getId().equals(ownerCompanyId)) {
            throw new AccessDeniedException("해당 채용공고를 삭제할 권한이 없습니다.");
        }
        
        jobPostRepository.deleteById(id);
    }

    public List<JobPost> getJobPostsByDeadline(LocalDateTime deadline) {
        return jobPostRepository.findByEndDate(deadline);
    }

    public List<JobPost> getJobPostsByTitle(String title) {
        return jobPostRepository.findByTitle(title);
    }

    public List<JobPostDetailDto> getJobPostByCompanyId(Long companyId) {
        List<JobPost> jobPosts = jobPostRepository.findByCompanyId(companyId);

        return jobPosts.stream()
            .map(JobPostDetailDto::new)
            .collect(Collectors.toList());
    }
}
