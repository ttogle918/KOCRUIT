from sqlalchemy import Column, Integer, Text, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class InterviewQuestionLog(Base):
    __tablename__ = "interview_question_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey("application.id"), nullable=False)
    job_post_id = Column(Integer, ForeignKey("jobpost.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("interview_question.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text)
    answer_audio_url = Column(String(255))
    answer_video_url = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now()) 