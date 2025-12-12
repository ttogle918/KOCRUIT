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
    application_id = Column(Integer, ForeignKey('application.id'), nullable=True)  # 지원서 ID 추가
    interviewer_id = Column(Integer, ForeignKey('company_user.id'), nullable=True)  # 면접관 ID 추가
    user_id = Column(Integer, ForeignKey('company_user.id'), nullable=True)  # AI 면접을 위해 nullable로 변경
    schedule_date = Column(DateTime)
    notes = Column(Text, nullable=True)  # 메모 필드 추가
    status = Column(SqlEnum(InterviewScheduleStatus), default=InterviewScheduleStatus.SCHEDULED, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)  # 생성 시간 추가
    
    # Relationships
    schedule = relationship("Schedule", back_populates="interviews")
    user = relationship("CompanyUser", foreign_keys=[user_id])  # user_id를 명시적으로 지정
    application = relationship("Application")  # Application 관계 추가
    interviewer = relationship("CompanyUser", foreign_keys=[interviewer_id])  # 면접관 관계 추가


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