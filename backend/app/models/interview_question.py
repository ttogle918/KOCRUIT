from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, JSON, String
from sqlalchemy.sql import func
from app.core.database import Base

class InterviewQuestion(Base):
    __tablename__ = 'interview_question'
    id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey('application.id'), nullable=False)
    type = Column(Text)
    question_text = Column(Text)

class LangGraphGeneratedData(Base):
    """LangGraph로 생성된 면접 도구 데이터를 저장하는 모델"""
    __tablename__ = 'langgraph_generated_data'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    resume_id = Column(Integer, ForeignKey('resume.id'), nullable=False)
    application_id = Column(Integer, ForeignKey('application.id'), nullable=True)
    job_post_id = Column(Integer, ForeignKey('job_post.id'), nullable=True)
    company_name = Column(String(255), nullable=False)
    applicant_name = Column(String(255), nullable=False)
    
    # 생성된 데이터 타입
    data_type = Column(String(50), nullable=False)  # 'questions', 'checklist', 'strengths', 'guideline', 'criteria'
    
    # 면접 단계
    interview_stage = Column(String(20), nullable=True)  # 'first', 'second'
    evaluator_type = Column(String(20), nullable=True)  # 'PRACTICAL', 'EXECUTIVE'
    
    # 생성된 데이터 (JSON 형태로 저장)
    generated_data = Column(JSON, nullable=False)
    
    # 생성 시간
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 캐시 키 (중복 생성 방지용)
    cache_key = Column(String(255), nullable=False, unique=True) 