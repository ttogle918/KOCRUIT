package com.kosa.recruit.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Schema(description = "사용자 로그인 요청 DTO")
@Data
public class LoginRequestDto {
    @Schema(description = "사용자 이메일")
    private String email;

    @Schema(description = "사용자 비밀번호")
    private String password;
}