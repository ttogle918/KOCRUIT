from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SqlEnum, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import enum

# --- Enums Definition ---

class OverallStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"   # 진행 중
    PASSED = "PASSED"            # 최종 합격
    REJECTED = "REJECTED"        # 불합격 (탈락)
    CANCELED = "CANCELED"        # 취소/포기 (WITHDRAWN)

class StageName(str, enum.Enum):
    DOCUMENT = "DOCUMENT"
    WRITTEN_TEST = "WRITTEN_TEST"
    AI_INTERVIEW = "AI_INTERVIEW"
    PRACTICAL_INTERVIEW = "PRACTICAL_INTERVIEW"
    EXECUTIVE_INTERVIEW = "EXECUTIVE_INTERVIEW"
    FINAL_RESULT = "FINAL_RESULT"

class StageStatus(str, enum.Enum):
    PENDING = "PENDING"       # 대기
    SCHEDULED = "SCHEDULED"   # 일정 잡힘
    IN_PROGRESS = "IN_PROGRESS" # 진행 중 (평가 중)
    COMPLETED = "COMPLETED"   # 완료 (결과 대기)
    PASSED = "PASSED"         # 합격 (다음 단계로)
    FAILED = "FAILED"         # 불합격
    CANCELED = "CANCELED"     # 취소/미응시

class ApplicationViewAction(str, enum.Enum):
    VIEW = "VIEW"
    EDIT = "EDIT"
    DOWNLOAD = "DOWNLOAD"
    PRINT = "PRINT"

# --- Models Definition ---

class Application(Base):
    __tablename__ = "application"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    resume_id = Column(Integer, ForeignKey('resume.id'))
    job_post_id = Column(Integer, ForeignKey('jobpost.id'), nullable=False)
    
    # 1안 리팩토링: 핵심 상태 관리 컬럼
    current_stage = Column(SqlEnum(StageName), default=StageName.DOCUMENT, nullable=False, comment="현재 진행 중인 전형 단계")
    overall_status = Column(SqlEnum(OverallStatus), default=OverallStatus.IN_PROGRESS, nullable=False, comment="전체 지원 상태")
    
    final_score = Column(Numeric(5, 2), nullable=True, comment="최종 합산 점수")
    
    applied_at = Column(DateTime, default=datetime.utcnow)
    application_source = Column(String(255))
    
    # AI 면접 비디오 URL (레거시 호환 또는 공통 관리용)
    ai_interview_video_url = Column(String(400), nullable=True, comment="AI 면접 비디오 URL")
    
    # Relationships
    user = relationship("User", back_populates="applications")
    job_post = relationship("JobPost", back_populates="applications")
    resume = relationship("Resume", back_populates="applications")
    
    # 단계별 이력 관계 설정 (Lazy loading 주의)
    stages = relationship("ApplicationStage", back_populates="application", cascade="all, delete-orphan", order_by="ApplicationStage.stage_order", lazy="joined")
    
    # field_scores = relationship("FieldNameScore", back_populates="application")
    memos = relationship("ResumeMemo", back_populates="application")
    highlight_results = relationship("HighlightResult", back_populates="application")
    analysis_results = relationship("AnalysisResult", back_populates="application")
    growth_prediction_results = relationship("GrowthPredictionResult", back_populates="application")
    personal_question_results = relationship("PersonalQuestionResult", back_populates="application")
    media_analyses = relationship("MediaAnalysis", back_populates="application")
    question_media_analyses = relationship("QuestionMediaAnalysis", back_populates="application")

    # --- [Compatibility Properties] ---
    # Pydantic이 from_attributes=True 모드일 때 이 프로퍼티들을 읽어갑니다.
    
    @property
    def status(self) -> OverallStatus:
        return self.overall_status

    @property
    def final_status(self) -> OverallStatus:
        return self.overall_status

    @property
    def document_status(self) -> StageStatus:
        return self.get_stage_status(StageName.DOCUMENT)

    @property
    def ai_interview_status(self) -> StageStatus:
        return self.get_stage_status(StageName.AI_INTERVIEW)

    @property
    def practical_interview_status(self) -> StageStatus:
        return self.get_stage_status(StageName.PRACTICAL_INTERVIEW)

    @property
    def executive_interview_status(self) -> StageStatus:
        return self.get_stage_status(StageName.EXECUTIVE_INTERVIEW)

    @property
    def ai_interview_score(self) -> float:
        stage = self.get_stage(StageName.AI_INTERVIEW)
        return float(stage.score) if stage and stage.score is not None else None

    @property
    def ai_interview_pass_reason(self) -> str:
        stage = self.get_stage(StageName.AI_INTERVIEW)
        return stage.pass_reason if stage else None

    @property
    def ai_interview_fail_reason(self) -> str:
        stage = self.get_stage(StageName.AI_INTERVIEW)
        return stage.fail_reason if stage else None

    # --- Helper Methods ---

    def get_stage(self, stage_name: StageName):
        """특정 단계 객체 반환"""
        if not self.stages:
            return None
        for stage in self.stages:
            if stage.stage_name == stage_name:
                return stage
        return None

    def get_stage_status(self, stage_name: StageName) -> StageStatus:
        """특정 단계의 상태를 조회"""
        stage = self.get_stage(stage_name)
        return stage.status if stage else StageStatus.PENDING


class ApplicationStage(Base):
    """
    지원자의 전형 단계별 상세 이력 및 상태 관리 테이블
    (1안 리팩토링의 핵심)
    """
    __tablename__ = "application_stage"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey('application.id'), nullable=False)
    
    stage_name = Column(SqlEnum(StageName), nullable=False)
    stage_order = Column(Integer, default=1, nullable=False, comment="단계 순서 (정렬용)")
    
    status = Column(SqlEnum(StageStatus), default=StageStatus.PENDING, nullable=False)
    
    score = Column(Numeric(5, 2), nullable=True, comment="해당 단계 점수")
    pass_reason = Column(Text, nullable=True, comment="합격 사유 / 코멘트")
    fail_reason = Column(Text, nullable=True, comment="불합격 사유 / 코멘트")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="stages")
