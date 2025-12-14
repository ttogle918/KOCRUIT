from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class EvaluationType(enum.Enum):
    JOB_BASED = "job_based"      # 공고 기반
    RESUME_BASED = "resume_based"  # 이력서 기반

class EvaluationCriteria(Base):
    """평가항목 모델"""
    __tablename__ = "evaluation_criteria"
    
    id = Column(Integer, primary_key=True, index=True)
    job_post_id = Column(Integer, ForeignKey("jobpost.id"), nullable=True, index=True)  # 공고 기반일 때만
    resume_id = Column(Integer, ForeignKey("resume.id"), nullable=True, index=True)      # 이력서 기반일 때만
    application_id = Column(Integer, ForeignKey("application.id"), nullable=True, index=True)  # 지원서 ID (선택)
    evaluation_type = Column(String(20), nullable=False, default='job_based')  # 평가 기준 타입
    interview_stage = Column(String(20), nullable=True)  # "practical" 또는 "executive"
    company_name = Column(String(255), nullable=False)
    
    # 평가항목 정보
    suggested_criteria = Column(JSON, nullable=False)  # [{"criterion": "기술력", "description": "설명", "max_score": 10}]
    weight_recommendations = Column(JSON, nullable=False)  # [{"criterion": "기술력", "weight": 0.4, "reason": "이유"}]
    evaluation_questions = Column(JSON, nullable=False)  # ["질문1", "질문2", ...]
    scoring_guidelines = Column(JSON, nullable=False)  # {"excellent": "9-10점 기준", "good": "7-8점 기준", "average": "5-6점 기준", "poor": "3-4점 기준"}
    
    # 면접관이 실제로 점수를 매길 수 있는 구체적 평가 항목들
    evaluation_items = Column(JSON, nullable=True)  # [{"item_name": "Java/Spring 역량", "description": "설명", "max_score": 10, "scoring_criteria": {...}, "evaluation_questions": [...], "weight": 0.25}]
    
    # 메타데이터
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 관계 설정
    job_post = relationship("JobPost", back_populates="evaluation_criteria")
    resume = relationship("Resume")
    application = relationship("Application")
    
    def __repr__(self):
        return f"<EvaluationCriteria(id={self.id}, type={self.evaluation_type.value}, job_post_id={self.job_post_id}, resume_id={self.resume_id})>" 