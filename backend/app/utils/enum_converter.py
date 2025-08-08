from typing import Optional, Dict, Any
from app.models.application import AIInterviewStatus, FirstInterviewStatus, SecondInterviewStatus


def convert_legacy_interview_status(status: str) -> Dict[str, str]:
    """
    기존 단일 interview_status를 새로운 3개 컬럼 구조로 변환
    
    Args:
        status: 기존 상태값
        
    Returns:
        새로운 3개 컬럼 상태값 딕셔너리
    """
    legacy_to_new = {
        'AI_INTERVIEW_PENDING': {
            'ai_interview_status': AIInterviewStatus.PENDING.value,
            'first_interview_status': FirstInterviewStatus.PENDING.value,
            'second_interview_status': SecondInterviewStatus.PENDING.value
        },
        'AI_INTERVIEW_SCHEDULED': {
            'ai_interview_status': AIInterviewStatus.SCHEDULED.value,
            'first_interview_status': FirstInterviewStatus.PENDING.value,
            'second_interview_status': SecondInterviewStatus.PENDING.value
        },
        'AI_INTERVIEW_IN_PROGRESS': {
            'ai_interview_status': AIInterviewStatus.IN_PROGRESS.value,
            'first_interview_status': FirstInterviewStatus.PENDING.value,
            'second_interview_status': SecondInterviewStatus.PENDING.value
        },
        'AI_INTERVIEW_COMPLETED': {
            'ai_interview_status': AIInterviewStatus.COMPLETED.value,
            'first_interview_status': FirstInterviewStatus.PENDING.value,
            'second_interview_status': SecondInterviewStatus.PENDING.value
        },
        'AI_INTERVIEW_PASSED': {
            'ai_interview_status': AIInterviewStatus.PASSED.value,
            'first_interview_status': FirstInterviewStatus.PENDING.value,
            'second_interview_status': SecondInterviewStatus.PENDING.value
        },
        'AI_INTERVIEW_FAILED': {
            'ai_interview_status': AIInterviewStatus.FAILED.value,
            'first_interview_status': FirstInterviewStatus.PENDING.value,
            'second_interview_status': SecondInterviewStatus.PENDING.value
        },
        'FIRST_INTERVIEW_SCHEDULED': {
            'ai_interview_status': AIInterviewStatus.PASSED.value,
            'first_interview_status': FirstInterviewStatus.SCHEDULED.value,
            'second_interview_status': SecondInterviewStatus.PENDING.value
        },
        'FIRST_INTERVIEW_IN_PROGRESS': {
            'ai_interview_status': AIInterviewStatus.PASSED.value,
            'first_interview_status': FirstInterviewStatus.IN_PROGRESS.value,
            'second_interview_status': SecondInterviewStatus.PENDING.value
        },
        'FIRST_INTERVIEW_COMPLETED': {
            'ai_interview_status': AIInterviewStatus.PASSED.value,
            'first_interview_status': FirstInterviewStatus.COMPLETED.value,
            'second_interview_status': SecondInterviewStatus.PENDING.value
        },
        'FIRST_INTERVIEW_PASSED': {
            'ai_interview_status': AIInterviewStatus.PASSED.value,
            'first_interview_status': FirstInterviewStatus.PASSED.value,
            'second_interview_status': SecondInterviewStatus.PENDING.value
        },
        'FIRST_INTERVIEW_FAILED': {
            'ai_interview_status': AIInterviewStatus.PASSED.value,
            'first_interview_status': FirstInterviewStatus.FAILED.value,
            'second_interview_status': SecondInterviewStatus.PENDING.value
        },
        'SECOND_INTERVIEW_SCHEDULED': {
            'ai_interview_status': AIInterviewStatus.PASSED.value,
            'first_interview_status': FirstInterviewStatus.PASSED.value,
            'second_interview_status': SecondInterviewStatus.SCHEDULED.value
        },
        'SECOND_INTERVIEW_IN_PROGRESS': {
            'ai_interview_status': AIInterviewStatus.PASSED.value,
            'first_interview_status': FirstInterviewStatus.PASSED.value,
            'second_interview_status': SecondInterviewStatus.IN_PROGRESS.value
        },
        'SECOND_INTERVIEW_COMPLETED': {
            'ai_interview_status': AIInterviewStatus.PASSED.value,
            'first_interview_status': FirstInterviewStatus.PASSED.value,
            'second_interview_status': SecondInterviewStatus.COMPLETED.value
        },
        'SECOND_INTERVIEW_PASSED': {
            'ai_interview_status': AIInterviewStatus.PASSED.value,
            'first_interview_status': FirstInterviewStatus.PASSED.value,
            'second_interview_status': SecondInterviewStatus.PASSED.value
        },
        'SECOND_INTERVIEW_FAILED': {
            'ai_interview_status': AIInterviewStatus.PASSED.value,
            'first_interview_status': FirstInterviewStatus.PASSED.value,
            'second_interview_status': SecondInterviewStatus.FAILED.value
        }
    }
    
    return legacy_to_new.get(status, {
        'ai_interview_status': AIInterviewStatus.PENDING.value,
        'first_interview_status': FirstInterviewStatus.PENDING.value,
        'second_interview_status': SecondInterviewStatus.PENDING.value
    })


def get_safe_interview_statuses(status: str) -> Dict[str, str]:
    """
    안전하게 3개 interview_status를 반환하는 함수
    
    Args:
        status: 데이터베이스에서 가져온 기존 상태값
        
    Returns:
        유효한 3개 상태값 딕셔너리
    """
    # 기존 값 변환
    converted_statuses = convert_legacy_interview_status(status)
    
    # 각 상태값이 유효한 Enum 값인지 확인
    try:
        AIInterviewStatus(converted_statuses['ai_interview_status'])
        FirstInterviewStatus(converted_statuses['first_interview_status'])
        SecondInterviewStatus(converted_statuses['second_interview_status'])
        return converted_statuses
    except ValueError:
        # 유효하지 않은 경우 기본값 반환
        return {
            'ai_interview_status': AIInterviewStatus.PENDING.value,
            'first_interview_status': FirstInterviewStatus.PENDING.value,
            'second_interview_status': SecondInterviewStatus.PENDING.value
        }


def get_current_interview_stage(ai_status: str, first_status: str, second_status: str) -> str:
    """
    현재 면접 단계를 판단하는 함수
    
    Args:
        ai_status: AI 면접 상태
        first_status: 1차 면접 상태
        second_status: 2차 면접 상태
        
    Returns:
        현재 면접 단계 문자열
    """
    try:
        ai_enum = AIInterviewStatus(ai_status)
        first_enum = FirstInterviewStatus(first_status)
        second_enum = SecondInterviewStatus(second_status)
        
        # AI 면접 단계
        if ai_enum in [AIInterviewStatus.PENDING, AIInterviewStatus.SCHEDULED, AIInterviewStatus.IN_PROGRESS]:
            return "AI_INTERVIEW"
        elif ai_enum == AIInterviewStatus.FAILED:
            return "AI_INTERVIEW_FAILED"
        elif ai_enum == AIInterviewStatus.PASSED and first_enum in [FirstInterviewStatus.PENDING, FirstInterviewStatus.SCHEDULED, FirstInterviewStatus.IN_PROGRESS]:
            return "FIRST_INTERVIEW"
        elif first_enum == FirstInterviewStatus.FAILED:
            return "FIRST_INTERVIEW_FAILED"
        elif first_enum == FirstInterviewStatus.PASSED and second_enum in [SecondInterviewStatus.PENDING, SecondInterviewStatus.SCHEDULED, SecondInterviewStatus.IN_PROGRESS]:
            return "SECOND_INTERVIEW"
        elif second_enum == SecondInterviewStatus.PASSED:
            return "ALL_PASSED"
        elif second_enum == SecondInterviewStatus.FAILED:
            return "SECOND_INTERVIEW_FAILED"
        else:
            return "UNKNOWN"
    except ValueError:
        return "UNKNOWN" 