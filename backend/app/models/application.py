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


class AIInterviewStatus(str, enum.Enum):
    PENDING = "PENDING"                 # AI 면접 대기
    SCHEDULED = "SCHEDULED"             # AI 면접 일정 확정
    IN_PROGRESS = "IN_PROGRESS"         # AI 면접 진행 중
    COMPLETED = "COMPLETED"             # AI 면접 완료
    PASSED = "PASSED"                   # AI 면접 합격
    FAILED = "FAILED"                   # AI 면접 불합격
    CANCELLED = "CANCELLED"             # AI 면접 취소


class FirstInterviewStatus(str, enum.Enum):
    PENDING = "PENDING"                 # 1차 면접 대기
    SCHEDULED = "SCHEDULED"             # 1차 면접 일정 확정
    IN_PROGRESS = "IN_PROGRESS"         # 1차 면접 진행 중
    COMPLETED = "COMPLETED"             # 1차 면접 완료
    PASSED = "PASSED"                   # 1차 면접 합격
    FAILED = "FAILED"                   # 1차 면접 불합격
    CANCELLED = "CANCELLED"             # 1차 면접 취소


class SecondInterviewStatus(str, enum.Enum):
    PENDING = "PENDING"                 # 2차 면접 대기
    SCHEDULED = "SCHEDULED"             # 2차 면접 일정 확정
    IN_PROGRESS = "IN_PROGRESS"         # 2차 면접 진행 중
    COMPLETED = "COMPLETED"             # 2차 면접 완료
    PASSED = "PASSED"                   # 2차 면접 합격
    FAILED = "FAILED"                   # 2차 면접 불합격
    CANCELLED = "CANCELLED"             # 2차 면접 취소


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
    
    # 면접 상태를 3개 컬럼으로 분리
    ai_interview_status = Column(SqlEnum(AIInterviewStatus), default=AIInterviewStatus.PENDING, nullable=False)
    first_interview_status = Column(SqlEnum(FirstInterviewStatus), default=FirstInterviewStatus.PENDING, nullable=False)
    second_interview_status = Column(SqlEnum(SecondInterviewStatus), default=SecondInterviewStatus.PENDING, nullable=False)
    
    written_test_status = Column(SqlEnum(WrittenTestStatus), default=WrittenTestStatus.PENDING, nullable=False)
    applied_at = Column(DateTime, default=datetime.utcnow)
    application_source = Column(String(255))
    pass_reason = Column(Text)
    fail_reason = Column(Text)
    ai_interview_score = Column(Numeric(5, 2))  # AI 면접 전용 점수
    ai_interview_pass_reason = Column(Text)  # AI 면접 합격 이유
    ai_interview_fail_reason = Column(Text)  # AI 면접 불합격 이유
    final_status = Column(SqlEnum(FinalStatus), default=FinalStatus.PENDING, nullable=False)  # 최종 선발 상태
    
    # AI 면접 비디오 URL (Google Drive URL 포함)
    ai_interview_video_url = Column(String(400), nullable=True, comment="AI 면접 비디오 URL")
    
    # Relationships with back_populates
    user = relationship("User", back_populates="applications")
    job_post = relationship("JobPost", back_populates="applications")
    resume = relationship("Resume", back_populates="applications")
    field_scores = relationship("FieldNameScore", back_populates="application")
    memos = relationship("ResumeMemo", back_populates="application")
    highlight_results = relationship("HighlightResult", back_populates="application")
    analysis_results = relationship("AnalysisResult", back_populates="application")
    growth_prediction_results = relationship("GrowthPredictionResult", back_populates="application")
    personal_question_results = relationship("PersonalQuestionResult", back_populates="application")
    video_analyses = relationship("VideoAnalysis", back_populates="application")
    question_video_analyses = relationship("QuestionVideoAnalysis", back_populates="application")

    # 헬퍼 메서드들
    def get_current_interview_stage(self) -> str:
        """현재 진행 중인 면접 단계를 반환"""
        if self.ai_interview_status in [AIInterviewStatus.PENDING, AIInterviewStatus.SCHEDULED, AIInterviewStatus.IN_PROGRESS]:
            return "AI_INTERVIEW"
        elif self.ai_interview_status == AIInterviewStatus.PASSED and self.first_interview_status in [FirstInterviewStatus.PENDING, FirstInterviewStatus.SCHEDULED, FirstInterviewStatus.IN_PROGRESS]:
            return "FIRST_INTERVIEW"
        elif self.first_interview_status == FirstInterviewStatus.PASSED and self.second_interview_status in [SecondInterviewStatus.PENDING, SecondInterviewStatus.SCHEDULED, SecondInterviewStatus.IN_PROGRESS]:
            return "SECOND_INTERVIEW"
        elif self.second_interview_status == SecondInterviewStatus.PASSED:
            return "COMPLETED"
        else:
            return "UNKNOWN"

    def is_interview_completed(self) -> bool:
        """모든 면접이 완료되었는지 확인"""
        return (self.ai_interview_status in [AIInterviewStatus.PASSED, AIInterviewStatus.FAILED] and
                self.first_interview_status in [FirstInterviewStatus.PASSED, FirstInterviewStatus.FAILED] and
                self.second_interview_status in [SecondInterviewStatus.PASSED, SecondInterviewStatus.FAILED])

    def get_next_interview_stage(self) -> str:
        """다음 면접 단계를 반환"""
        if self.ai_interview_status == AIInterviewStatus.PASSED and self.first_interview_status == FirstInterviewStatus.PENDING:
            return "FIRST_INTERVIEW"
        elif self.first_interview_status == FirstInterviewStatus.PASSED and self.second_interview_status == SecondInterviewStatus.PENDING:
            return "SECOND_INTERVIEW"
        else:
            return "NO_NEXT_STAGE"

    def has_failed_interview(self) -> bool:
        """면접에서 불합격한 단계가 있는지 확인"""
        return (self.ai_interview_status == AIInterviewStatus.FAILED or
                self.first_interview_status == FirstInterviewStatus.FAILED or
                self.second_interview_status == SecondInterviewStatus.FAILED)


class FieldNameScore(Base):
    __tablename__ = "field_name_score"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey('application.id'), nullable=False)
    field_name = Column(String(255), nullable=False)
    score = Column(Numeric(10, 2))
    
    # Relationships
    application = relationship("Application", back_populates="field_scores") 