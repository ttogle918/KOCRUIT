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
    NOT_SCHEDULED = "NOT_SCHEDULED"     # 면접 미일정
    SCHEDULED = "SCHEDULED"             # 면접 일정 확정
    IN_PROGRESS = "IN_PROGRESS"         # 면접 진행 중
    COMPLETED = "COMPLETED"             # 면접 완료
    CANCELLED = "CANCELLED"             # 면접 취소


class WrittenTestStatus(enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    PASSED = "PASSED"
    FAILED = "FAILED"


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
    interview_status = Column(SqlEnum(InterviewStatus), default=InterviewStatus.NOT_SCHEDULED, nullable=False)
    written_test_status = Column(SqlEnum(WrittenTestStatus), default=WrittenTestStatus.PENDING, nullable=False)
    applied_at = Column(DateTime, default=datetime.utcnow)
    application_source = Column(String(255))
    pass_reason = Column(Text)
    fail_reason = Column(Text)
    
    # Relationships with back_populates
    user = relationship("User", back_populates="applications")
    job_post = relationship("JobPost", back_populates="applications")
    resume = relationship("Resume", back_populates="applications")
    field_scores = relationship("FieldNameScore", back_populates="application")
    memos = relationship("ResumeMemo", back_populates="application")


class FieldNameScore(Base):
    __tablename__ = "field_name_score"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey('application.id'), nullable=False)
    field_name = Column(String(255), nullable=False)
    score = Column(Numeric(10, 2))
    
    # Relationships
    application = relationship("Application", back_populates="field_scores") 