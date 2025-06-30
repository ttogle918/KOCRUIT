package com.kosa.recruit.controller;

import com.kosa.recruit.dto.auth.LoginRequestDto;
import com.kosa.recruit.dto.auth.SignupDto;
import com.kosa.recruit.dto.common.UserDetailDto;
import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.domain.enums.Role;
import com.kosa.recruit.service.UserService;
import com.kosa.recruit.security.jwt.JwtTokenProvider;

import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Tag(name = "사용자 API", description = "회원 정보 조회, 수정, 삭제 API")
public class UserController {

    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;

    @Operation(summary = "회원가입", description = "사용자로부터 회원가입 정보를 받아 새로운 사용자를 생성합니다.")
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupDto request) {
        try {
            User user = userService.signup(request);
            return ResponseEntity.ok(Map.of("message", "회원가입 성공"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @Operation(summary = "유저 상세 조회", description = "유저 ID를 이용하여 유저 정보를 조회합니다.")
    @GetMapping("/{id}")
    public ResponseEntity<UserDetailDto> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @Operation(summary = "유저 정보 수정", description = "유저 ID를 이용하여 유저 정보를 수정합니다.")
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(
            @PathVariable Long id,
            @RequestBody UserDetailDto requestDto) {
        User updateUser = userService.updateUser(id, requestDto);
        return ResponseEntity.ok(updateUser);
    }

    @Operation(summary = "유저 삭제", description = "유저 ID를 이용하여 해당 유저를 삭제합니다.")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDto request) {
        try {
            User user = userService.login(request);
            // Map userType to Role if role is null
            Role role = user.getRole();
            if (role == null && user.getRole() != null) {
                    role = Role.USER;
            }
            // Generate JWT token
            String token = jwtTokenProvider.createToken(user.getEmail(), role);
            // Build user info for frontend
            UserDetailDto userDto = new UserDetailDto(user.getId(), user.getEmail(), role);
            return ResponseEntity.ok(java.util.Map.of(
                "token", token,
                "user", userDto
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmailExists(@RequestParam String email) {
        boolean exists = userService.existsByEmail(email);
        Map<String, Boolean> response = new HashMap<>();
        response.put("exists", exists);
        return ResponseEntity.ok(response);
    }
}
