package com.kosa.recruit;

// import com.fasterxml.jackson.databind.ObjectMapper;
// import com.kosa.recruit.dto.ResumeListDto;
// import com.kosa.recruit.service.ResumeService;
// import com.kosa.recruit.controller.company.CompanyResumeController;
// import com.kosa.recruit.domain.entity.Resume;
// import org.junit.jupiter.api.DisplayName;
// import org.junit.jupiter.api.Test;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
// import org.springframework.boot.test.mock.mockito.MockBean;
// import org.springframework.http.MediaType;
// import org.springframework.security.test.context.support.WithMockUser;
// import org.springframework.test.web.servlet.MockMvc;

// import java.time.LocalDateTime;

// import static org.mockito.Mockito.when;
// import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
// import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// @WebMvcTest(CompanyResumeController.class)
// class ResumeControllerTest {

//     @Autowired
//     private MockMvc mockMvc;

//     @MockBean
//     private ResumeService resumeService;

//     @Autowired
//     private ObjectMapper objectMapper;
// /*
//     @Test
//     @DisplayName("이력서 생성 성공")
//     @WithMockUser(username = "applicant@test.com", roles = {"APPLICANT"})
//     void createResume_success() throws Exception {
//         // given
//         ResumeRequestDto requestDto = new ResumeRequestDto("제목입니다", "본문입니다", "http://example.com/resume.pdf");

//         Resume fakeResume = Resume.builder()
//                 .id(1L)
//                 .title(requestDto.getTitle())
//                 .content(requestDto.getContent())
//                 .fileUrl(requestDto.getFileUrl())
//                 // .score(requestDto.getScore())
//                 .createdAt(LocalDateTime.now())
//                 .updatedAt(LocalDateTime.now())
//                 .build();

//         when(resumeService.createResume(requestDto)).thenReturn(fakeResume);

//         // when & then
//         mockMvc.perform(post("/resumes")
//                         .contentType(MediaType.APPLICATION_JSON)
//                         .content(objectMapper.writeValueAsString(requestDto)))
//                 .andExpect(status().isCreated())
//                 .andExpect(jsonPath("$.title").value("제목입니다"))
//                 .andExpect(jsonPath("$.score").value(99.0));
//     }
//                  */
// }
