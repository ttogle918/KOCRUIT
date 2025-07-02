from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum
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
    user_id = Column(Integer, ForeignKey('applicantuser.id'))
    job_post_id = Column(Integer, ForeignKey('jobpost.id'))
    resume_id = Column(Integer, ForeignKey('resume.id'))
    status = Column(Enum(ApplyStatus), default=ApplyStatus.PENDING)
    cover_letter = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("ApplicantUser")
    job_post = relationship("JobPost", back_populates="applications")
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