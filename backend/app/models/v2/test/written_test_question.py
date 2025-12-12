from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class WrittenTestQuestion(Base):
    __tablename__ = "written_test_question"

    id = Column(Integer, primary_key=True, index=True)
    jobpost_id = Column(Integer, ForeignKey("jobpost.id"), nullable=False)
    question_type = Column(String(20), nullable=False)
    question_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job_post = relationship("JobPost", back_populates="written_test_questions") 