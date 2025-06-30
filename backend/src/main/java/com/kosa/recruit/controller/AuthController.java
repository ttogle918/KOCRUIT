package com.kosa.recruit.controller;

import com.kosa.recruit.domain.entity.Company;
import com.kosa.recruit.domain.entity.CompanyUser;
import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.domain.enums.Role;
import com.kosa.recruit.dto.auth.LoginRequestDto;
import com.kosa.recruit.dto.auth.LoginResponseDto;
import com.kosa.recruit.dto.auth.SignupDto;
import com.kosa.recruit.dto.common.RefreshTokenRequestDto;
import com.kosa.recruit.dto.common.UserDetailDto;
import com.kosa.recruit.exception.InvalidTokenException;
import com.kosa.recruit.repository.ApplicantUserRepository;
import com.kosa.recruit.repository.CompanyUserRepository;
import com.kosa.recruit.repository.UserRepository;
import com.kosa.recruit.security.auth.CustomUserDetails;
import com.kosa.recruit.security.jwt.JwtTokenProvider;
import com.kosa.recruit.security.jwt.RefreshTokenService;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

import java.io.IOException;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "인증 API", description = "회원가입, 로그인, 토큰 재발급, 사용자 인증 정보 확인 등")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final CompanyUserRepository companyuserRepository;
    private final ApplicantUserRepository applicantuserRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    
    // 회원가입
    @Operation(summary = "회원가입", description = "이메일, 이름, 비밀번호를 입력받아 회원가입을 수행합니다.")
    @PostMapping("/signup")
    public ResponseEntity<String> signup(@RequestBody SignupDto request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            System.out.println("이미 가입된 이메일입니다.");
            return ResponseEntity.badRequest().body("이미 가입된 이메일입니다.");
        }

        User user = CompanyUser.builder()
                .email(request.getEmail())
                .name(request.getName())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .build();

        userRepository.save(user);
        System.out.println("회원가입 성공");
        return ResponseEntity.ok("회원가입 성공");
    }

    // 로그인
    @Operation(summary = "로그인", description = "이메일과 비밀번호를 입력받아 JWT 토큰을 발급합니다.")
    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> login(@RequestBody LoginRequestDto request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        String email = authentication.getName();
        String accessToken = jwtTokenProvider.createToken(email, user.getRole());
        String refreshToken = jwtTokenProvider.createRefreshToken(email);

        return ResponseEntity.ok(new LoginResponseDto(accessToken, refreshToken));
    }

    // 리프레시 토큰으로 액세스 토큰 재발급
    @Operation(summary = "토큰 재발급", description = "리프레시 토큰을 통해 새로운 액세스 토큰을 발급합니다.")
    @PostMapping("/refresh")
    public LoginResponseDto refresh(@RequestBody RefreshTokenRequestDto request) {
        String refreshToken = request.getRefreshToken();
        
        if (jwtTokenProvider.validateToken(refreshToken)) {
            String username = jwtTokenProvider.getUsernameFromToken(refreshToken);
            String newAccessToken = jwtTokenProvider.createToken(username, Role.USER);
            return new LoginResponseDto(newAccessToken, refreshToken);
        } else {
            throw new InvalidTokenException("Invalid refresh token");
        }
    }
    
    // @GetMapping("/auth/kakao/callback")
    // public ResponseEntity<LoginResponse> loginByKakao(@RequestParam final String code) {
    //     return ResponseEntity.ok(authService.register(code));
    // }


    @Operation(summary = "현재 사용자 정보 조회", description = "현재 로그인된 사용자의 정보를 반환합니다.")
    @GetMapping("/me")
    public ResponseEntity<UserDetailDto> getCurrentUser(@AuthenticationPrincipal CustomUserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).build();
            }

            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));
            
            // CompanyUser인 경우 추가 정보 확인
            if (user instanceof CompanyUser companyUser) {
                if (companyUser.getCompany() == null) {
                    // company 정보가 없는 경우 대응
                    return ResponseEntity.ok(new UserDetailDto(user)); 
                }
                // 필요하면 여기서 Company 정보 포함해서 UserDetailDto 생성
            }
            return ResponseEntity.ok(new UserDetailDto(user));
        } catch (UsernameNotFoundException e) {
            return ResponseEntity.status(404).build();
        } catch (Exception e) {
            e.printStackTrace(); // Log the error for debugging
            return ResponseEntity.status(500).build();
        }
    }

    @Operation(summary = "로그아웃 (프론트 리다이렉트)", description = "로그아웃 시 클라이언트를 로그인 페이지로 리다이렉트합니다.")
    @GetMapping("/logout")
    public void logout(HttpServletResponse response) throws IOException {
        // 클라이언트가 처리할 수 있도록 홈 또는 로그인 페이지로 리다이렉트
        response.sendRedirect("http://localhost:5173/login");
    }

    @Operation(summary = "로그아웃 (서버 처리)", description = "Refresh 토큰을 블랙리스트에 저장하여 로그아웃 처리합니다.")
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String token) {
        String refreshToken = token.replace("Bearer ", "");
        refreshTokenService.blacklist(refreshToken); // 블랙리스트 저장
        return ResponseEntity.ok().build();
    }

}
