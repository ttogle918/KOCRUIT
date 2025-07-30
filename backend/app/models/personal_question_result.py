from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class PersonalQuestionResult(Base):
    __tablename__ = "personal_question_result"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("application.id", ondelete="CASCADE"), nullable=False)
    jobpost_id = Column(Integer, ForeignKey("jobpost.id", ondelete="SET NULL"), nullable=True)
    company_id = Column(Integer, ForeignKey("company.id", ondelete="SET NULL"), nullable=True)
    
    # 개인 질문 결과 데이터 (JSON 형태로 저장)
    questions = Column(JSON)  # 전체 질문 리스트
    question_bundle = Column(JSON)  # 카테고리별 질문 묶음
    job_matching_info = Column(Text)  # 직무 매칭 정보
    
    # 메타데이터
    analysis_version = Column(String(50), default="1.0")  # 분석 버전
    analysis_duration = Column(Float)  # 분석 소요 시간 (초)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 관계 설정
    application = relationship("Application", back_populates="personal_question_results")
    job_post = relationship("JobPost", back_populates="personal_question_results")
    company = relationship("Company", back_populates="personal_question_results") 