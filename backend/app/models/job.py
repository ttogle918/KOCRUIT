from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class JobPost(Base):
    __tablename__ = "jobpost"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    requirements = Column(Text)
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    location = Column(String(255))
    job_type = Column(String(50))  # FULL_TIME, PART_TIME, CONTRACT, etc.
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