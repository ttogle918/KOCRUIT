package com.kosa.recruit.security.handler;

import com.kosa.recruit.domain.enums.Role;
import com.kosa.recruit.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
@RequiredArgsConstructor
public class CustomOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");

        String accessToken = jwtTokenProvider.createToken(email, Role.USER);
        String refreshToken = jwtTokenProvider.createRefreshToken(email);

        // JWT를 프론트엔드에 전달 (쿼리로)   => /oauth-success 경로 추가해주면 연결됩니다.!!!
        String redirectUrl = "http://localhost:5173/oauth-success?accessToken=" + accessToken + "&refreshToken=" + refreshToken;
        // String redirectUrl = "http://localhost:5173/oauth2/redirect?accessToken=" + accessToken + "&refreshToken=" + refreshToken;

        response.sendRedirect(redirectUrl);
    }
}
