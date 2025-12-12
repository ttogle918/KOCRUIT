from sqlalchemy.orm import Session
from app.models.job import JobPost
from app.models.application import Application, OverallStatus, StageName, StageStatus
from app.models.resume import Resume
from app.services.application_service import update_stage_status

def auto_evaluate_all_applications(db: Session):
    """
    모든 지원자에 대해 AI 평가를 자동으로 실행합니다. (Service Layer 버전)
    """
    import requests
    import json
    
    # 평가 대상: AI 점수가 없는 지원자들
    # (실제로는 더 복잡한 조건이 필요할 수 있음)
    unevaluated_applications = db.query(Application).filter(
        (Application.ai_score.is_(None)) | (Application.ai_score == 0)
    ).all()
    
    print(f"AI 평가가 필요한 지원자 수: {len(unevaluated_applications)}")
    
    for idx, application in enumerate(unevaluated_applications):
        try:
            # ... (JobPost, Resume 로드 및 데이터 구성 로직은 생략/유지)
            
            # [Refactored] 상태 업데이트
            # application.status = ApplyStatus.WAITING  <- 삭제
            # application.document_status = DocumentStatus.PENDING <- 삭제
            
            # 대신 update_stage_status 사용
            # (평가 전 대기 상태로 변경하는 로직이라면 아래와 같이)
            # update_stage_status(db, application.id, StageName.DOCUMENT, StageStatus.PENDING)
            
            pass 
            
        except Exception as e:
            print(f"AI 평가 실패: application_id={application.id}, error={str(e)}")
            continue
            
    db.commit()
    return True
