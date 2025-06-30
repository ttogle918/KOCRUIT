package com.kosa.recruit.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kosa.recruit.domain.entity.Spec;

public interface SpecRepository extends JpaRepository<Spec, Long> {
    Optional<Spec> findById(Long specId);

}