from sqlalchemy import Column, Integer, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class WrittenTestAnswer(Base):
    __tablename__ = "written_test_answer"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    jobpost_id = Column(Integer, ForeignKey("jobpost.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("written_test_question.id"), nullable=False)
    answer_text = Column(Text, nullable=False)
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    jobpost = relationship("JobPost")
    question = relationship("WrittenTestQuestion") 