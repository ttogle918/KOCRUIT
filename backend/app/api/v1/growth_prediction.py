from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.models.application import Application
from app.models.resume import Resume, Spec
from app.models.growth_prediction_result import GrowthPredictionResult
from app.services.high_performer_pattern_service import HighPerformerPatternService
from app.services.applicant_growth_scoring_service import ApplicantGrowthScoringService
from app.schemas.growth_prediction import GrowthPredictionRequest, GrowthPredictionResponse
import time

router = APIRouter()

@router.post("/create-table")
def create_growth_prediction_table(db: Session = Depends(get_db)):
    """성장가능성 예측 결과 테이블을 생성합니다."""
    try:
        # 테이블 생성 SQL
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS growth_prediction_result (
            id INT AUTO_INCREMENT PRIMARY KEY,
            application_id INT NOT NULL,
            jobpost_id INT,
            company_id INT,
            
            -- 성장가능성 예측 결과 데이터 (JSON 형태로 저장)
            total_score FLOAT NOT NULL,  -- 총점
            detail JSON,  -- 항목별 상세 점수
            comparison_chart_data JSON,  -- 비교 차트 데이터
            reasons JSON,  -- 예측 근거
            boxplot_data JSON,  -- 박스플롯 데이터
            detail_explanation JSON,  -- 항목별 상세 설명
            item_table JSON,  -- 표 데이터
            narrative TEXT,  -- 자동 요약 설명
            
            -- 메타데이터
            analysis_version VARCHAR(50) DEFAULT '1.0',  -- 분석 버전
            analysis_duration FLOAT,  -- 분석 소요 시간 (초)
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            -- 외래키 제약조건
            FOREIGN KEY (application_id) REFERENCES application(id) ON DELETE CASCADE,
            FOREIGN KEY (jobpost_id) REFERENCES jobpost(id) ON DELETE SET NULL,
            FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE SET NULL,
            
            -- 인덱스 생성 (조회 성능 향상)
            INDEX idx_growth_prediction_application_id (application_id),
            INDEX idx_growth_prediction_jobpost_id (jobpost_id),
            INDEX idx_growth_prediction_company_id (company_id),
            INDEX idx_growth_prediction_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        
        db.execute(text(create_table_sql))
        db.commit()
        
        return {"message": "성장가능성 예측 결과 테이블이 성공적으로 생성되었습니다."}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"테이블 생성 실패: {str(e)}")

@router.post("/predict", response_model=GrowthPredictionResponse)
def predict_growth(
    req: GrowthPredictionRequest,
    db: Session = Depends(get_db)
):
    start_time = time.time()
    
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
    if exp_vals and len(exp_vals) > 0:
        exp_vals = [float(v) for v in exp_vals if v is not None and not np.isnan(v)]
        if exp_vals:
            boxplot_data['경력(년)'] = {
                'min': float(np.min(exp_vals)),
                'q1': float(np.percentile(exp_vals, 25)),
                'median': float(np.median(exp_vals)),
                'q3': float(np.percentile(exp_vals, 75)),
                'max': float(np.max(exp_vals)),
                'applicant': applicant_exp if applicant_exp is not None and not np.isnan(applicant_exp) else 0.0
            }
    # 학력
    if degree_vals and len(degree_vals) > 0:
        degree_vals = [float(v) for v in degree_vals if v is not None and not np.isnan(v)]
        if degree_vals:
            boxplot_data['학력'] = {
                'min': float(np.min(degree_vals)),
                'q1': float(np.percentile(degree_vals, 25)),
                'median': float(np.median(degree_vals)),
                'q3': float(np.percentile(degree_vals, 75)),
                'max': float(np.max(degree_vals)),
                'applicant': norm.get('degree', 0.0) if norm.get('degree') is not None and not np.isnan(norm.get('degree', 0.0)) else 0.0
            }
    # 자격증
    if cert_vals and len(cert_vals) > 0:
        cert_vals = [float(v) for v in cert_vals if v is not None and not np.isnan(v)]
        if cert_vals:
            boxplot_data['자격증'] = {
                'min': float(np.min(cert_vals)),
                'q1': float(np.percentile(cert_vals, 25)),
                'median': float(np.median(cert_vals)),
                'q3': float(np.percentile(cert_vals, 75)),
                'max': float(np.max(cert_vals)),
                'applicant': norm.get('certifications_count', 0.0) if norm.get('certifications_count') is not None and not np.isnan(norm.get('certifications_count', 0.0)) else 0.0
            }

    analysis_duration = time.time() - start_time

    # 4. DB에 결과 저장
    try:
        print(f"💾 DB 저장 시작: application_id={req.application_id}")
        
        # 기존 결과가 있으면 업데이트, 없으면 새로 생성
        existing_result = db.query(GrowthPredictionResult).filter(
            GrowthPredictionResult.application_id == req.application_id
        ).first()
        
        print(f"🔍 기존 결과 조회: {'있음' if existing_result else '없음'}")
        
        if existing_result:
            # 기존 결과 업데이트
            print(f"🔄 기존 결과 업데이트 시작: ID {existing_result.id}")
            existing_result.total_score = result["total_score"]
            existing_result.detail = result["detail"]
            existing_result.comparison_chart_data = result.get("comparison_chart_data")
            existing_result.reasons = result.get("reasons")
            existing_result.boxplot_data = boxplot_data
            existing_result.detail_explanation = result.get("detail_explanation")
            existing_result.item_table = result.get("item_table")
            existing_result.narrative = result.get("narrative")
            existing_result.analysis_duration = analysis_duration
            existing_result.updated_at = time.time()
            growth_result = existing_result
            print(f"🔄 기존 성장가능성 예측 결과 업데이트: ID {existing_result.id}")
        else:
            # 새로운 결과 생성
            print(f"🆕 새로운 결과 생성 시작")
            growth_result = GrowthPredictionResult(
                application_id=req.application_id,
                jobpost_id=application.job_post_id,
                company_id=application.job_post.company_id if application.job_post else None,
                total_score=result["total_score"],
                detail=result["detail"],
                comparison_chart_data=result.get("comparison_chart_data"),
                reasons=result.get("reasons"),
                boxplot_data=boxplot_data,
                detail_explanation=result.get("detail_explanation"),
                item_table=result.get("item_table"),
                narrative=result.get("narrative"),
                analysis_duration=analysis_duration
            )
            print(f"🆕 GrowthPredictionResult 객체 생성 완료")
            db.add(growth_result)
            print(f"💾 새로운 성장가능성 예측 결과 저장")
        
        print(f"💾 DB commit 시작")
        db.commit()
        print(f"✅ 성장가능성 예측 결과 DB 저장 완료: ID {growth_result.id}")
        
    except Exception as db_error:
        print(f"⚠️ DB 저장 실패 (분석 결과는 반환): {db_error}")
        print(f"⚠️ DB 저장 실패 상세: {type(db_error).__name__}: {str(db_error)}")
        import traceback
        print(f"⚠️ DB 저장 실패 스택트레이스: {traceback.format_exc()}")
        db.rollback()
        # DB 저장 실패해도 분석 결과는 반환

    # 5. 응답
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

@router.get("/results/{application_id}")
def get_growth_prediction_results(
    application_id: int,
    db: Session = Depends(get_db)
):
    """저장된 성장가능성 예측 결과를 조회합니다."""
    try:
        print(f"🔍 성장가능성 예측 결과 조회: application_id={application_id}")
        
        # 지원서 정보 확인
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            print(f"❌ Application not found: {application_id}")
            raise HTTPException(status_code=404, detail="Application not found")
        
        # 저장된 성장가능성 예측 결과 조회
        growth_result = db.query(GrowthPredictionResult).filter(
            GrowthPredictionResult.application_id == application_id
        ).first()
        
        if not growth_result:
            print(f"❌ Growth prediction result not found: {application_id}")
            raise HTTPException(status_code=404, detail="성장가능성 예측 결과를 찾을 수 없습니다. 먼저 예측을 실행해주세요.")
        
        print(f"✅ 성장가능성 예측 결과 조회 완료: ID {growth_result.id}")
        
        # 응답 데이터 구성
        return {
            "application_id": growth_result.application_id,
            "jobpost_id": growth_result.jobpost_id,
            "company_id": growth_result.company_id,
            "total_score": growth_result.total_score,
            "detail": growth_result.detail,
            "comparison_chart_data": growth_result.comparison_chart_data,
            "reasons": growth_result.reasons,
            "boxplot_data": growth_result.boxplot_data,
            "detail_explanation": growth_result.detail_explanation,
            "item_table": growth_result.item_table,
            "narrative": growth_result.narrative,
            "analysis_version": growth_result.analysis_version,
            "analysis_duration": growth_result.analysis_duration,
            "created_at": growth_result.created_at,
            "updated_at": growth_result.updated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 성장가능성 예측 결과 조회 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"결과 조회 중 오류가 발생했습니다: {str(e)}")

@router.delete("/results/{application_id}")
def delete_growth_prediction_results(
    application_id: int,
    db: Session = Depends(get_db)
):
    """저장된 성장가능성 예측 결과를 삭제합니다."""
    try:
        print(f"🗑️ 성장가능성 예측 결과 삭제: application_id={application_id}")
        
        # 저장된 결과 조회
        growth_result = db.query(GrowthPredictionResult).filter(
            GrowthPredictionResult.application_id == application_id
        ).first()
        
        if not growth_result:
            print(f"❌ Growth prediction result not found: {application_id}")
            raise HTTPException(status_code=404, detail="삭제할 성장가능성 예측 결과를 찾을 수 없습니다.")
        
        # 결과 삭제
        db.delete(growth_result)
        db.commit()
        
        print(f"✅ 성장가능성 예측 결과 삭제 완료: ID {growth_result.id}")
        
        return {"message": "성장가능성 예측 결과가 성공적으로 삭제되었습니다."}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 성장가능성 예측 결과 삭제 오류: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"결과 삭제 중 오류가 발생했습니다: {str(e)}") 