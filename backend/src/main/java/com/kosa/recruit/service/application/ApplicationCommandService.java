package com.kosa.recruit.service.application;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kosa.recruit.domain.entity.ApplicantUser;
import com.kosa.recruit.domain.entity.Application;
import com.kosa.recruit.domain.entity.ApplicationStatusHistory;
import com.kosa.recruit.domain.entity.ApplicationViewLog;
import com.kosa.recruit.domain.entity.JobPost;
import com.kosa.recruit.domain.entity.Resume;
import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.domain.enums.ApplicationViewAction;
import com.kosa.recruit.domain.enums.ApplyStatus;
import com.kosa.recruit.exception.EntityNotFoundException;
import com.kosa.recruit.repository.ApplicationRepository;
import com.kosa.recruit.repository.ApplicationStatusHistoryRepository;
import com.kosa.recruit.repository.ApplicationViewLogRepository;
import com.kosa.recruit.repository.JobPostRepository;
import com.kosa.recruit.repository.ResumeRepository;
import com.kosa.recruit.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ApplicationCommandService {
    // 쓰기 중심
    // 지원서 생성/삭제/상태 변경 등 쓰기 작업
    private final ApplicationRepository applicationRepository;
    private final ResumeRepository resumeRepository;
    private final JobPostRepository jobPostRepository;
    private final UserRepository userRepository;
    private final ApplicationStatusHistoryRepository applicationStatusHistoryRepository;
    private final ApplicationViewLogRepository applicationViewLogRepository;

    @Transactional
    public Application create(Long userId, Long jobPostId, Long resumeId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("유저가 존재하지 않습니다."));
        JobPost jobPost = jobPostRepository.findById(jobPostId)
            .orElseThrow(() -> new IllegalArgumentException("공고가 존재하지 않습니다."));
        Resume resume = resumeRepository.findById(resumeId)
            .orElseThrow(() -> new IllegalArgumentException("이력서가 존재하지 않습니다."));

        ApplicantUser applicant = (ApplicantUser) user;
        
        Application application = Application.builder()
            .applicant(applicant)
            .appliedPost(jobPost)
            .resume(resume)
            .appliedAt(LocalDateTime.now())
            .status(ApplyStatus.WAITING)
            .applicationSource("DIRECT")  // 기본값으로 DIRECT 설정
            .build();

        return applicationRepository.save(application);
    }

    public void delete(Long applicationId) {
        applicationRepository.deleteById(applicationId);
    }

    @Transactional
    public void updateStatus(Long jobPostId, Long applicationId, ApplyStatus status, Long userId) {
        Application application = applicationRepository.findById(applicationId)
            .orElseThrow(() -> new EntityNotFoundException("Application not found"));
        ApplyStatus oldStatus = application.getStatus();
        application.setStatus(status);
        applicationRepository.save(application);

        if (!application.getAppliedPost().getId().equals(jobPostId)) {
            throw new IllegalArgumentException("지원서는 해당 공고에 속해 있지 않습니다.");
        }

        // 상태 변경 이력 저장
        ApplicationStatusHistory history = ApplicationStatusHistory.builder()
            .application(application)
            .fromStatus(oldStatus)
            .toStatus(status)
            .changedByUserId(userId)
            .changedAt(LocalDateTime.now())
            .build();
        applicationStatusHistoryRepository.save(history);

        // application.setStatus(status);
        applicationRepository.save(application);
    }

    // 예: 지원서 열람 시
    public void logView(Long applicationId, Long viewerId, ApplicationViewAction action, String memo, String userAgent, String ip) {
        Application app = applicationRepository.findById(applicationId).orElseThrow();
        User viewer = userRepository.findById(viewerId).orElseThrow();

        ApplicationViewLog log = ApplicationViewLog.builder()
            .application(app)
            .viewer(viewer)
            .viewedAt(LocalDateTime.now())
            .action(action)
            .memo(memo)
            .userAgent(userAgent)
            .ipAddress(ip)
            .build();
        applicationViewLogRepository.save(log);
    }
}
