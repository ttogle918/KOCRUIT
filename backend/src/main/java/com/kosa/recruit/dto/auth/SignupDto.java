package com.kosa.recruit.dto.auth;

import com.kosa.recruit.domain.enums.Role;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Schema(description = "회원가입 요청 DTO")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SignupDto {
    @Schema(description = "사용자 이름")
    private String name;

    @Schema(description = "사용자 이메일")
    private String email;

    @Schema(description = "계정 비밀번호")
    private String password;

    @Schema(description = "사용자 유형 (예: 일반회원, 기업회원)")
    // private Role role;

    private String userType = "COMPANY";
}