from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Resume(Base):
    __tablename__ = "resume"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('applicantuser.id'))
    title = Column(String(200), nullable=False)
    content = Column(Text)
    file_path = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("ApplicantUser")
    memos = relationship("ResumeMemo", back_populates="resume")


class ResumeMemo(Base):
    __tablename__ = "resume_memo"
    
    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey('resume.id'))
    writer_id = Column(Integer, ForeignKey('companyuser.id'))
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    resume = relationship("Resume", back_populates="memos")
    writer = relationship("CompanyUser") 