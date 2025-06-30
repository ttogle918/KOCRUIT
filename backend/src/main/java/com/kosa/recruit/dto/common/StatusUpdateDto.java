package com.kosa.recruit.dto.common;

import lombok.Getter;
import lombok.Setter;

import com.kosa.recruit.domain.enums.ApplyStatus;

import io.swagger.v3.oas.annotations.media.Schema;

@Getter
@Setter
@Schema(description = "지원서 상태 변경 요청 DTO")
public class StatusUpdateDto {
    @Schema(description = "변경할 상태값")
    private ApplyStatus status;
}
