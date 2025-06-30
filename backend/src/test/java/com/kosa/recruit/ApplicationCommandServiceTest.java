package com.kosa.recruit;

import com.kosa.recruit.domain.entity.Application;
import com.kosa.recruit.domain.entity.JobPost;
import com.kosa.recruit.domain.entity.Resume;
import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.repository.ApplicationRepository;
import com.kosa.recruit.repository.JobPostRepository;
import com.kosa.recruit.repository.ResumeRepository;
import com.kosa.recruit.repository.UserRepository;
import com.kosa.recruit.service.application.ApplicationCommandService;

import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class ApplicationCommandServiceTest {

    // @Autowired
    // private ApplicationCommandService applicationCommandService;

    // @Autowired
    // private ApplicationRepository applicationRepository;

    // @Autowired
    // private UserRepository userRepository;

    // @Autowired
    // private JobPostRepository jobPostRepository;

    // @Autowired
    // private ResumeRepository resumeRepository;

    // private Long userId;
    // private Long jobPostId;
    // private Long resumeId;

    // @BeforeEach
    // void setup() {
    //     User user = userRepository.save(User.builder().name("홍길동").build());
    //     JobPost jobPost = jobPostRepository.save(JobPost.builder().title("백엔드 개발자").build());
    //     Resume resume = resumeRepository.save(Resume.builder().title("이력서 1").build());

    //     userId = user.getId();
    //     jobPostId = jobPost.getId();
    //     resumeId = resume.getId();
    // }

    // @Test
    // void testApplyAndDelete() {
    //     // 지원서 생성
    //     Application application = applicationCommandService.create(userId, jobPostId, resumeId);
    //     assertThat(application).isNotNull();

    //     // 삭제
    //     applicationCommandService.delete(application.getId());
    //     assertThat(applicationRepository.findById(application.getId())).isEmpty();
    // }
}
