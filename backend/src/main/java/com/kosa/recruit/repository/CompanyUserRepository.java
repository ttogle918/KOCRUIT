package com.kosa.recruit.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kosa.recruit.domain.entity.CompanyUser;

public interface CompanyUserRepository extends JpaRepository<CompanyUser, Long> {
    Optional<CompanyUser> findByEmail(String email);
    List<CompanyUser> findByCompanyId(Long companyId);
}