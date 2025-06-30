package com.kosa.recruit;

import com.kosa.recruit.domain.entity.Application;
import com.kosa.recruit.domain.entity.JobPost;
import com.kosa.recruit.domain.entity.Resume;
import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.domain.enums.ApplyStatus;
import com.kosa.recruit.repository.ApplicationRepository;

import jakarta.transaction.Transactional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Transactional
class ApplicationRepositoryTest {

//     @Autowired
//     private ApplicationRepository applicationRepository;

//     @Test
//     void testSaveAndFindById() {
//         // given
//         User applicant = User.builder().id(1L).build();
//         Resume resume = Resume.builder().id(1L).build();
//         JobPost jobPost = JobPost.builder().id(1L).build();

//         Application application = Application.builder()
//                 .applicant(applicant)
//                 .resume(resume)
//                 .appliedPost(jobPost)
//                 .status(ApplyStatus.WAITING)
//                 .appliedAt(LocalDateTime.now())
//                 .build();

//         // when
//         Application saved = applicationRepository.save(application);
//         Optional<Application> found = applicationRepository.findById(saved.getId());

//         // then
//         assertThat(found).isPresent();
//         assertThat(found.get().getApplicant().getId()).isEqualTo(1L);
//     }
}