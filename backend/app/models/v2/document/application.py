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

    @property
    def score(self) -> float:
        """현재 단계의 점수 또는 최종 점수 반환 (호환성용)"""
        if self.final_score is not None:
            return float(self.final_score)
        
        # 현재 단계의 점수 조회
        if self.current_stage:
            stage = self.get_stage(self.current_stage)
            if stage and stage.score is not None:
                return float(stage.score)
        return None

    @property
    def ai_score(self) -> float:
        """AI 면접 점수 (호환성용)"""
        return self.ai_interview_score

    @property
    def human_score(self) -> float:
        """사람 평가 점수 (호환성용 - 현재는 미사용)"""
        return None

    @property
    def pass_reason(self) -> str:
        """현재 단계의 합격 사유 (호환성용)"""
        if self.current_stage:
            stage = self.get_stage(self.current_stage)
            return stage.pass_reason if stage else None
        return None

    @property
    def fail_reason(self) -> str:
        """현재 단계의 불합격 사유 (호환성용)"""
        if self.current_stage:
            stage = self.get_stage(self.current_stage)
            return stage.fail_reason if stage else None
        return None

    @property
    def created_at(self) -> datetime:
        return self.applied_at

    @property
    def name(self) -> str:
        return self.user.name if self.user else "Unknown"

    @property
    def email(self) -> str:
        return self.user.email if self.user else None

    @property
    def phone(self) -> str:
        return self.user.phone_number if self.user else None

    @property
    def degree(self) -> str:
        # 이력서에서 학위 정보 추출
        if self.resume and self.resume.specs:
            for spec in self.resume.specs:
                if not spec.spec_type: continue
                stype = spec.spec_type.upper()
                if stype in ['EDUCATION', 'HAKRYEOK', '학력']:
                    # 학위 키워드 검색
                    content = (spec.spec_title or "") + (spec.spec_description or "")
                    if "박사" in content: return "박사"
                    if "석사" in content: return "석사"
                    if "학사" in content or "대학교" in content: return "학사"
                    if "전문학사" in content or "전문대" in content: return "전문학사"
                    if "고등학교" in content: return "고졸"
            
            # 스펙이 있지만 명시적 학위가 없으면 기본값 (예: 대졸 공고면 학사)
            if len(self.resume.specs) > 0:
                 return "학사"
        return None

    @property
    def education(self) -> str:
         # 이력서에서 학교 정보 추출
        if self.resume and self.resume.specs:
            for spec in self.resume.specs:
                if not spec.spec_type: continue
                stype = spec.spec_type.upper()
                if stype in ['EDUCATION', 'HAKRYEOK', '학력']:
                    # spec_title이 키(key) 역할이고 description이 값(value)인 경우 (예: title='institution', desc='OO대학교')
                    if spec.spec_title and spec.spec_title.lower() in ['institution', 'school', 'university', 'college', '학교', '학교명']:
                        return spec.spec_description
                    # spec_title 자체가 학교명인 경우 (일반적인 경우)
                    return spec.spec_title
        return None

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
