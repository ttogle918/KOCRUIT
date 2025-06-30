package com.kosa.recruit.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.kosa.recruit.domain.entity.Company;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {
    List<Company> findAll();
    Optional<Company> findById(Long id);
    void deleteById(Long id);

    Optional<Company> findByName(String name);
    Optional<Company> findByAddress(String address);
    List<Company> findByNameContaining(String keyword);
    List<Company> findByAddressContaining(String keyword);

    // 아래 메서드 삭제 또는 주석 처리
    // List<CompanyDto> findByJobPost();
}
