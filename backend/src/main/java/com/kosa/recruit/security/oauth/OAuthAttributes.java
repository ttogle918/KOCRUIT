package com.kosa.recruit.security.oauth;

import com.kosa.recruit.domain.entity.ApplicantUser;
import com.kosa.recruit.domain.entity.CompanyUser;
import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.domain.enums.Role;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
public class OAuthAttributes {

    private String name;
    private String email;
    private String registrationId; // "google", "kakao", "naver"
    private Map<String, Object> attributes;
    private String nameAttributeKey;

    @Builder
    public OAuthAttributes(String name, String email, String registrationId, 
                           Map<String, Object> attributes, String nameAttributeKey) {
        this.name = name;
        this.email = email;
        this.registrationId = registrationId;
        this.attributes = attributes;
        this.nameAttributeKey = nameAttributeKey;
    }

    // 등록 ID에 따라 OAuthAttributes 객체 생성
    public static OAuthAttributes of(String registrationId, String userNameAttributeName, Map<String, Object> attributes) {
        if ("naver".equals(registrationId)) {
            return ofNaver(userNameAttributeName, attributes);
        } else if ("kakao".equals(registrationId)) {
            return ofKakao(userNameAttributeName, attributes);
        } else {
            return ofGoogle(userNameAttributeName, attributes);
        }
    }

    // Google 사용자 정보 처리
    private static OAuthAttributes ofGoogle(String userNameAttributeName, Map<String, Object> attributes) {
        return OAuthAttributes.builder()
            .name((String) attributes.get("name"))
            .email((String) attributes.get("email"))
            .registrationId("google")
            .attributes(attributes)
            .nameAttributeKey(userNameAttributeName)
            .build();
    }

    // Naver 사용자 정보 처리
    private static OAuthAttributes ofNaver(String userNameAttributeName, Map<String, Object> attributes) {
        Map<String, Object> response = (Map<String, Object>) attributes.get("response");
        return OAuthAttributes.builder()
            .name((String) attributes.get("name"))
            .email((String) attributes.get("email"))
            .registrationId("naver")
            .attributes(attributes)
            .nameAttributeKey(userNameAttributeName)
            .build();
    }

    // Kakao 사용자 정보 처리
    private static OAuthAttributes ofKakao(String userNameAttributeName, Map<String, Object> attributes) {
        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
        return OAuthAttributes.builder()
            .email((String) kakaoAccount.get("email"))
            .registrationId("kakao")
            .attributes(attributes)
            .nameAttributeKey(userNameAttributeName)
            .build();
    }
    // User 엔티티로 변환
    public User toEntity() {
        return CompanyUser.builder()
            .email(email)
            .name(name)
            .role(Role.USER) 
            .createdAt(LocalDateTime.now())
            .updatedAt(LocalDateTime.now())
            .build();
    }
    // User 엔티티로 변환
    public CompanyUser toCompanyUserEntity() {
        return CompanyUser.builder()
            .email(email)
            .name(name)
            .role(Role.USER) 
            .createdAt(LocalDateTime.now())
            .updatedAt(LocalDateTime.now())
            .build();
    }
    public ApplicantUser toApplicantEntity() {
        return ApplicantUser.builder()
            .email(email)
            .name(name)
            .role(Role.MEMBER) 
            .createdAt(LocalDateTime.now())
            .updatedAt(LocalDateTime.now())
            .build();
    }

    
}
