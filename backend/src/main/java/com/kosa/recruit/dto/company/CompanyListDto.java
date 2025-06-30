package com.kosa.recruit.dto.company;

import com.kosa.recruit.domain.entity.Company;

import lombok.AllArgsConstructor;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyListDto {
    private Long id;
    private String name;
    private String address;

    // Entity → DTO 변환 메서드
    public static CompanyListDto from(Company company) {
        return CompanyListDto.builder()
                .id(company.getId())
                .name(company.getName())
                .address(company.getAddress())
                .build();
    }

    // DTO → Entity 변환 메서드 (필요할 경우)
    public Company toEntity() {
        return Company.builder()
                .id(this.id) // 주의: 생성 시 null일 수 있음
                .name(this.name)
                .address(this.address)
                .build();
    }
}
