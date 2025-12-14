from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class HighlightResult(Base):
    __tablename__ = "highlight_result"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey('application.id'), nullable=False)
    jobpost_id = Column(Integer, ForeignKey('jobpost.id'))
    company_id = Column(Integer, ForeignKey('company.id'))
    
    # 하이라이팅 결과 데이터 (JSON 형태로 저장)
    yellow_highlights = Column(JSON)  # 노란색 하이라이트 (value_fit)
    red_highlights = Column(JSON)     # 빨간색 하이라이트 (mismatch)
    orange_highlights = Column(JSON)  # 오렌지색 하이라이트 (negative_tone)
    purple_highlights = Column(JSON)  # 보라색 하이라이트 (experience)
    blue_highlights = Column(JSON)    # 파란색 하이라이트 (skill_fit)
    all_highlights = Column(JSON)     # 전체 하이라이트 (우선순위 정렬됨)
    
    # 메타데이터
    analysis_version = Column(String(50), default="1.0")  # 분석 버전
    analysis_duration = Column(Float)  # 분석 소요 시간 (초)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    application = relationship("Application", back_populates="highlight_results")
    job_post = relationship("JobPost", back_populates="highlight_results")
    company = relationship("Company", back_populates="highlight_results")
    
    def __repr__(self):
        return f"<HighlightResult(id={self.id}, application_id={self.application_id})>" 