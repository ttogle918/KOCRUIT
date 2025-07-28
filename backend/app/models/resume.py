from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float
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
    
    # 표절 점수 관련 컬럼들
    plagiarism_score = Column(Float, nullable=True, comment="표절 유사도 점수 (0-1)")
    plagiarism_checked_at = Column(DateTime, nullable=True, comment="표절 검사 수행 시간")
    most_similar_resume_id = Column(Integer, nullable=True, comment="가장 유사한 이력서 ID")
    similarity_threshold = Column(Float, default=0.9, comment="표절 의심 임계값")
    
    # Relationships with back_populates
    user = relationship("User", back_populates="resumes")
    applications = relationship("Application", back_populates="resume")
    specs = relationship("Spec", back_populates="resume")
    memos = relationship("ResumeMemo", back_populates="resume")


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
    resume_id = Column(Integer, ForeignKey('resume.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('company_user.id'))
    application_id = Column(Integer, ForeignKey('application.id'))
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships with back_populates
    resume = relationship("Resume", back_populates="memos")
    user = relationship("CompanyUser", back_populates="resume_memos")
    application = relationship("Application", back_populates="memos") 