from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class EvaluationCriteria(Base):
    """공고 기반 평가항목 모델"""
    __tablename__ = "evaluation_criteria"
    
    id = Column(Integer, primary_key=True, index=True)
    job_post_id = Column(Integer, ForeignKey("jobpost.id"), nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    
    # 평가항목 정보
    suggested_criteria = Column(JSON, nullable=False)  # [{"criterion": "기술력", "description": "설명", "max_score": 10}]
    weight_recommendations = Column(JSON, nullable=False)  # [{"criterion": "기술력", "weight": 0.4, "reason": "이유"}]
    evaluation_questions = Column(JSON, nullable=False)  # ["질문1", "질문2", ...]
    scoring_guidelines = Column(JSON, nullable=False)  # {"기술력": {"5점": "설명", "3점": "설명", "1점": "설명"}}
    
    # 메타데이터
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 관계 설정
    job_post = relationship("JobPost", back_populates="evaluation_criteria")
    
    def __repr__(self):
        return f"<EvaluationCriteria(id={self.id}, job_post_id={self.job_post_id})>" 