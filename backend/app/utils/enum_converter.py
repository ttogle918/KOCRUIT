from typing import Optional
from app.models.application import InterviewStatus


def convert_legacy_interview_status(status: str) -> str:
    """
    기존 Enum 값들을 새로운 Enum 값으로 변환
    
    Args:
        status: 기존 상태값
        
    Returns:
        새로운 상태값
    """
    legacy_to_new = {
        'SCHEDULED': InterviewStatus.AI_INTERVIEW_SCHEDULED.value,
        'COMPLETED': InterviewStatus.AI_INTERVIEW_COMPLETED.value,
        'NOT_SCHEDULED': InterviewStatus.AI_INTERVIEW_PENDING.value,
        'AI_INTERVIEW_NOT_SCHEDULED': InterviewStatus.AI_INTERVIEW_PENDING.value,
    }
    
    return legacy_to_new.get(status, status)


def get_safe_interview_status(status: str) -> str:
    """
    안전하게 interview_status를 반환하는 함수
    
    Args:
        status: 데이터베이스에서 가져온 상태값
        
    Returns:
        유효한 상태값
    """
    # 먼저 기존 값 변환 시도
    converted_status = convert_legacy_interview_status(status)
    
    # 변환된 값이 유효한 Enum 값인지 확인
    try:
        InterviewStatus(converted_status)
        return converted_status
    except ValueError:
        # 유효하지 않은 경우 기본값 반환
        return InterviewStatus.AI_INTERVIEW_PENDING.value 