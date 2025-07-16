from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.application import Application
from app.models.resume import Resume, Spec
from app.services.high_performer_pattern_service import HighPerformerPatternService
from app.services.applicant_growth_scoring_service import ApplicantGrowthScoringService
from app.schemas.growth_prediction import GrowthPredictionRequest, GrowthPredictionResponse

router = APIRouter()

@router.post("/predict", response_model=GrowthPredictionResponse)
def predict_growth(
    req: GrowthPredictionRequest,
    db: Session = Depends(get_db)
):
    # 1. 지원서/이력서/스펙 조회
    application = db.query(Application).filter(Application.id == req.application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    resume = db.query(Resume).filter(Resume.id == application.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    specs = db.query(Spec).filter(Spec.resume_id == resume.id).all()
    specs_dict = [
        {
            "spec_type": s.spec_type,
            "spec_title": s.spec_title,
            "spec_description": s.spec_description
        } for s in specs
    ]
    # 2. 고성과자 패턴 통계(평균 등) 조회
    pattern_service = HighPerformerPatternService()
    # kmeans로 1회 분석(클러스터 1개만 사용, 전체 평균)
    pattern_result = pattern_service.analyze_high_performer_patterns(db, clustering_method="kmeans", n_clusters=1, include_llm_summary=False)
    if not pattern_result or not pattern_result.get("cluster_patterns"):
        raise HTTPException(status_code=500, detail="High performer pattern not found")
    stats = pattern_result["cluster_patterns"][0]["statistics"]
    # 평균값 추출(항목별)
    high_performer_stats = {
        "kpi_score_mean": stats.get("kpi_score_mean", 0),
        "promotion_speed_years_mean": stats.get("promotion_speed_years_mean", 0),
        "degree_mean": stats.get("degree_mean", 0),
        "certifications_count_mean": stats.get("certifications_count_mean", 0)
    }
    # 3. 지원자-고성과자 비교/스코어링
    scoring_service = ApplicantGrowthScoringService(high_performer_stats)
    result = scoring_service.score_applicant(specs_dict)
    # 4. 응답
    return GrowthPredictionResponse(
        total_score=result["total_score"],
        detail=result["detail"],
        message="성장 가능성 예측 완료",
        comparison_chart_data=result.get("comparison_chart_data"),
        reasons=result.get("reasons")
    ) 