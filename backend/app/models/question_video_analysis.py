# === Question Video Analysis DB Model ===
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class QuestionVideoAnalysis(Base):
    """질문별 비디오 분석 결과 저장 모델"""
    __tablename__ = "question_video_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("application.id"), nullable=False, index=True)
    question_log_id = Column(Integer, ForeignKey("interview_question_log.id"), nullable=False, index=True)
    
    # 질문 정보
    question_text = Column(Text, nullable=False)
    question_start_time = Column(Float, nullable=True)  # 영상 내 질문 시작 시간 (초)
    question_end_time = Column(Float, nullable=True)    # 영상 내 질문 종료 시간 (초)
    answer_start_time = Column(Float, nullable=True)    # 영상 내 답변 시작 시간 (초)
    answer_end_time = Column(Float, nullable=True)      # 영상 내 답변 종료 시간 (초)
    
    # 분석 정보
    analysis_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="completed")  # processing, completed, failed
    
    # 얼굴 표정 분석 (질문별)
    smile_frequency = Column(Float, nullable=True)
    eye_contact_ratio = Column(Float, nullable=True)
    emotion_variation = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    
    # 자세 분석 (질문별)
    posture_changes = Column(Integer, nullable=True)
    nod_count = Column(Integer, nullable=True)
    posture_score = Column(Float, nullable=True)
    hand_gestures = Column(JSON, nullable=True)  # JSON 배열
    
    # 시선 분석 (질문별)
    eye_aversion_count = Column(Integer, nullable=True)
    focus_ratio = Column(Float, nullable=True)
    gaze_consistency = Column(Float, nullable=True)
    
    # 음성 분석 (질문별)
    speech_rate = Column(Integer, nullable=True)  # wpm
    clarity_score = Column(Float, nullable=True)
    volume_consistency = Column(Float, nullable=True)
    transcription = Column(Text, nullable=True)
    
    # 질문별 종합 평가
    question_score = Column(Float, nullable=True)  # 이 질문에 대한 점수
    question_feedback = Column(Text, nullable=True)  # 이 질문에 대한 피드백
    
    # 상세 분석 데이터 (JSON)
    detailed_analysis = Column(JSON, nullable=True)
    
    # 관계 설정
    application = relationship("Application", back_populates="question_video_analyses")
    question_log = relationship("InterviewQuestionLog", back_populates="video_analyses")
    
    def __repr__(self):
        return f"<QuestionVideoAnalysis(id={self.id}, application_id={self.application_id}, question_score={self.question_score})>"
    
    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            "id": self.id,
            "application_id": self.application_id,
            "question_log_id": self.question_log_id,
            "question_text": self.question_text,
            "timing": {
                "question_start": self.question_start_time,
                "question_end": self.question_end_time,
                "answer_start": self.answer_start_time,
                "answer_end": self.answer_end_time
            },
            "analysis_timestamp": self.analysis_timestamp.isoformat() if self.analysis_timestamp else None,
            "status": self.status,
            "facial_expressions": {
                "smile_frequency": self.smile_frequency,
                "eye_contact_ratio": self.eye_contact_ratio,
                "emotion_variation": self.emotion_variation,
                "confidence_score": self.confidence_score
            },
            "posture_analysis": {
                "posture_changes": self.posture_changes,
                "nod_count": self.nod_count,
                "posture_score": self.posture_score,
                "hand_gestures": self.hand_gestures or []
            },
            "gaze_analysis": {
                "eye_aversion_count": self.eye_aversion_count,
                "focus_ratio": self.focus_ratio,
                "gaze_consistency": self.gaze_consistency
            },
            "audio_analysis": {
                "speech_rate": self.speech_rate,
                "clarity_score": self.clarity_score,
                "volume_consistency": self.volume_consistency,
                "transcription": self.transcription
            },
            "question_score": self.question_score,
            "question_feedback": self.question_feedback,
            "detailed_analysis": self.detailed_analysis
        } 