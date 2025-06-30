package com.kosa.recruit.security.auth;

import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.domain.enums.Role;
import com.kosa.recruit.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                     .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        
        // attributes, userNameAttribute는 일반 로그인 시 null 가능
        return new CustomUserDetails(user, null, null);  
    }
}