package com.kosa.recruit.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.kosa.recruit.domain.entity.ApplicantUser;
import com.kosa.recruit.domain.entity.CompanyUser;
import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.domain.enums.Role;
import com.kosa.recruit.dto.auth.LoginRequestDto;
import com.kosa.recruit.dto.auth.SignupDto;
import com.kosa.recruit.dto.common.UserDetailDto;
import com.kosa.recruit.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;

@Service
public class UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public UserDetailDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("사용자 없음"));
        return new UserDetailDto(user);
    }

    public void createUser(User user) {
        if (!userRepository.existsById(user.getId())) {
            throw new EntityNotFoundException("User not found with id: " + user.getId());
        }
        userRepository.save(user);
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new EntityNotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }

    public User updateUser(Long id, UserDetailDto requestDto) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + id));

        if (user instanceof ApplicantUser applicant) {
            applicant.setName(requestDto.getName());
            applicant.setEmail(requestDto.getEmail());
            applicant.setPassword(requestDto.getPassword());
            // ApplicantUser 전용 필드도 여기서 처리 가능
            // applicant.setResumeFilePath(requestDto.getResumeFilePath());

        } else if (user instanceof CompanyUser companyUser) {
            companyUser.setName(requestDto.getName());
            companyUser.setEmail(requestDto.getEmail());
            companyUser.setPassword(requestDto.getPassword());
            // CompanyUser 전용 필드도 추가 가능
            // companyUser.setBusinessNumber(requestDto.getBusinessNumber());
        }

        return userRepository.save(user);
    }

    @Transactional
    public User signup(SignupDto request) {
        try {
            logger.debug("Attempting to signup user with email: {}", request.getEmail());

            if (userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email already exists");
            }
            String userType = request.getUserType();    // "APPLICANT" 또는 "COMPANY"
            if (userType == null) {
                throw new IllegalArgumentException("userType은 필수입니다.");
            }
            User user;
            if (userType.equalsIgnoreCase("APPLICANT")) {
            user = ApplicantUser.builder()
                .email(request.getEmail())
                .name(request.getName())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
            } else if (userType.equalsIgnoreCase("COMPANY")) {
                user = CompanyUser.builder()
                    .email(request.getEmail())
                    .name(request.getName())
                    .password(passwordEncoder.encode(request.getPassword()))
                    .role(Role.MANAGER) // 또는 Role.MEMBER
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            } else {
                throw new IllegalArgumentException("지원하지 않는 userType입니다: " + userType);
            }
            return userRepository.save(user);
        } catch (Exception e) {
            logger.error("Error during signup: ", e);
            throw new RuntimeException("회원가입 실패: " + e.getMessage());
        }
    }


    public User login(LoginRequestDto request) {
        try {
            logger.debug("Attempting login for email: {}", request.getEmail());
            
            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> {
                        logger.warn("Login failed: User not found - {}", request.getEmail());
                        return new RuntimeException("User not found");
                    });

            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                logger.warn("Login failed: Invalid password for user - {}", request.getEmail());
                throw new RuntimeException("Invalid password");
            }

            logger.info("Successful login for user: {}", user.getEmail());
            return user;
        } catch (Exception e) {
            logger.error("Error during login: ", e);
            throw new RuntimeException("Login failed: " + e.getMessage());
        }
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

}
