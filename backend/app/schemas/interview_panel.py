from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class AssignmentType(str, Enum):
    SAME_DEPARTMENT = "SAME_DEPARTMENT"
    HR_DEPARTMENT = "HR_DEPARTMENT"


class AssignmentStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class RequestStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class PanelRole(str, Enum):
    INTERVIEWER = "INTERVIEWER"
    LEAD_INTERVIEWER = "LEAD_INTERVIEWER"


# Base schemas
class InterviewPanelAssignmentBase(BaseModel):
    job_post_id: int
    schedule_id: int
    assignment_type: AssignmentType
    required_count: int = 1


class InterviewPanelRequestBase(BaseModel):
    assignment_id: int
    company_user_id: int
    notification_id: Optional[int] = None


class InterviewPanelMemberBase(BaseModel):
    assignment_id: int
    company_user_id: int
    role: PanelRole = PanelRole.INTERVIEWER


# Create schemas
class InterviewPanelAssignmentCreate(InterviewPanelAssignmentBase):
    pass


class InterviewPanelRequestCreate(InterviewPanelRequestBase):
    pass


class InterviewPanelMemberCreate(InterviewPanelMemberBase):
    pass


# Update schemas
class InterviewPanelAssignmentUpdate(BaseModel):
    status: Optional[AssignmentStatus] = None


class InterviewPanelRequestUpdate(BaseModel):
    status: RequestStatus
    response_at: Optional[datetime] = None


# Response schemas
class InterviewPanelAssignmentResponse(InterviewPanelAssignmentBase):
    id: int
    status: AssignmentStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InterviewPanelRequestResponse(InterviewPanelRequestBase):
    id: int
    status: RequestStatus
    response_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InterviewPanelMemberResponse(InterviewPanelMemberBase):
    id: int
    assigned_at: datetime

    class Config:
        from_attributes = True


# Detailed response schemas with relationships
class InterviewPanelAssignmentDetail(InterviewPanelAssignmentResponse):
    requests: List[InterviewPanelRequestResponse] = []
    members: List[InterviewPanelMemberResponse] = []


class CompanyUserInfo(BaseModel):
    id: int
    name: str
    email: str
    ranks: Optional[str] = None
    department_name: Optional[str] = None

    class Config:
        from_attributes = True


class InterviewPanelRequestWithUser(InterviewPanelRequestResponse):
    company_user: CompanyUserInfo


class InterviewPanelMemberWithUser(InterviewPanelMemberResponse):
    company_user: CompanyUserInfo


# Service schemas
class InterviewerSelectionCriteria(BaseModel):
    job_post_id: int
    schedule_id: int
    same_department_count: int = 2
    hr_department_count: int = 1


class InterviewerResponse(BaseModel):
    request_id: int
    status: RequestStatus 