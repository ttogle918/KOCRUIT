package com.kosa.recruit.security.auth;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;

import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.domain.enums.Role;

import lombok.Data;
import lombok.RequiredArgsConstructor;

import java.util.Collection;
import java.util.Map;

@Data
@RequiredArgsConstructor
public class CustomUserDetails implements UserDetails, OAuth2User {
    /* 사용자 정보를 통합하는 클래스 */
    private final User user;
    private final Map<String, Object> attributes;
    private final String userNameAttribute;
    
    public Role getRole() {
        return user.getRole();
    }
    public User getUser() {
        return user;
    }
    public Long getUserId() {
        return user.getId();
    }

    public String getEmail() {
        return user.getEmail();
    }
    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    public String getUserNameAttribute() {
        return userNameAttribute;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // 여기에서 user.getRole().name()을 통해 'ROLE_APPLICANT', 'ROLE_COMPANY'로 역할을 매핑
        return AuthorityUtils.createAuthorityList("ROLE_" + user.getRole().name());
    }

    @Override
    public String getPassword() {
        return user.getPassword();   // 비밀번호
    }

    @Override
    public String getUsername() {
        return user.getEmail(); // 이메일을 Username으로 사용
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @Override
    public String getName() {
        return user.getName();
    }
}
