from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import json

class AIInsights(Base):
    __tablename__ = "ai_insights"
    
    id = Column(Integer, primary_key=True, index=True)
    job_post_id = Column(Integer, ForeignKey("jobpost.id"), nullable=False)
    
    # 분석 메타데이터
    analysis_type = Column(String(50), nullable=False)  # 'basic', 'advanced', 'comparison'
    analysis_date = Column(DateTime(timezone=True), server_default=func.now())
    analysis_status = Column(String(20), default="completed")  # 'pending', 'completed', 'failed'
    
    # LangGraph 실행 정보
    langgraph_execution_id = Column(String(100), nullable=True)
    execution_time = Column(Float, nullable=True)  # 실행 시간 (초)
    
    # 분석 결과 (JSON 형태로 저장)
    score_analysis = Column(JSON, nullable=True)
    correlation_analysis = Column(JSON, nullable=True)
    trend_analysis = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)
    predictions = Column(JSON, nullable=True)
    
    # 고급 분석 결과 (LangGraph 기반)
    advanced_insights = Column(JSON, nullable=True)
    pattern_analysis = Column(JSON, nullable=True)
    risk_assessment = Column(JSON, nullable=True)
    optimization_suggestions = Column(JSON, nullable=True)
    
    # 메타데이터
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 관계 설정
    job_post = relationship("JobPost", back_populates="ai_insights")
    
    def to_dict(self):
        """모델을 딕셔너리로 변환"""
        return {
            "id": self.id,
            "job_post_id": self.job_post_id,
            "analysis_type": self.analysis_type,
            "analysis_date": self.analysis_date.isoformat() if self.analysis_date else None,
            "analysis_status": self.analysis_status,
            "langgraph_execution_id": self.langgraph_execution_id,
            "execution_time": self.execution_time,
            "score_analysis": self.score_analysis,
            "correlation_analysis": self.correlation_analysis,
            "trend_analysis": self.trend_analysis,
            "recommendations": self.recommendations,
            "predictions": self.predictions,
            "advanced_insights": self.advanced_insights,
            "pattern_analysis": self.pattern_analysis,
            "risk_assessment": self.risk_assessment,
            "optimization_suggestions": self.optimization_suggestions,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class AIInsightsComparison(Base):
    __tablename__ = "ai_insights_comparisons"
    
    id = Column(Integer, primary_key=True, index=True)
    job_post_id = Column(Integer, ForeignKey("jobpost.id"), nullable=False)
    compared_job_post_id = Column(Integer, ForeignKey("jobpost.id"), nullable=False)
    
    # 비교 분석 결과
    comparison_metrics = Column(JSON, nullable=True)
    similarity_score = Column(Float, nullable=True)
    key_differences = Column(JSON, nullable=True)
    
    # LangGraph 기반 고급 비교
    advanced_comparison = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계 설정
    job_post = relationship("JobPost", foreign_keys=[job_post_id])
    compared_job_post = relationship("JobPost", foreign_keys=[compared_job_post_id]) 