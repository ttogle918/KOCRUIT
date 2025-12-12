from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.analysis_result import AnalysisResult
from app.models.application import Application
from app.models.resume import Resume
from app.models.job import JobPost
from app.models.company import Company

router = APIRouter()

class AnalysisResultCreate(BaseModel):
    application_id: int
    resume_id: int
    jobpost_id: Optional[int] = None
    company_id: Optional[int] = None
    analysis_type: str
    analysis_data: Dict[str, Any]
    analysis_version: str = "1.0"
    analysis_duration: Optional[float] = None

class AnalysisResultResponse(BaseModel):
    id: int
    application_id: int
    resume_id: int
    jobpost_id: Optional[int]
    company_id: Optional[int]
    analysis_type: str
    analysis_data: Dict[str, Any]
    analysis_version: str
    analysis_duration: Optional[float]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.post("/", response_model=AnalysisResultResponse)
def create_analysis_result(result: AnalysisResultCreate, db: Session = Depends(get_db)):
    """분석 결과 저장"""
    try:
        # 기존 결과가 있으면 업데이트, 없으면 새로 생성
        existing_result = db.query(AnalysisResult).filter(
            AnalysisResult.application_id == result.application_id,
            AnalysisResult.analysis_type == result.analysis_type
        ).first()
        
        if existing_result:
            # 기존 결과 업데이트
            existing_result.analysis_data = result.analysis_data
            existing_result.analysis_version = result.analysis_version
            existing_result.analysis_duration = result.analysis_duration
            existing_result.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing_result)
            return existing_result
        else:
            # 새 결과 생성
            db_result = AnalysisResult(**result.dict())
            db.add(db_result)
            db.commit()
            db.refresh(db_result)
            return db_result
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"분석 결과 저장 실패: {str(e)}")

@router.get("/application/{application_id}/{analysis_type}", response_model=AnalysisResultResponse)
def get_analysis_result(application_id: int, analysis_type: str, db: Session = Depends(get_db)):
    """특정 지원자의 특정 분석 결과 조회"""
    result = db.query(AnalysisResult).filter(
        AnalysisResult.application_id == application_id,
        AnalysisResult.analysis_type == analysis_type
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="분석 결과를 찾을 수 없습니다")
    
    return result

@router.get("/application/{application_id}", response_model=list[AnalysisResultResponse])
def get_all_analysis_results(application_id: int, db: Session = Depends(get_db)):
    """특정 지원자의 모든 분석 결과 조회"""
    results = db.query(AnalysisResult).filter(
        AnalysisResult.application_id == application_id
    ).all()
    
    return results

@router.delete("/application/{application_id}/{analysis_type}")
def delete_analysis_result(application_id: int, analysis_type: str, db: Session = Depends(get_db)):
    """특정 분석 결과 삭제"""
    result = db.query(AnalysisResult).filter(
        AnalysisResult.application_id == application_id,
        AnalysisResult.analysis_type == analysis_type
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="분석 결과를 찾을 수 없습니다")
    
    db.delete(result)
    db.commit()
    
    return {"message": "분석 결과가 삭제되었습니다"} 