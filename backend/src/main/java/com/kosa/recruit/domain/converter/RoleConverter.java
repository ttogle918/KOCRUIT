package com.kosa.recruit.domain.converter;

import com.kosa.recruit.domain.enums.Role;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class RoleConverter implements AttributeConverter<Role, String> {

    @Override
    public String convertToDatabaseColumn(Role role) {
        return role == null ? null : role.name().toLowerCase();
    }

    @Override
    public Role convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        return Role.valueOf(dbData.toUpperCase()); // <-- 소문자 → 대문자 변환
    }
}