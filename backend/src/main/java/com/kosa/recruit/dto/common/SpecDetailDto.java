package com.kosa.recruit.dto.common;

import com.kosa.recruit.domain.entity.Spec;
import com.kosa.recruit.domain.enums.SpecType;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SpecDetailDto {
    private SpecType specType;
    private String specDescription;

    public static SpecDetailDto fromEntity(Spec spec) {
        SpecDetailDto dto = new SpecDetailDto();
        dto.setSpecType(spec.getSpecType());
        dto.setSpecDescription(spec.getSpecDescription());
        return dto;
    }
}