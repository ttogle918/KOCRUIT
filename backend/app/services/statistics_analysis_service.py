from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional, Dict, Any
from app.models.statistics_analysis import StatisticsAnalysis
from app.schemas.statistics_analysis import StatisticsAnalysisCreate, StatisticsAnalysisUpdate
from datetime import datetime

class StatisticsAnalysisService:
    
    @staticmethod
    def create_analysis(db: Session, analysis_data: StatisticsAnalysisCreate) -> StatisticsAnalysis:
        """통계 분석 결과 생성"""
        db_analysis = StatisticsAnalysis(
            job_post_id=analysis_data.job_post_id,
            chart_type=analysis_data.chart_type,
            chart_data=analysis_data.chart_data,
            analysis=analysis_data.analysis,
            insights=analysis_data.insights,
            recommendations=analysis_data.recommendations,
            is_llm_used=analysis_data.is_llm_used
        )
        db.add(db_analysis)
        db.commit()
        db.refresh(db_analysis)
        return db_analysis
    
    @staticmethod
    def get_analysis_by_id(db: Session, analysis_id: int) -> Optional[StatisticsAnalysis]:
        """ID로 분석 결과 조회"""
        return db.query(StatisticsAnalysis).filter(StatisticsAnalysis.id == analysis_id).first()
    
    @staticmethod
    def get_analysis_by_job_post_and_type(
        db: Session, 
        job_post_id: int, 
        chart_type: str
    ) -> Optional[StatisticsAnalysis]:
        """채용공고 ID와 차트 타입으로 최신 분석 결과 조회"""
        return db.query(StatisticsAnalysis).filter(
            and_(
                StatisticsAnalysis.job_post_id == job_post_id,
                StatisticsAnalysis.chart_type == chart_type
            )
        ).order_by(desc(StatisticsAnalysis.created_at)).first()
    
    @staticmethod
    def get_analyses_by_job_post(
        db: Session, 
        job_post_id: int, 
        limit: int = 100
    ) -> List[StatisticsAnalysis]:
        """채용공고 ID로 모든 분석 결과 조회"""
        return db.query(StatisticsAnalysis).filter(
            StatisticsAnalysis.job_post_id == job_post_id
        ).order_by(desc(StatisticsAnalysis.created_at)).limit(limit).all()
    
    @staticmethod
    def update_analysis(
        db: Session, 
        analysis_id: int, 
        update_data: StatisticsAnalysisUpdate
    ) -> Optional[StatisticsAnalysis]:
        """분석 결과 업데이트"""
        db_analysis = db.query(StatisticsAnalysis).filter(
            StatisticsAnalysis.id == analysis_id
        ).first()
        
        if not db_analysis:
            return None
        
        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(db_analysis, field, value)
        
        db_analysis.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_analysis)
        return db_analysis
    
    @staticmethod
    def delete_analysis(db: Session, analysis_id: int) -> bool:
        """분석 결과 삭제"""
        db_analysis = db.query(StatisticsAnalysis).filter(
            StatisticsAnalysis.id == analysis_id
        ).first()
        
        if not db_analysis:
            return False
        
        db.delete(db_analysis)
        db.commit()
        return True
    
    @staticmethod
    def get_or_create_analysis(
        db: Session, 
        job_post_id: int, 
        chart_type: str,
        analysis_data: StatisticsAnalysisCreate
    ) -> StatisticsAnalysis:
        """분석 결과가 있으면 조회, 없으면 생성"""
        existing_analysis = StatisticsAnalysisService.get_analysis_by_job_post_and_type(
            db, job_post_id, chart_type
        )
        
        if existing_analysis:
            return existing_analysis
        
        return StatisticsAnalysisService.create_analysis(db, analysis_data) 