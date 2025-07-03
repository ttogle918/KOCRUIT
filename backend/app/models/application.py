from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import enum


class ApplyStatus(str, enum.Enum):
    PENDING = "PENDING"
    REVIEWING = "REVIEWING"
    INTERVIEW = "INTERVIEW"
    PASSED = "PASSED"
    REJECTED = "REJECTED"


class ApplicationViewAction(str, enum.Enum):
    VIEW = "VIEW"
    DOWNLOAD = "DOWNLOAD"


class Application(Base):
    __tablename__ = "application"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    resume_id = Column(Integer, ForeignKey('resume.id'))
    job_post_id = Column(Integer, ForeignKey('jobpost.id'))
    score = Column(Numeric(10,2))
    ai_score = Column(Numeric(5,2))
    human_score = Column(Numeric(5,2))
    final_score = Column(Numeric(5,2))
    status = Column(Enum(ApplyStatus), default=ApplyStatus.PENDING)
    applied_at = Column(DateTime, default=datetime.utcnow)
    application_source = Column(String(255))
    pass_reason = Column(Text)
    fail_reason = Column(Text)
    cover_letter = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    job_post = relationship("JobPost", back_populates="applications", foreign_keys=[job_post_id])
    resume = relationship("Resume")
    status_history = relationship("ApplicationStatusHistory", back_populates="application")


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey('application.id'))
    status = Column(Enum(ApplyStatus))
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    application = relationship("Application", back_populates="status_history")


class ApplicationViewLog(Base):
    __tablename__ = "application_view_log"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey('application.id'))
    viewer_id = Column(Integer, ForeignKey('companyuser.id'))
    action = Column(Enum(ApplicationViewAction))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    application = relationship("Application")
    viewer = relationship("CompanyUser") 