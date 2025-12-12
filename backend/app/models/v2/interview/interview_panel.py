from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import enum


class AssignmentType(str, enum.Enum):
    SAME_DEPARTMENT = "SAME_DEPARTMENT"
    HR_DEPARTMENT = "HR_DEPARTMENT"


class AssignmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class RequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class PanelRole(str, enum.Enum):
    INTERVIEWER = "INTERVIEWER"
    LEAD_INTERVIEWER = "LEAD_INTERVIEWER"


class InterviewPanelAssignment(Base):
    __tablename__ = "interview_panel_assignment"
    
    id = Column(Integer, primary_key=True, index=True)
    job_post_id = Column(Integer, ForeignKey('jobpost.id'), nullable=False)
    schedule_id = Column(Integer, ForeignKey('schedule.id'), nullable=False)
    assignment_type = Column(Enum(AssignmentType), nullable=False)
    required_count = Column(Integer, nullable=False, default=1)
    status = Column(Enum(AssignmentStatus), default=AssignmentStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    job_post = relationship("JobPost")
    schedule = relationship("Schedule")
    requests = relationship("InterviewPanelRequest", back_populates="assignment", cascade="all, delete-orphan")
    members = relationship("InterviewPanelMember", back_populates="assignment", cascade="all, delete-orphan")


class InterviewPanelRequest(Base):
    __tablename__ = "interview_panel_request"
    
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey('interview_panel_assignment.id'), nullable=False)
    company_user_id = Column(Integer, ForeignKey('company_user.id'), nullable=False)
    notification_id = Column(Integer, ForeignKey('notification.id'), nullable=True)
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING)
    response_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assignment = relationship("InterviewPanelAssignment", back_populates="requests")
    company_user = relationship("CompanyUser")
    notification = relationship("Notification")


class InterviewPanelMember(Base):
    __tablename__ = "interview_panel_member"
    
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey('interview_panel_assignment.id'), nullable=False)
    company_user_id = Column(Integer, ForeignKey('company_user.id'), nullable=False)
    role = Column(Enum(PanelRole), default=PanelRole.INTERVIEWER)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    assignment = relationship("InterviewPanelAssignment", back_populates="members")
    company_user = relationship("CompanyUser") 