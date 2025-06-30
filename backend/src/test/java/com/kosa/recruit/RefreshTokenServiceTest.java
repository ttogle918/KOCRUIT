package com.kosa.recruit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import com.kosa.recruit.security.jwt.RefreshTokenService;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

public class RefreshTokenServiceTest {

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this); // Mock 객체 초기화
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);  //opsForValue() 반환값 설정
    }

    @Test
    public void testBlacklistToken() {
        String refreshToken = "sampleRefreshToken";

        //블랙리스트에 토큰 저장
        refreshTokenService.blacklist(refreshToken);

        //RedisTemplate의 opsForValue().set 메소드가 호출되었는지 검증
        verify(valueOperations).set(eq(refreshToken), eq("BLACKLISTED"), anyLong(), eq(TimeUnit.MILLISECONDS));
    }

    @Test
    public void testIsBlacklisted() {
        String refreshToken = "sampleRefreshToken";

        //블랙리스트에 있는지 확인
        when(redisTemplate.hasKey(refreshToken)).thenReturn(true);

        boolean isBlacklisted = refreshTokenService.isBlacklisted(refreshToken);

        assertTrue(isBlacklisted);  //블랙리스트에 있으면 true여야 함
    }

    @Test
    public void testIsNotBlacklisted() {
        String refreshToken = "sampleRefreshToken";

        //블랙리스트에 없는지 확인
        when(redisTemplate.hasKey(refreshToken)).thenReturn(false);

        boolean isBlacklisted = refreshTokenService.isBlacklisted(refreshToken);

        assertFalse(isBlacklisted);  //블랙리스트에 없으면 false여야 함
    }
}
