from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class JobPost(Base):
    __tablename__ = "jobpost"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    department = Column(String(100))  # 부서 필드 추가
    qualifications = Column(Text)
    conditions = Column(Text)
    jobDetails = Column(Text)
    procedure = Column(Text)
    headcount = Column(Integer)
    startDate = Column(String(50))
    endDate = Column(String(50))
    location = Column(String(255))
    employmentType = Column(String(50))
    deadline = Column(String(50))
    teamMembers = Column(Text)  # JSON string으로 저장
    weights = Column(Text)      # JSON string으로 저장
    status = Column(String(20), default="ACTIVE")  # ACTIVE, CLOSED, DRAFT
    company_id = Column(Integer, ForeignKey('company.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="job_posts")
    applications = relationship("Application", back_populates="job_post")


class Job(Base):
    __tablename__ = "job"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    company = Column(String(100))
    description = Column(Text)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    user_id = Column(Integer, ForeignKey('applicantuser.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("ApplicantUser", back_populates="jobs") 