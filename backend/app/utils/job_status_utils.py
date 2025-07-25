from datetime import datetime
from typing import Optional
from pytz import timezone
KST = timezone('Asia/Seoul')

def determine_job_status(start_date: Optional[str], end_date: Optional[str]) -> str:
    """
    현재 시간 기준으로 JobPost의 적절한 상태를 결정합니다.
    
    Args:
        start_date: 공고 시작일 (YYYY-MM-DD HH:MM:SS 형식)
        end_date: 공고 마감일 (YYYY-MM-DD HH:MM:SS 형식)
    
    Returns:
        str: "SCHEDULED", "RECRUITING", "SELECTING", "CLOSED" 중 하나
    """
    now = datetime.now(KST)
    
    # 날짜 파싱 (여러 형식 지원)
    start_dt = None
    end_dt = None
    
    if start_date:
        try:
            # 먼저 %Y-%m-%d %H:%M:%S 형식 시도
            start_dt = datetime.strptime(start_date, "%Y-%m-%d %H:%M:%S")
            start_dt = KST.localize(start_dt)
        except ValueError:
            try:
                # %Y-%m-%d %H:%M 형식 시도
                start_dt = datetime.strptime(start_date, "%Y-%m-%d %H:%M")
                start_dt = KST.localize(start_dt)
            except ValueError:
                try:
                    # %Y-%m-%d 형식 시도
                    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                    start_dt = KST.localize(start_dt)
                except ValueError:
                    # 모든 형식이 실패하면 None
                    start_dt = None
    
    if end_date:
        try:
            # 먼저 %Y-%m-%d %H:%M:%S 형식 시도
            end_dt = datetime.strptime(end_date, "%Y-%m-%d %H:%M:%S")
            end_dt = KST.localize(end_dt)
        except ValueError:
            try:
                # %Y-%m-%d %H:%M 형식 시도
                end_dt = datetime.strptime(end_date, "%Y-%m-%d %H:%M")
                end_dt = KST.localize(end_dt)
            except ValueError:
                try:
                    # %Y-%m-%d 형식 시도
                    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                    end_dt = KST.localize(end_dt)
                except ValueError:
                    # 모든 형식이 실패하면 None
                    end_dt = None
    
    # 상태 결정 로직
    if start_dt and end_dt:
        if now < start_dt:
            return "SCHEDULED"  # 시작일 전
        elif start_dt <= now <= end_dt:
            return "RECRUITING"  # 모집 기간
        elif now > end_dt:
            return "SELECTING"  # 마감 후 선발 중
    elif start_dt:
        if now < start_dt:
            return "SCHEDULED"
        else:
            return "RECRUITING"
    elif end_dt:
        if now <= end_dt:
            return "RECRUITING"
        else:
            return "SELECTING"
    else:
        # 날짜가 없는 경우 기본값
        return "RECRUITING"
    
    return "RECRUITING"  # 기본값

def should_update_status(current_status: str, new_status: str) -> bool:
    """
    상태 업데이트가 필요한지 확인합니다.
    
    Args:
        current_status: 현재 상태
        new_status: 새로운 상태
    
    Returns:
        bool: 업데이트 필요 여부
    """
    # 상태 우선순위: SCHEDULED < RECRUITING < SELECTING < CLOSED
    status_priority = {
        "SCHEDULED": 1,
        "RECRUITING": 2,
        "SELECTING": 3,
        "CLOSED": 4
    }
    
    current_priority = status_priority.get(current_status, 0)
    new_priority = status_priority.get(new_status, 0)
    
    # 더 높은 우선순위로만 업데이트 (예: SCHEDULED -> RECRUITING은 가능, RECRUITING -> SCHEDULED는 불가)
    return new_priority > current_priority 