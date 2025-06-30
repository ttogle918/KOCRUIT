package com.kosa.recruit.domain.converter;

import com.kosa.recruit.domain.enums.ApplyStatus;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ApplyStatusConverter implements AttributeConverter<ApplyStatus, String>{
    @Override
    public String convertToDatabaseColumn(ApplyStatus attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public ApplyStatus convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        return ApplyStatus.valueOf(dbData.toUpperCase());  // <-- 소문자 → 대문자 변환
    }
}
