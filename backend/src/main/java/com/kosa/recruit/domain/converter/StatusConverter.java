package com.kosa.recruit.domain.converter;

import com.kosa.recruit.domain.enums.Status;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class StatusConverter implements AttributeConverter<Status, String>{
    @Override
    public String convertToDatabaseColumn(Status attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public Status convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        return Status.valueOf(dbData.toUpperCase());  // <-- 소문자 → 대문자 변환
    }
}
