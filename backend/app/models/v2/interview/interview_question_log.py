from sqlalchemy import Column, Integer, Text, String, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import enum
from sqlalchemy.orm import relationship

class InterviewType(str, enum.Enum):
    AI_INTERVIEW = "AI_INTERVIEW"      # AI 면접
    PRACTICAL_INTERVIEW = "PRACTICAL_INTERVIEW"   # 1차 면접 (실무진)
    EXECUTIVE_INTERVIEW = "EXECUTIVE_INTERVIEW"  # 임원진 면접
    FINAL_INTERVIEW = "FINAL_INTERVIEW"   # 최종 면접


class InterviewQuestionLog(Base):
    __tablename__ = "interview_question_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey("application.id"), nullable=False)
    job_post_id = Column(Integer, ForeignKey("jobpost.id"), nullable=False)
    interview_type = Column(Enum(InterviewType), nullable=False, default=InterviewType.AI_INTERVIEW)  # 면접 유형
    question_id = Column(Integer, ForeignKey("interview_question.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text)
    answer_audio_url = Column(String(255))
    answer_video_url = Column(String(255))
    answer_text_transcribed = Column(Text)
    emotion = Column(String(16))
    attitude = Column(String(16))
    answer_score = Column(Integer)  # 또는 Float, DB 타입에 맞게
    answer_feedback = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # 관계 설정
    media_analyses = relationship("QuestionMediaAnalysis", back_populates="question_log") 