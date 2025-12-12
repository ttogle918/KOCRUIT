from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class StatisticsAnalysis(Base):
    __tablename__ = "statistics_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    job_post_id = Column(Integer, ForeignKey("jobpost.id"), nullable=False)
    chart_type = Column(String(50), nullable=False)  # 'trend', 'age', 'gender', 'education', 'province', 'certificate'
    chart_data = Column(JSON, nullable=False)  # 원본 차트 데이터
    analysis = Column(Text, nullable=False)  # AI 분석 결과 텍스트
    insights = Column(JSON, nullable=True)  # 인사이트 리스트
    recommendations = Column(JSON, nullable=True)  # 권장사항 리스트
    is_llm_used = Column(Boolean, default=False)  # LLM 사용 여부
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 관계 설정
    job_post = relationship("JobPost", back_populates="statistics_analyses")
    
    def __repr__(self):
        return f"<StatisticsAnalysis(id={self.id}, job_post_id={self.job_post_id}, chart_type='{self.chart_type}')>" 