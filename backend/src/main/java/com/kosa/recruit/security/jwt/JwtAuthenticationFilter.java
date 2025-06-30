package com.kosa.recruit.security.jwt;

import com.kosa.recruit.security.auth.CustomUserDetails;
import com.kosa.recruit.security.auth.CustomUserDetailsService;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService customUserDetailsService;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider, CustomUserDetailsService customUserDetailsService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.customUserDetailsService = customUserDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();

        //  공개 경로는 인증 로직 생략 (token 없어도 통과)
        if (uri.startsWith("/common") || uri.equals("/") || uri.equals("/home")) {
            filterChain.doFilter(request, response);
            return;
        }

        // JWT 토큰 헤더에서 가져오기
        String token = getJwtFromRequest(request);
        System.out.println("[JwtAuthenticationFilter] Token from header: " + token);


        if (token != null && jwtTokenProvider.validateToken(token)) {
            String username = jwtTokenProvider.getUsernameFromToken(token);
            System.out.println("[JwtAuthenticationFilter] Valid token for user: " + username);

            CustomUserDetails userDetails = (CustomUserDetails) customUserDetailsService.loadUserByUsername(username);

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            System.out.println("[JwtAuthenticationFilter] Authentication set in context for user: " + username);
        } else {
            System.out.println("[JwtAuthenticationFilter] Invalid or missing token");
        }


        // if (token != null && jwtTokenProvider.validateToken(token)) {
            // 토큰에서 사용자 정보 가져오기 (예: 이메일, 역할 등)
        //     String username = jwtTokenProvider.getUsernameFromToken(token);
        //     String role = jwtTokenProvider.getRoleFromToken(token);

            // 사용자 인증 정보 설정
        //     CustomUserDetails userDetails = (CustomUserDetails) customUserDetailsService.loadUserByUsername(username);

            // 역할 부여
        //     UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
        //             userDetails, null, userDetails.getAuthorities());

        //     authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            // 인증 정보를 SecurityContext에 저장
        //     SecurityContextHolder.getContext().setAuthentication(authentication);
        // }

        // 다음 필터로 전달
         try {
            filterChain.doFilter(request, response);
        } catch (JwtException e) {
            // JWT 예외 처리
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    // HTTP 요청에서 JWT 추출
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        System.out.println("[JwtAuthenticationFilter] Token from header: " + bearerToken);
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7); // "Bearer " 부분 제거하고 토큰 반환
        }
        return null;
    }
}
