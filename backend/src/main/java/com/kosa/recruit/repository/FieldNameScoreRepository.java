package com.kosa.recruit.repository;

import com.kosa.recruit.domain.entity.FieldNameScore;
import com.kosa.recruit.dto.common.FieldNameScoreDto;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FieldNameScoreRepository extends JpaRepository<FieldNameScore, Long> {

    // 1. applicationId로 점수 내림차순 정렬
    List<FieldNameScore> findByApplicationIdOrderByScoreDesc(Long applicationId);

    // 2. 전체 내림차순 정렬
    List<FieldNameScore> findAllByOrderByScoreDesc();

    // 3. applicationId + fieldName 오름차순 + score 내림차순
    List<FieldNameScore> findByApplicationIdOrderByFieldNameAscScoreDesc(Long applicationId);

    // 4. 점수가 minScore 이상인 데이터 내림차순
    List<FieldNameScore> findByScoreGreaterThanEqualOrderByScoreDesc(Double minScore);

    // 5. DTO로 반환하는 것만 Native Query 유지 (JPQL에서 인터페이스 기반 projection은 Entity Graph 필요)
    @Query("""
        SELECT new com.kosa.recruit.dto.common.FieldNameScoreDto(
            f.id, f.application.id, f.fieldName, f.score
        )
        FROM FieldNameScore f
        WHERE f.application.id = :applicationId
        ORDER BY f.score DESC
    """)
    List<FieldNameScoreDto> findDtoByApplicationIdOrderByScoreDesc(@Param("applicationId") Long applicationId);
}
