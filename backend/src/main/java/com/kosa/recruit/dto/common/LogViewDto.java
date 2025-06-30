package com.kosa.recruit.dto.common;

import com.kosa.recruit.domain.enums.ApplicationViewAction;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class LogViewDto {
    // 열람 액션 타입 (VIEW, CONFIRM, DOWNLOAD 등)
    private ApplicationViewAction action;

    // 선택: 메모/사유 등 남기고 싶으면
    private String memo;

    // 선택: 클라이언트에서 userAgent/ip 받으면 기록
    private String userAgent;
    private String ipAddress;
}
