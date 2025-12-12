from sqlalchemy.orm import Session
from app.models.application import ApplicationStage, StageName, StageStatus

def update_stage_status(
    db: Session, 
    application_id: int, 
    stage_name: StageName, 
    status: StageStatus, 
    score: float = None, 
    reason: str = None
):
    """
    지원자의 특정 전형 단계(Stage) 상태를 업데이트하거나 생성합니다.
    (1안 리팩토링 대응)
    """
    stage = db.query(ApplicationStage).filter(
        ApplicationStage.application_id == application_id,
        ApplicationStage.stage_name == stage_name
    ).first()
    
    if stage:
        if status: stage.status = status
        if score is not None: stage.score = score
        if reason:
            if status == StageStatus.PASSED:
                stage.pass_reason = reason
            elif status == StageStatus.FAILED:
                stage.fail_reason = reason
    else:
        # 없으면 생성 (Create)
        order_map = {
            StageName.DOCUMENT: 1,
            StageName.WRITTEN_TEST: 2,
            StageName.AI_INTERVIEW: 3,
            StageName.PRACTICAL_INTERVIEW: 4,
            StageName.EXECUTIVE_INTERVIEW: 5,
            StageName.FINAL_RESULT: 6
        }
        new_stage = ApplicationStage(
            application_id=application_id,
            stage_name=stage_name,
            stage_order=order_map.get(stage_name, 99),
            status=status or StageStatus.PENDING,
            score=score,
            pass_reason=reason if status == StageStatus.PASSED else None,
            fail_reason=reason if status == StageStatus.FAILED else None
        )
        db.add(new_stage)

