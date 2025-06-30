package com.kosa.recruit.dto.common;

import lombok.Data;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class RefreshTokenRequestDto {
    private String refreshToken;
}
