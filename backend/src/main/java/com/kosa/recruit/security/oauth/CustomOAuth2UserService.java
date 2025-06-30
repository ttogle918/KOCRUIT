package com.kosa.recruit.security.oauth;

import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.repository.UserRepository;
import com.kosa.recruit.security.auth.CustomUserDetails;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j //   For logging
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest request) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User;
        try {
            oAuth2User = super.loadUser(request);
        } catch (OAuth2AuthenticationException e) {
            log.error("Error during OAuth2 authentication", e);
            OAuth2Error oauth2Error = new OAuth2Error("oauth2_error", "OAuth2 authentication failed", null);
            throw new OAuth2AuthenticationException(oauth2Error, e);
        }

        String registrationId = request.getClientRegistration().getRegistrationId();
        String userNameAttribute = request.getClientRegistration()
                                        .getProviderDetails()
                                        .getUserInfoEndpoint()
                                        .getUserNameAttributeName();

        // 이 부분 수정: 네이버/구글 분기
        OAuthAttributes oAuthAttributes = extractAttributes(oAuth2User, registrationId);

        // 저장 또는 업데이트
        User user = saveOrUpdate(oAuthAttributes);

        return new CustomUserDetails(user, oAuthAttributes.getAttributes(), userNameAttribute);
    }

    private User saveOrUpdate(OAuthAttributes attributes) {
        // Try to find existing user by email
        User user = userRepository.findByEmail(attributes.getEmail())
            .orElseGet(() -> {
                log.info("User not found, creating a new user with email: {}", attributes.getEmail());
                return attributes.toEntity();  // If user does not exist, create a new one
            });
        
        // Save the user to the repository
        return userRepository.save(user);
    }

    private OAuthAttributes extractAttributes(OAuth2User oAuth2User, String registrationId) {
        Map<String, Object> attributes = oAuth2User.getAttributes();

        if ("naver".equals(registrationId)) {
            Map<String, Object> response = (Map<String, Object>) attributes.get("response");
            return OAuthAttributes.of(registrationId, "id", response);
        }

        return OAuthAttributes.of(registrationId, "sub", attributes); // ex: Google
    }

}
