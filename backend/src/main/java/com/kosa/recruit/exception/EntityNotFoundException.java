package com.kosa.recruit.exception;


/* service layer에서 엔티티가 없을 때예외 처리 ( 이후 전역 예외 헨들러에서 처리됨 ) */
public class EntityNotFoundException extends RuntimeException {
    public EntityNotFoundException(String message) {
        super(message);
    }
}
