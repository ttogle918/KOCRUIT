from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class GrowthPredictionResult(Base):
    __tablename__ = "growth_prediction_result"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey('application.id'), nullable=False)
    jobpost_id = Column(Integer, ForeignKey('jobpost.id'))
    company_id = Column(Integer, ForeignKey('company.id'))
    
    # 성장가능성 예측 결과 데이터 (JSON 형태로 저장)
    total_score = Column(Float, nullable=False)  # 총점
    detail = Column(JSON)  # 항목별 상세 점수
    comparison_chart_data = Column(JSON)  # 비교 차트 데이터
    reasons = Column(JSON)  # 예측 근거
    boxplot_data = Column(JSON)  # 박스플롯 데이터
    detail_explanation = Column(JSON)  # 항목별 상세 설명
    item_table = Column(JSON)  # 표 데이터
    narrative = Column(Text)  # 자동 요약 설명
    
    # 메타데이터
    analysis_version = Column(String(50), default="1.0")  # 분석 버전
    analysis_duration = Column(Float)  # 분석 소요 시간 (초)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    application = relationship("Application", back_populates="growth_prediction_results")
    job_post = relationship("JobPost", back_populates="growth_prediction_results")
    company = relationship("Company", back_populates="growth_prediction_results")
    
    def __repr__(self):
        return f"<GrowthPredictionResult(id={self.id}, application_id={self.application_id}, total_score={self.total_score})>" 