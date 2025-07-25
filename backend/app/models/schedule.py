import enum
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SqlEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class InterviewScheduleStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"      # 면접 일정 확정
    COMPLETED = "COMPLETED"      # 면접 일정 완료
    CANCELLED = "CANCELLED"      # 면접 일정 취소

class Schedule(Base):
    __tablename__ = "schedule"
    
    id = Column(Integer, primary_key=True, index=True)
    schedule_type = Column(String(255))
    user_id = Column(Integer, ForeignKey('company_user.id'), nullable=True)  # AI 면접을 위해 nullable로 변경
    job_post_id = Column(Integer, ForeignKey('jobpost.id'), nullable=True)  # For interview schedules
    title = Column(String(255))
    description = Column(Text)
    location = Column(String(255))
    scheduled_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(String(255))
    
    # Relationships
    user = relationship("CompanyUser")
    job_post = relationship("JobPost", back_populates="interview_schedules")
    interviews = relationship("ScheduleInterview", back_populates="schedule")


class ScheduleInterview(Base):
    __tablename__ = "schedule_interview"
    
    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey('schedule.id'))
    user_id = Column(Integer, ForeignKey('company_user.id'), nullable=True)  # AI 면접을 위해 nullable로 변경
    schedule_date = Column(DateTime)
    status = Column(SqlEnum(InterviewScheduleStatus), default=InterviewScheduleStatus.SCHEDULED, nullable=False)
    
    # Relationships
    schedule = relationship("Schedule", back_populates="interviews")
    user = relationship("CompanyUser")


# AI 면접 전용 테이블
class AIInterviewSchedule(Base):
    __tablename__ = "ai_interview_schedule"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey('application.id'), nullable=False)
    job_post_id = Column(Integer, ForeignKey('jobpost.id'), nullable=False)
    applicant_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # 지원자 ID
    scheduled_at = Column(DateTime, default=datetime.now)
    status = Column(String(255), default="SCHEDULED")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    application = relationship("Application")
    job_post = relationship("JobPost")
    applicant = relationship("User") 