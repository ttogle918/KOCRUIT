from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Resume(Base):
    __tablename__ = "resume"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text)
    file_url = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships with back_populates
    user = relationship("User", back_populates="resumes")
    specs = relationship("Spec", back_populates="resume")
    applications = relationship("Application", back_populates="resume")


class Spec(Base):
    __tablename__ = "spec"
    
    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey('resume.id'), nullable=False)
    spec_type = Column(String(255), nullable=False)
    spec_title = Column(String(255), nullable=False)
    spec_description = Column(Text)
    
    # Relationships
    resume = relationship("Resume", back_populates="specs")


class ResumeMemo(Base):
    __tablename__ = "resume_memo"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('company_user.id'))
    application_id = Column(Integer, ForeignKey('application.id'))
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships with back_populates
    user = relationship("CompanyUser", back_populates="resume_memos")
    application = relationship("Application", back_populates="memos") 