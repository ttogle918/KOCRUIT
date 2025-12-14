from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_result"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey('application.id'), nullable=False)
    resume_id = Column(Integer, ForeignKey('resume.id'), nullable=False)
    jobpost_id = Column(Integer, ForeignKey('jobpost.id'))
    company_id = Column(Integer, ForeignKey('company.id'))
    
    # 분석 타입
    analysis_type = Column(String(50), nullable=False)  # 'comprehensive', 'detailed', 'applicant_comparison', 'impact_points'
    
    # 분석 결과 데이터 (JSON 형태로 저장)
    analysis_data = Column(JSON, nullable=False)
    
    # 메타데이터
    analysis_version = Column(String(50), default="1.0")  # 분석 버전
    analysis_duration = Column(Float)  # 분석 소요 시간 (초)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships (단방향)
    application = relationship("Application")
    resume = relationship("Resume")
    job_post = relationship("JobPost")
    company = relationship("Company")
    
    def __repr__(self):
        return f"<AnalysisResult(id={self.id}, application_id={self.application_id}, analysis_type={self.analysis_type})>" 