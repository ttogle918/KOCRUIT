package com.kosa.recruit.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kosa.recruit.domain.entity.ApplicantUser;

public interface ApplicantUserRepository extends JpaRepository<ApplicantUser, Long> {
    Optional<ApplicantUser> findByEmail(String email);
}
