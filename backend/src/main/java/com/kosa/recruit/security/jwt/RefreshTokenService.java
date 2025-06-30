package com.kosa.recruit.security.jwt;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class RefreshTokenService {

    private final RedisTemplate<String, String> redisTemplate;

    // Redis TTL 설정 (예: 30일 동안 블랙리스트로 저장)
    @Value("${jwt.refresh-token-expiration-time}")
    private long refreshTokenExpirationTime;

    public RefreshTokenService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    //리프레시 토큰을 블랙리스트에 저장
    public void blacklist(String refreshToken) {
        redisTemplate.opsForValue().set(refreshToken, "BLACKLISTED", refreshTokenExpirationTime, TimeUnit.MILLISECONDS);
    }

    //리프레시 토큰이 블랙리스트에 있는지 확인
    public boolean isBlacklisted(String refreshToken) {
        return redisTemplate.hasKey(refreshToken);
    }
}
