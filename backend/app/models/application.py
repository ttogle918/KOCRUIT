from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import enum
from sqlalchemy import Enum as SqlEnum


class ApplyStatus(str, enum.Enum):
    WAITING = "WAITING"           # 대기 중
    IN_PROGRESS = "IN_PROGRESS"   # 진행 중 (서류 합격 후)
    PASSED = "PASSED"            # 최종 합격
    REJECTED = "REJECTED"        # 최종 불합격
    WITHDRAWN = "WITHDRAWN"      # 지원 철회


class ApplicationViewAction(str, enum.Enum):
    VIEW = "VIEW"
    DOWNLOAD = "DOWNLOAD"


class DocumentStatus(str, enum.Enum):
    PENDING = "PENDING"          # 서류 심사 대기
    REVIEWING = "REVIEWING"      # 서류 심사 중
    PASSED = "PASSED"           # 서류 합격
    REJECTED = "REJECTED"       # 서류 불합격


class InterviewStatus(str, enum.Enum):
    # AI 면접
    AI_INTERVIEW_PENDING = "AI_INTERVIEW_PENDING"                 # AI 면접 대기
    AI_INTERVIEW_SCHEDULED = "AI_INTERVIEW_SCHEDULED"             # AI 면접 일정 확정
    AI_INTERVIEW_IN_PROGRESS = "AI_INTERVIEW_IN_PROGRESS"         # AI 면접 진행 중
    AI_INTERVIEW_COMPLETED = "AI_INTERVIEW_COMPLETED"             # AI 면접 완료
    AI_INTERVIEW_PASSED = "AI_INTERVIEW_PASSED"                   # AI 면접 합격
    AI_INTERVIEW_FAILED = "AI_INTERVIEW_FAILED"                   # AI 면접 불합격
    
    # 실무진 면접 (1차)
    FIRST_INTERVIEW_SCHEDULED = "FIRST_INTERVIEW_SCHEDULED"       # 실무진 면접 일정 확정
    FIRST_INTERVIEW_IN_PROGRESS = "FIRST_INTERVIEW_IN_PROGRESS"   # 실무진 면접 진행 중
    FIRST_INTERVIEW_COMPLETED = "FIRST_INTERVIEW_COMPLETED"       # 실무진 면접 완료
    FIRST_INTERVIEW_PASSED = "FIRST_INTERVIEW_PASSED"             # 실무진 면접 합격
    FIRST_INTERVIEW_FAILED = "FIRST_INTERVIEW_FAILED"             # 실무진 면접 불합격
    
    # 임원 면접 (2차)
    SECOND_INTERVIEW_SCHEDULED = "SECOND_INTERVIEW_SCHEDULED"     # 임원 면접 일정 확정
    SECOND_INTERVIEW_IN_PROGRESS = "SECOND_INTERVIEW_IN_PROGRESS" # 임원 면접 진행 중
    SECOND_INTERVIEW_COMPLETED = "SECOND_INTERVIEW_COMPLETED"     # 임원 면접 완료
    SECOND_INTERVIEW_PASSED = "SECOND_INTERVIEW_PASSED"           # 임원 면접 합격
    SECOND_INTERVIEW_FAILED = "SECOND_INTERVIEW_FAILED"           # 임원 면접 불합격
    
    # 최종 면접 (3차)
    FINAL_INTERVIEW_SCHEDULED = "FINAL_INTERVIEW_SCHEDULED"       # 최종 면접 일정 확정
    FINAL_INTERVIEW_IN_PROGRESS = "FINAL_INTERVIEW_IN_PROGRESS"   # 최종 면접 진행 중
    FINAL_INTERVIEW_COMPLETED = "FINAL_INTERVIEW_COMPLETED"       # 최종 면접 완료
    FINAL_INTERVIEW_PASSED = "FINAL_INTERVIEW_PASSED"             # 최종 면접 합격
    FINAL_INTERVIEW_FAILED = "FINAL_INTERVIEW_FAILED"             # 최종 면접 불합격
    
    # 기타
    CANCELLED = "CANCELLED"                                       # 면접 취소


class InterviewStage(str, enum.Enum):
    AI_INTERVIEW = "AI_INTERVIEW"       # AI 면접
    FIRST_INTERVIEW = "FIRST_INTERVIEW" # 1차 면접 (실무진)
    SECOND_INTERVIEW = "SECOND_INTERVIEW" # 2차 면접 (임원)
    FINAL_INTERVIEW = "FINAL_INTERVIEW" # 최종 면접


class WrittenTestStatus(enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    PASSED = "PASSED"
    FAILED = "FAILED"


class FinalStatus(str, enum.Enum):
    PENDING = "PENDING"          # 최종 선발 대기
    SELECTED = "SELECTED"        # 최종 선발됨
    NOT_SELECTED = "NOT_SELECTED" # 최종 선발되지 않음


class Application(Base):
    __tablename__ = "application"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    resume_id = Column(Integer, ForeignKey('resume.id'))
    job_post_id = Column(Integer, ForeignKey('jobpost.id'), nullable=False)
    score = Column(Numeric(10, 2))
    ai_score = Column(Numeric(5, 2))
    human_score = Column(Numeric(5, 2))
    final_score = Column(Numeric(5, 2))
    written_test_score = Column(Numeric(5, 2))
    status = Column(SqlEnum(ApplyStatus), default=ApplyStatus.WAITING, nullable=False)
    document_status = Column(SqlEnum(DocumentStatus), default=DocumentStatus.PENDING, nullable=False)
    interview_status = Column(SqlEnum(InterviewStatus), default=InterviewStatus.AI_INTERVIEW_PENDING, nullable=False)
    written_test_status = Column(SqlEnum(WrittenTestStatus), default=WrittenTestStatus.PENDING, nullable=False)
    applied_at = Column(DateTime, default=datetime.utcnow)
    application_source = Column(String(255))
    pass_reason = Column(Text)
    fail_reason = Column(Text)
    ai_interview_score = Column(Numeric(5, 2))  # AI 면접 전용 점수
    final_status = Column(SqlEnum(FinalStatus), default=FinalStatus.PENDING, nullable=False)  # 최종 선발 상태
    
    # Relationships with back_populates
    user = relationship("User", back_populates="applications")
    job_post = relationship("JobPost", back_populates="applications")
    resume = relationship("Resume", back_populates="applications")
    field_scores = relationship("FieldNameScore", back_populates="application")
    memos = relationship("ResumeMemo", back_populates="application")
    highlight_results = relationship("HighlightResult", back_populates="application")
    analysis_results = relationship("AnalysisResult", back_populates="application")


class FieldNameScore(Base):
    __tablename__ = "field_name_score"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey('application.id'), nullable=False)
    field_name = Column(String(255), nullable=False)
    score = Column(Numeric(10, 2))
    
    # Relationships
    application = relationship("Application", back_populates="field_scores") 