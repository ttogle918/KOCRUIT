from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, JSON, String, Enum, Boolean
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class QuestionType(enum.Enum):
    COMMON = "COMMON"  # 공통질문 (회사/공고 기반)
    PERSONAL = "PERSONAL"  # 개별질문 (이력서 기반)
    COMPANY = "COMPANY"  # 회사 관련 질문
    JOB = "JOB"  # 직무 관련 질문
    EXECUTIVE = "EXECUTIVE"  # 임원면접 질문
    SECOND = "SECOND"  # 2차 면접 질문
    FINAL = "FINAL"  # 최종 면접 질문
    AI_INTERVIEW = "AI_INTERVIEW"  # AI 면접 질문

class InterviewQuestion(Base):
    __tablename__ = 'interview_question'
    id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey('application.id'), nullable=True)  # 개별 질문용
    job_post_id = Column(Integer, ForeignKey('jobpost.id'), nullable=True)  # 직무별 질문용
    company_id = Column(Integer, ForeignKey('company.id'), nullable=True)  # 공통 질문용
    type = Column("type", Enum(QuestionType, native_enum=False), nullable=False)  # 질문 유형 (DB 컬럼명과 일치)
    question_text = Column(Text, nullable=False)  # 질문 내용
    category = Column(String(50), nullable=True)  # 질문 카테고리 (common, personal, company, job, game_test 등)
    difficulty = Column(String(20), nullable=True)  # 난이도 (easy, medium, hard)
    question_order = Column(Integer, default=0, nullable=True) # 질문 순서
    is_selected = Column(Boolean, default=False, nullable=False) # 확정된 질문 여부
    is_active = Column(Boolean, default=True, nullable=False)  # 질문 활성화 상태 (삭제 여부)
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