from app.core.database import get_db
from app.models.application import Application
from app.models.interview_evaluation import InterviewEvaluation, EvaluationType
from sqlalchemy import func

def update_application_scores():
    db = next(get_db())
    applications = db.query(Application).all()
    # 실무진/임원진 평가자 id 리스트
    practical_evaluators = [3004, 3043, 3108, 3109, 3110, 3111]
    executive_evaluators = [3004, 3043, 3108, 3109, 3110, 3111]

    for app in applications:
        # 실무진 평균 (특정 직원만)
        practical_avg = db.query(func.avg(InterviewEvaluation.total_score)).filter(
            InterviewEvaluation.interview_id == app.id,
            InterviewEvaluation.evaluation_type == EvaluationType.PRACTICAL,
            InterviewEvaluation.evaluator_id.in_(practical_evaluators)
        ).scalar()
        if practical_avg is not None:
            app.practical_score = practical_avg
            print(f"[실무진] app.id={app.id} practical_score={practical_avg}")
        else:
            print(f"[실무진] app.id={app.id} 평가 없음")
        # 임원진 평균 (특정 직원만)
        executive_avg = db.query(func.avg(InterviewEvaluation.total_score)).filter(
            InterviewEvaluation.interview_id == app.id,
            InterviewEvaluation.evaluation_type == EvaluationType.EXECUTIVE,
            InterviewEvaluation.evaluator_id.in_(executive_evaluators)
        ).scalar()
        if executive_avg is not None:
            app.executive_score = executive_avg
            print(f"[임원진] app.id={app.id} executive_score={executive_avg}")
        else:
            print(f"[임원진] app.id={app.id} 평가 없음")
    db.commit()
    print("모든 application의 실무진/임원진 점수 업데이트 완료")

if __name__ == "__main__":
    update_application_scores() 