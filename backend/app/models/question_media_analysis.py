# === Question Media Analysis Model ===
from sqlalchemy import Column, Integer, Text, String, DateTime, ForeignKey, Numeric, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class QuestionMediaAnalysis(Base):
    __tablename__ = "question_media_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("application.id"), nullable=False)
    question_log_id = Column(Integer, ForeignKey("interview_question_log.id"), nullable=False)
    
    # 분석 결과
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    analysis_timestamp = Column(DateTime, default=func.now())
    
    # 비디오 분석 결과
    video_path = Column(String(500))
    video_url = Column(String(500))
    frame_count = Column(Integer)
    fps = Column(Numeric(5, 2))
    duration = Column(Numeric(10, 2))
    
    # 얼굴 표정 분석
    smile_frequency = Column(Numeric(5, 2))
    eye_contact_ratio = Column(Numeric(5, 2))
    emotion_variation = Column(String(100))
    confidence_score = Column(Numeric(5, 2))
    
    # 자세 분석
    posture_changes = Column(Integer)
    nod_count = Column(Integer)
    posture_score = Column(Numeric(5, 2))
    hand_gestures = Column(String(200))
    
    # 시선 분석
    gaze_direction = Column(String(100))
    gaze_stability = Column(Numeric(5, 2))
    attention_score = Column(Numeric(5, 2))
    
    # 오디오 분석
    transcription = Column(Text)
    speech_rate = Column(Numeric(5, 2))
    clarity_score = Column(Numeric(5, 2))
    audio_quality = Column(String(100))
    
    # 질문별 평가
    question_score = Column(Numeric(5, 2))
    question_feedback = Column(Text)
    
    # 타이밍 정보
    question_start_time = Column(Numeric(10, 2))
    question_end_time = Column(Numeric(10, 2))
    answer_start_time = Column(Numeric(10, 2))
    answer_end_time = Column(Numeric(10, 2))
    
    # 상세 분석 결과 (JSON)
    detailed_analysis = Column(JSON)
    
    # Relationships
    application = relationship("Application", back_populates="question_media_analyses")
    question_log = relationship("InterviewQuestionLog", back_populates="media_analyses")
    
    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            "id": self.id,
            "application_id": self.application_id,
            "question_log_id": self.question_log_id,
            "status": self.status,
            "analysis_timestamp": self.analysis_timestamp.isoformat() if self.analysis_timestamp else None,
            "video_path": self.video_path,
            "video_url": self.video_url,
            "frame_count": self.frame_count,
            "fps": float(self.fps) if self.fps else None,
            "duration": float(self.duration) if self.duration else None,
            "smile_frequency": float(self.smile_frequency) if self.smile_frequency else None,
            "eye_contact_ratio": float(self.eye_contact_ratio) if self.eye_contact_ratio else None,
            "emotion_variation": self.emotion_variation,
            "confidence_score": float(self.confidence_score) if self.confidence_score else None,
            "posture_changes": self.posture_changes,
            "nod_count": self.nod_count,
            "posture_score": float(self.posture_score) if self.posture_score else None,
            "hand_gestures": self.hand_gestures,
            "gaze_direction": self.gaze_direction,
            "gaze_stability": float(self.gaze_stability) if self.gaze_stability else None,
            "attention_score": float(self.attention_score) if self.attention_score else None,
            "transcription": self.transcription,
            "speech_rate": float(self.speech_rate) if self.speech_rate else None,
            "clarity_score": float(self.clarity_score) if self.clarity_score else None,
            "audio_quality": self.audio_quality,
            "evaluation": {
                "question_score": float(self.question_score) if self.question_score else None,
                "question_feedback": self.question_feedback
            },
            "timing": {
                "question_start_time": float(self.question_start_time) if self.question_start_time else None,
                "question_end_time": float(self.question_end_time) if self.question_end_time else None,
                "answer_start_time": float(self.answer_start_time) if self.answer_start_time else None,
                "answer_end_time": float(self.answer_end_time) if self.answer_end_time else None
            },
            "detailed_analysis": self.detailed_analysis
        }
    
    def __repr__(self):
        return f"<QuestionMediaAnalysis(id={self.id}, application_id={self.application_id}, status='{self.status}')>"
