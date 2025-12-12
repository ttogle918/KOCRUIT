from typing import Optional, Dict, Any
from app.models.application import StageStatus

def legacy_to_new(legacy_status: str) -> dict:
    """레거시 상태를 새로운 3개 컬럼 구조로 변환 (StageStatus 사용)"""
    status_mapping = {
        'PENDING': {
            'ai_interview_status': StageStatus.PENDING.value,
            'practical_interview_status': StageStatus.PENDING.value,
            'executive_interview_status': StageStatus.PENDING.value
        },
        'SCHEDULED': {
            'ai_interview_status': StageStatus.SCHEDULED.value,
            'practical_interview_status': StageStatus.PENDING.value,
            'executive_interview_status': StageStatus.PENDING.value
        },
        'IN_PROGRESS': {
            'ai_interview_status': StageStatus.IN_PROGRESS.value,
            'practical_interview_status': StageStatus.PENDING.value,
            'executive_interview_status': StageStatus.PENDING.value
        },
        'COMPLETED': {
            'ai_interview_status': StageStatus.COMPLETED.value,
            'practical_interview_status': StageStatus.PENDING.value,
            'executive_interview_status': StageStatus.PENDING.value
        },
        'PASSED': {
            'ai_interview_status': StageStatus.PASSED.value,
            'practical_interview_status': StageStatus.PENDING.value,
            'executive_interview_status': StageStatus.PENDING.value
        },
        'FAILED': {
            'ai_interview_status': StageStatus.FAILED.value,
            'practical_interview_status': StageStatus.PENDING.value,
            'executive_interview_status': StageStatus.PENDING.value
        },
        'FIRST_SCHEDULED': {
            'ai_interview_status': StageStatus.PASSED.value,
            'practical_interview_status': StageStatus.SCHEDULED.value,
            'executive_interview_status': StageStatus.PENDING.value
        },
        'FIRST_IN_PROGRESS': {
            'ai_interview_status': StageStatus.PASSED.value,
            'practical_interview_status': StageStatus.IN_PROGRESS.value,
            'executive_interview_status': StageStatus.PENDING.value
        },
        'FIRST_COMPLETED': {
            'ai_interview_status': StageStatus.PASSED.value,
            'practical_interview_status': StageStatus.COMPLETED.value,
            'executive_interview_status': StageStatus.PENDING.value
        },
        'FIRST_PASSED': {
            'ai_interview_status': StageStatus.PASSED.value,
            'practical_interview_status': StageStatus.PASSED.value,
            'executive_interview_status': StageStatus.PENDING.value
        },
        'FIRST_FAILED': {
            'ai_interview_status': StageStatus.PASSED.value,
            'practical_interview_status': StageStatus.FAILED.value,
            'executive_interview_status': StageStatus.PENDING.value
        },
        'SECOND_SCHEDULED': {
            'ai_interview_status': StageStatus.PASSED.value,
            'practical_interview_status': StageStatus.PASSED.value,
            'executive_interview_status': StageStatus.SCHEDULED.value
        },
        'SECOND_IN_PROGRESS': {
            'ai_interview_status': StageStatus.PASSED.value,
            'practical_interview_status': StageStatus.PASSED.value,
            'executive_interview_status': StageStatus.IN_PROGRESS.value
        },
        'SECOND_COMPLETED': {
            'ai_interview_status': StageStatus.PASSED.value,
            'practical_interview_status': StageStatus.PASSED.value,
            'executive_interview_status': StageStatus.COMPLETED.value
        },
        'SECOND_PASSED': {
            'ai_interview_status': StageStatus.PASSED.value,
            'practical_interview_status': StageStatus.PASSED.value,
            'executive_interview_status': StageStatus.PASSED.value
        },
        'SECOND_FAILED': {
            'ai_interview_status': StageStatus.PASSED.value,
            'practical_interview_status': StageStatus.PASSED.value,
            'executive_interview_status': StageStatus.FAILED.value
        }
    }
    
    return status_mapping.get(legacy_status, {
        'ai_interview_status': StageStatus.PENDING.value,
        'practical_interview_status': StageStatus.PENDING.value,
        'executive_interview_status': StageStatus.PENDING.value
    })

def get_safe_interview_statuses(converted_statuses: dict) -> dict:
    """변환된 상태값들을 안전하게 StageStatus enum으로 변환"""
    try:
        return {
            'ai_interview_status': StageStatus(converted_statuses['ai_interview_status']),
            'practical_interview_status': StageStatus(converted_statuses['practical_interview_status']),
            'executive_interview_status': StageStatus(converted_statuses['executive_interview_status'])
        }
    except ValueError as e:
        print(f"Invalid status value: {e}")
        return {
            'ai_interview_status': StageStatus.PENDING,
            'practical_interview_status': StageStatus.PENDING,
            'executive_interview_status': StageStatus.PENDING
        }

def new_to_legacy(ai_status: str, first_status: str, second_status: str) -> str:
    """새로운 3개 컬럼 구조를 레거시 상태로 변환"""
    try:
        ai_enum = StageStatus(ai_status)
        first_enum = StageStatus(first_status)
        second_enum = StageStatus(second_status)
        
        # AI 면접 단계
        if ai_enum in [StageStatus.PENDING, StageStatus.SCHEDULED, StageStatus.IN_PROGRESS]:
            return ai_enum.value
        elif ai_enum == StageStatus.FAILED:
            return 'FAILED'
        elif ai_enum == StageStatus.PASSED and first_enum in [StageStatus.PENDING, StageStatus.SCHEDULED, StageStatus.IN_PROGRESS]:
            return 'FIRST_IN_PROGRESS'
        elif first_enum == StageStatus.FAILED:
            return 'FIRST_FAILED'
        elif first_enum == StageStatus.PASSED and second_enum in [StageStatus.PENDING, StageStatus.SCHEDULED, StageStatus.IN_PROGRESS]:
            return 'SECOND_IN_PROGRESS'
        elif second_enum == StageStatus.PASSED:
            return 'SECOND_PASSED'
        elif second_enum == StageStatus.FAILED:
            return 'SECOND_FAILED'
        else:
            return 'PENDING'
    except ValueError:
        return 'PENDING'
