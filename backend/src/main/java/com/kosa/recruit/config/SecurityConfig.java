package com.kosa.recruit.config;

import com.kosa.recruit.security.jwt.JwtAuthenticationFilter;
import com.kosa.recruit.security.jwt.JwtTokenProvider;
import com.kosa.recruit.security.jwt.JwtAccessDeniedHandler;
import com.kosa.recruit.security.jwt.JwtAuthenticationEntryPoint;
import com.kosa.recruit.security.oauth.CustomOAuth2UserService;
import com.kosa.recruit.security.handler.CustomOAuth2SuccessHandler;
import lombok.RequiredArgsConstructor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;

@Configuration
@RequiredArgsConstructor
@EnableMethodSecurity(prePostEnabled = true)
@EnableWebSecurity
public class SecurityConfig {

    private final CustomOAuth2UserService oAuth2UserService;
    private final com.kosa.recruit.security.auth.CustomUserDetailsService customUserDetailsService;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtAuthenticationEntryPoint authenticationEntryPoint;
    private final JwtAccessDeniedHandler accessDeniedHandler;

    private final CustomOAuth2SuccessHandler oAuth2SuccessHandler;

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(jwtTokenProvider, customUserDetailsService);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .httpBasic(httpBasic -> httpBasic.disable())
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers.frameOptions(frameOptions -> frameOptions.sameOrigin()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler)
            )
            .userDetailsService(customUserDetailsService)
            .authorizeHttpRequests(auth -> auth
                // 1. 누구나 접근 가능 (비회원 포함)
                .requestMatchers(
                    "/", "/home", 
                    "/common/**",
                    "/login", "/login/**", "/users/**",
                    "/users/signup", "/users/login",
                    "/auth/**", "/oauth2/**",
                    "/swagger-ui/**", "/swagger-ui.html",
                    "/v3/api-docs/**", "/swagger-resources/**", "/webjars/**",
                    "/index.html", "/favicon.ico", "/static/**", "/assets/**", 
                    "/css/**", "/js/**", "/images/**",
                    "/h2-console/**", "/api/**"
                ).permitAll()
                // 2. 일반 사용자만 접근 가능
                // .requestMatchers("/applicant/**", "/resume/**").hasRole("USER")

                // 3. 기업 사용자만 접근 가능
                // .requestMatchers("/company/**").hasAnyRole("MEMBER", "MANAGER")
                // 4. 관리자만 접근 가능
                // .requestMatchers("/admin/**").hasRole("ADMIN")

                // 5. 그 외는 인증 필요
                .anyRequest().authenticated()
            )
            // OAuth2 로그인 설정
            .oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo.userService(oAuth2UserService))
                .successHandler(oAuth2SuccessHandler)
            )
            // JWT 인증 필터 추가
            .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.addAllowedOriginPattern("http://localhost:5173"); // 또는 정확한 origin: "http://localhost:5173"
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.addAllowedOriginPattern("http://localhost:5173"); // 또는 정확히 addAllowedOrigin
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        config.addExposedHeader("Authorization"); // 이거 추가하면 리프레시 토큰 응답 시 사용 가능

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
