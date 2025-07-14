from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.user import User
from app.api.v1.auth import get_current_user
from app.services.interview_panel_service import InterviewPanelService
from app.schemas.interview_panel import (
    InterviewerSelectionCriteria, InterviewerResponse,
    InterviewPanelAssignmentResponse, InterviewPanelRequestResponse,
    InterviewPanelMemberResponse
)

router = APIRouter()


@router.post("/assign-interviewers/", response_model=List[InterviewPanelAssignmentResponse])
def assign_interviewers(
    criteria: InterviewerSelectionCriteria,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Automatically assign interviewers for a job post based on criteria:
    - 2 from same department
    - 1 from HR department
    """
    try:
        assignments = InterviewPanelService.create_panel_assignments(db, criteria)
        return assignments
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assign interviewers: {str(e)}")


@router.post("/respond-to-request/", response_model=dict)
def respond_to_interview_request(
    response: InterviewerResponse,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Respond to an interview panel request (accept/reject)
    """
    try:
        result = InterviewPanelService.respond_to_request(db, response.request_id, response)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process response: {str(e)}")


@router.get("/my-pending-requests/", response_model=List[dict])
def get_my_pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get pending interview panel requests for the current user
    """
    try:
        requests = InterviewPanelService.get_user_pending_requests(db, current_user.id)
        return requests
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get pending requests: {str(e)}")


@router.get("/panel-members/{job_post_id}/", response_model=List[dict])
def get_panel_members(
    job_post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all panel members for a specific job post
    """
    try:
        members = InterviewPanelService.get_panel_members(db, job_post_id)
        return members
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get panel members: {str(e)}")


@router.get("/assignments/{job_post_id}/", response_model=List[dict])
def get_job_post_assignments(
    job_post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all interview panel assignments for a job post
    """
    from app.models.interview_panel import InterviewPanelAssignment, InterviewPanelRequest, InterviewPanelMember
    from app.models.job import JobPost
    from app.models.schedule import Schedule
    
    try:
        assignments = db.query(InterviewPanelAssignment).filter(
            InterviewPanelAssignment.job_post_id == job_post_id
        ).all()
        
        result = []
        for assignment in assignments:
            # Get requests for this assignment
            requests = db.query(InterviewPanelRequest).filter(
                InterviewPanelRequest.assignment_id == assignment.id
            ).all()
            
            # Get members for this assignment
            members = db.query(InterviewPanelMember).filter(
                InterviewPanelMember.assignment_id == assignment.id
            ).all()
            
            # Get related info
            job_post = db.query(JobPost).filter(JobPost.id == assignment.job_post_id).first()
            schedule = db.query(Schedule).filter(Schedule.id == assignment.schedule_id).first()
            
            result.append({
                "assignment_id": assignment.id,
                "job_post_title": job_post.title if job_post else "Unknown",
                "schedule_date": schedule.scheduled_at if schedule else None,
                "assignment_type": assignment.assignment_type.value,
                "required_count": assignment.required_count,
                "status": assignment.status.value,
                "requests_count": len(requests),
                "members_count": len(members),
                "created_at": assignment.created_at
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get assignments: {str(e)}")


@router.get("/assignment/{assignment_id}/details/", response_model=dict)
def get_assignment_details(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information about a specific assignment
    """
    from app.models.interview_panel import InterviewPanelAssignment, InterviewPanelRequest, InterviewPanelMember
    from app.models.user import CompanyUser
    from app.models.job import JobPost
    from app.models.schedule import Schedule
    
    try:
        assignment = db.query(InterviewPanelAssignment).filter(
            InterviewPanelAssignment.id == assignment_id
        ).first()
        
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Get requests with user info
        requests = db.query(InterviewPanelRequest).filter(
            InterviewPanelRequest.assignment_id == assignment_id
        ).all()
        
        requests_with_users = []
        for request in requests:
            company_user = db.query(CompanyUser).filter(CompanyUser.id == request.company_user_id).first()
            requests_with_users.append({
                "request_id": request.id,
                "user_id": company_user.id if company_user else None,
                "user_name": company_user.name if company_user else "Unknown",
                "user_email": company_user.email if company_user else "Unknown",
                "user_ranks": company_user.ranks if company_user else None,
                "status": request.status.value,
                "response_at": request.response_at,
                "created_at": request.created_at
            })
        
        # Get members with user info
        members = db.query(InterviewPanelMember).filter(
            InterviewPanelMember.assignment_id == assignment_id
        ).all()
        
        members_with_users = []
        for member in members:
            company_user = db.query(CompanyUser).filter(CompanyUser.id == member.company_user_id).first()
            members_with_users.append({
                "member_id": member.id,
                "user_id": company_user.id if company_user else None,
                "user_name": company_user.name if company_user else "Unknown",
                "user_email": company_user.email if company_user else "Unknown",
                "user_ranks": company_user.ranks if company_user else None,
                "role": member.role.value,
                "assigned_at": member.assigned_at
            })
        
        # Get related info
        job_post = db.query(JobPost).filter(JobPost.id == assignment.job_post_id).first()
        schedule = db.query(Schedule).filter(Schedule.id == assignment.schedule_id).first()
        
        return {
            "assignment_id": assignment.id,
            "job_post": {
                "id": job_post.id if job_post else None,
                "title": job_post.title if job_post else "Unknown",
                "company_id": job_post.company_id if job_post else None
            },
            "schedule": {
                "id": schedule.id if schedule else None,
                "scheduled_at": schedule.scheduled_at if schedule else None,
                "title": schedule.title if schedule else None
            },
            "assignment_type": assignment.assignment_type.value,
            "required_count": assignment.required_count,
            "status": assignment.status.value,
            "requests": requests_with_users,
            "members": members_with_users,
            "created_at": assignment.created_at,
            "updated_at": assignment.updated_at
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get assignment details: {str(e)}")


@router.delete("/assignment/{assignment_id}/", response_model=dict)
def cancel_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancel an interview panel assignment
    """
    from app.models.interview_panel import InterviewPanelAssignment, AssignmentStatus
    
    try:
        assignment = db.query(InterviewPanelAssignment).filter(
            InterviewPanelAssignment.id == assignment_id
        ).first()
        
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        assignment.status = AssignmentStatus.CANCELLED
        db.commit()
        
        return {"message": "Assignment cancelled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel assignment: {str(e)}") 