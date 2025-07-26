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
        "certifications_count_mean": stats.get("certifications_count_mean", 0),
        "total_experience_years_mean": stats.get("total_experience_years_mean", 0)
    }
    # 3. 지원자-고성과자 비교/스코어링
    high_performer_members = pattern_result["cluster_patterns"][0]["members"]
    scoring_service = ApplicantGrowthScoringService(high_performer_stats, high_performer_members)
    result = scoring_service.score_applicant(specs_dict)

    # 3.5. boxplot_data 생성
    import numpy as np
    # 고성과자 집단 데이터 추출
    cluster_members = pattern_result["cluster_patterns"][0]["members"]
    # 각 항목별 값 리스트
    def get_values(field, default=0.0):
        vals = [m.get(field) for m in cluster_members if m.get(field) is not None]
        return [float(v) for v in vals if v is not None]
    # 학력(숫자화)
    EDU_MAP = {'BACHELOR': 2, 'MASTER': 3, 'PHD': 4}
    degree_vals = [EDU_MAP.get(m.get('education_level'), 0) for m in cluster_members if m.get('education_level')]
    # 자격증 개수
    import json
    cert_vals = []
    for m in cluster_members:
        certs = m.get('certifications')
        if certs:
            try:
                cert_list = json.loads(certs) if isinstance(certs, str) else certs
                cert_vals.append(len(cert_list))
            except Exception:
                pass
    # 경력(년)
    exp_vals = get_values('total_experience_years')
    print('고성과자 경력(년) 값:', exp_vals)
    # 지원자 값 추출
    norm = scoring_service.normalize_applicant_specs(specs_dict)
    # 지원자 경력(년) 추출 (specs에서 직접 추출 필요)
    applicant_exp = None
    for spec in specs_dict:
        if spec.get('spec_type') == 'experience' and spec.get('spec_title') == 'years':
            try:
                applicant_exp = float(spec.get('spec_description'))
            except:
                applicant_exp = None
    boxplot_data = {}
    # 경력(년)
    if exp_vals:
        boxplot_data['경력(년)'] = {
            'min': float(np.min(exp_vals)),
            'q1': float(np.percentile(exp_vals, 25)),
            'median': float(np.median(exp_vals)),
            'q3': float(np.percentile(exp_vals, 75)),
            'max': float(np.max(exp_vals)),
            'applicant': applicant_exp if applicant_exp is not None else 0.0
        }
    # 학력
    if degree_vals:
        boxplot_data['학력'] = {
            'min': float(np.min(degree_vals)),
            'q1': float(np.percentile(degree_vals, 25)),
            'median': float(np.median(degree_vals)),
            'q3': float(np.percentile(degree_vals, 75)),
            'max': float(np.max(degree_vals)),
            'applicant': norm.get('degree', 0.0)
        }
    # 자격증
    if cert_vals:
        boxplot_data['자격증'] = {
            'min': float(np.min(cert_vals)),
            'q1': float(np.percentile(cert_vals, 25)),
            'median': float(np.median(cert_vals)),
            'q3': float(np.percentile(cert_vals, 75)),
            'max': float(np.max(cert_vals)),
            'applicant': norm.get('certifications_count', 0.0)
        }

    # 4. 응답
    return GrowthPredictionResponse(
        total_score=result["total_score"],
        detail=result["detail"],
        message="성장 가능성 예측 완료",
        comparison_chart_data=result.get("comparison_chart_data"),
        reasons=result.get("reasons"),
        boxplot_data=boxplot_data,
        detail_explanation=result.get("detail_explanation"),
        item_table=result.get("item_table"),
        narrative=result.get("narrative")
    ) 