from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, JSON, String, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class QuestionType(enum.Enum):
    COMMON = "common"  # 공통질문 (회사/공고 기반)
    PERSONAL = "personal"  # 개별질문 (이력서 기반)
    COMPANY = "company"  # 회사 관련 질문
    JOB = "job"  # 직무 관련 질문
    EXECUTIVE = "executive"  # 임원면접 질문
    SECOND = "second"  # 2차 면접 질문
    FINAL = "final"  # 최종 면접 질문
    AI_INTERVIEW = "ai_interview"  # AI 면접 질문

class InterviewQuestion(Base):
    __tablename__ = 'interview_question'
    id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey('application.id'), nullable=False)
    type = Column(Enum(QuestionType), nullable=False)  # 질문 유형
    question_text = Column(Text, nullable=False)  # 질문 내용
    category = Column(String(50), nullable=True)  # 질문 카테고리 (ai_interview, practical_interview, 인성, 기술, 경험 등)
    difficulty = Column(String(20), nullable=True)  # 난이도 (easy, medium, hard)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class LangGraphGeneratedData(Base):
    """LangGraph로 생성된 면접 도구 데이터를 저장하는 모델"""
    __tablename__ = 'langgraph_generated_data'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    resume_id = Column(Integer, ForeignKey('resume.id'), nullable=False)
    application_id = Column(Integer, ForeignKey('application.id'), nullable=True)
    job_post_id = Column(Integer, ForeignKey('jobpost.id'), nullable=True)
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