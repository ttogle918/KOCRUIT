# === Media Analysis DB Model ===
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class MediaAnalysis(Base):
    """Media Analysis 결과 저장 모델"""
    __tablename__ = "media_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("application.id"), nullable=False, index=True)
    
    # 비디오 정보
    video_path = Column(String(500), nullable=False)
    video_url = Column(String(500), nullable=True)
    
    # 분석 정보
    analysis_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="completed")  # processing, completed, failed
    
    # 비디오 메타데이터
    frame_count = Column(Integer, nullable=True)
    fps = Column(Float, nullable=True)
    duration = Column(Float, nullable=True)
    
    # 얼굴 표정 분석
    smile_frequency = Column(Float, nullable=True)
    eye_contact_ratio = Column(Float, nullable=True)
    emotion_variation = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    
    # 자세 분석
    posture_changes = Column(Integer, nullable=True)
    nod_count = Column(Integer, nullable=True)
    posture_score = Column(Float, nullable=True)
    hand_gestures = Column(JSON, nullable=True)  # JSON 배열
    
    # 시선 분석
    eye_aversion_count = Column(Integer, nullable=True)
    focus_ratio = Column(Float, nullable=True)
    gaze_consistency = Column(Float, nullable=True)
    
    # 음성 분석
    speech_rate = Column(Integer, nullable=True)  # wpm
    clarity_score = Column(Float, nullable=True)
    volume_consistency = Column(Float, nullable=True)
    transcription = Column(Text, nullable=True)
    
    # 종합 평가
    overall_score = Column(Float, nullable=True)
    recommendations = Column(JSON, nullable=True)  # JSON 배열
    
    # 상세 분석 데이터 (JSON)
    detailed_analysis = Column(JSON, nullable=True)
    
    # 관계 설정
    application = relationship("Application", back_populates="media_analyses")
    
    def __repr__(self):
        return f"<MediaAnalysis(id={self.id}, application_id={self.application_id}, score={self.overall_score})>"
    
    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            "id": self.id,
            "application_id": self.application_id,
            "video_path": self.video_path,
            "video_url": self.video_url,
            "analysis_timestamp": self.analysis_timestamp.isoformat() if self.analysis_timestamp else None,
            "status": self.status,
            "video_info": {
                "frame_count": self.frame_count,
                "fps": self.fps,
                "duration": self.duration
            },
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
            "overall_score": self.overall_score,
            "recommendations": self.recommendations or [],
            "detailed_analysis": self.detailed_analysis
        } 