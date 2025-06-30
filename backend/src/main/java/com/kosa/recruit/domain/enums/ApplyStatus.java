package com.kosa.recruit.domain.enums;

public enum ApplyStatus {
    APPLIED,
    WAITING,      // 평가 전 (기본)
    SUITABLE,     // 적합 (HR 1차 평가)
    UNSUITABLE,   // 부적합 (HR 1차 평가)
    PASSED,       // 최종 합격
    REJECTED,      // 최종 불합격
    CHECKED
}
