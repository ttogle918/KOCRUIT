from collections import defaultdict
from app.models.job import JobPost
from app.models.application import Application, ApplyStatus, DocumentStatus
from app.models.resume import Resume
from app.models.weight import Weight
from sqlalchemy.orm import Session
from datetime import datetime

def auto_evaluate_all_applications(db: Session):
    """
    모든 지원자에 대해 AI 평가를 자동으로 실행합니다.
    AI 평가가 아직 실행되지 않은 지원자들의 ai_score, status, pass_reason, fail_reason을 업데이트합니다.
    """
    import requests
    import json
    
    unevaluated_applications = db.query(Application).filter(
        (Application.ai_score.is_(None)) | (Application.ai_score == 0)
    ).all()
    print(f"AI 평가가 필요한 지원자 수: {len(unevaluated_applications)}")
    batch_size = 100
    for idx, application in enumerate(unevaluated_applications):
        try:
            # 기존 평가 코드 (예시)
            # ... (job_post, resume, spec_data, resume_data, weight_dict 등 준비)
            # agent_url = ...
            # payload = ...
            # response = requests.post(agent_url, json=payload, timeout=30)
            # result = response.json()
            # application.ai_score = result.get("ai_score", 0.0)
            # application.pass_reason = result.get("pass_reason", "")
            # application.fail_reason = result.get("fail_reason", "")
            # application.status = ApplyStatus.WAITING
            # application.document_status = DocumentStatus.PENDING
            pass  # 실제 평가 코드는 기존 그대로 유지
        except Exception as e:
            print(f"AI 평가 실패: application_id={application.id}, error={str(e)}")
            continue
        # 100명 단위로 커밋
        if (idx + 1) % batch_size == 0:
            db.commit()
            print(f"{idx+1}명까지 커밋 완료")
    db.commit()  # 마지막 남은 것 커밋
    # ... (이하 기존 상위 N명 합격자 선발 등) ... 