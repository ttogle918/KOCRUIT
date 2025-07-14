from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime
from app.models.interview_panel import (
    InterviewPanelAssignment, InterviewPanelRequest, InterviewPanelMember,
    AssignmentType, AssignmentStatus, RequestStatus, PanelRole
)
from app.models.user import CompanyUser
from app.models.company import Department
from app.models.job import JobPost
from app.models.notification import Notification
from app.schemas.interview_panel import InterviewerSelectionCriteria, InterviewerResponse
from app.models.schedule import Schedule
import random


class InterviewPanelService:
    
    @staticmethod
    def select_interviewers(db: Session, criteria: InterviewerSelectionCriteria) -> dict:
        """
        Select interviewers based on criteria:
        - 2 from same department as job post
        - 1 from HR department
        
        Excludes users who are already assigned to any interview panel for this job post
        """
        # Get job post details
        job_post = db.query(JobPost).filter(JobPost.id == criteria.job_post_id).first()
        if not job_post:
            raise ValueError("Job post not found")
        
        # Get company and department info
        company_id = job_post.company_id
        department_id = job_post.department_id
        
        # Valid ranks for interviewers
        valid_ranks = ['senior_associate', 'team_lead', 'manager', 'senior_manager']
        
        # Find HR department
        hr_department = db.query(Department).filter(
            and_(
                Department.company_id == company_id,
                Department.name.ilike('%인사%')
            )
        ).first()
        
        if not hr_department:
            raise ValueError("HR department not found")
        
        # Find users already assigned to any interview panel for this schedule (not job_post-wide)
        assigned_user_ids = db.query(InterviewPanelRequest.company_user_id).filter(
            InterviewPanelRequest.assignment_id.in_(
                db.query(InterviewPanelAssignment.id).filter(
                    InterviewPanelAssignment.schedule_id == criteria.schedule_id
                )
            )
        ).all()
        assigned_user_ids = [user_id[0] for user_id in assigned_user_ids]
        
        # Also include users who are already panel members for this schedule
        panel_member_ids = db.query(InterviewPanelMember.company_user_id).filter(
            InterviewPanelMember.assignment_id.in_(
                db.query(InterviewPanelAssignment.id).filter(
                    InterviewPanelAssignment.schedule_id == criteria.schedule_id
                )
            )
        ).all()
        panel_member_ids = [user_id[0] for user_id in panel_member_ids]
        
        # Combine all excluded user IDs (for this schedule only)
        excluded_user_ids = list(set(assigned_user_ids + panel_member_ids))
        
        # Select same department interviewers (excluding already assigned users)
        same_dept_candidates = db.query(CompanyUser).filter(
            and_(
                CompanyUser.company_id == company_id,
                CompanyUser.department_id == department_id,
                CompanyUser.ranks.in_(valid_ranks),
                CompanyUser.id != job_post.user_id,  # Exclude job post creator
                ~CompanyUser.id.in_(excluded_user_ids)  # Exclude already assigned users for this schedule
            )
        ).all()
        # 공고별 고정 시드로 셔플
        same_dept_seed = int(str(company_id) + str(department_id) + str(criteria.job_post_id))
        rng = random.Random(same_dept_seed)
        rng.shuffle(same_dept_candidates)
        # 후보가 부족하면 순환(rotate)
        if len(same_dept_candidates) < criteria.same_department_count:
            times = (criteria.same_department_count + len(same_dept_candidates) - 1) // max(1, len(same_dept_candidates))
            same_dept_candidates = (same_dept_candidates * times)[:criteria.same_department_count]
        else:
            same_dept_candidates = same_dept_candidates[:criteria.same_department_count]

        # Select HR department interviewers (excluding already assigned users)
        hr_candidates = db.query(CompanyUser).filter(
            and_(
                CompanyUser.company_id == company_id,
                CompanyUser.department_id == hr_department.id,
                CompanyUser.ranks.in_(valid_ranks),
                ~CompanyUser.id.in_(excluded_user_ids)  # Exclude already assigned users for this schedule
            )
        ).all()
        hr_seed = int(str(company_id) + str(hr_department.id) + str(criteria.job_post_id))
        rng_hr = random.Random(hr_seed)
        rng_hr.shuffle(hr_candidates)
        if len(hr_candidates) < criteria.hr_department_count:
            times = (criteria.hr_department_count + len(hr_candidates) - 1) // max(1, len(hr_candidates))
            hr_candidates = (hr_candidates * times)[:criteria.hr_department_count]
        else:
            hr_candidates = hr_candidates[:criteria.hr_department_count]

        return {
            'same_department': same_dept_candidates,
            'hr_department': hr_candidates,
            'job_post': job_post,
            'hr_department_info': hr_department
        }
    
    @staticmethod
    def create_panel_assignments(db: Session, criteria: InterviewerSelectionCriteria) -> List[InterviewPanelAssignment]:
        """Create panel assignments and send notifications to selected interviewers"""
        
        # Select interviewers
        selection_result = InterviewPanelService.select_interviewers(db, criteria)
        
        assignments = []
        
        # Create assignment for same department interviewers
        if selection_result['same_department']:
            same_dept_assignment = InterviewPanelAssignment(
                job_post_id=criteria.job_post_id,
                schedule_id=criteria.schedule_id,
                assignment_type=AssignmentType.SAME_DEPARTMENT,
                required_count=len(selection_result['same_department'])
            )
            db.add(same_dept_assignment)
            db.flush()  # Get the ID
            
            # Create requests for each interviewer
            for interviewer in selection_result['same_department']:
                notification = InterviewPanelService._create_notification(
                    db, interviewer, criteria.job_post_id, "SAME_DEPARTMENT"
                )
                
                request = InterviewPanelRequest(
                    assignment_id=same_dept_assignment.id,
                    company_user_id=interviewer.id,
                    notification_id=notification.id if notification else None
                )
                db.add(request)
            
            assignments.append(same_dept_assignment)
        
        # Create assignment for HR department interviewers
        if selection_result['hr_department']:
            hr_assignment = InterviewPanelAssignment(
                job_post_id=criteria.job_post_id,
                schedule_id=criteria.schedule_id,
                assignment_type=AssignmentType.HR_DEPARTMENT,
                required_count=len(selection_result['hr_department'])
            )
            db.add(hr_assignment)
            db.flush()  # Get the ID
            
            # Create requests for each interviewer
            for interviewer in selection_result['hr_department']:
                notification = InterviewPanelService._create_notification(
                    db, interviewer, criteria.job_post_id, "HR_DEPARTMENT"
                )
                
                request = InterviewPanelRequest(
                    assignment_id=hr_assignment.id,
                    company_user_id=interviewer.id,
                    notification_id=notification.id if notification else None
                )
                db.add(request)
            
            assignments.append(hr_assignment)
        
        db.commit()
        return assignments
    
    @staticmethod
    def _create_notification(db: Session, interviewer: CompanyUser, job_post_id: int, assignment_type: str) -> Optional[Notification]:
        """Create notification for interviewer"""
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        if not job_post:
            return None
        
        dept_type = "같은 부서" if assignment_type == "SAME_DEPARTMENT" else "인사팀"
        message = f"[면접관 요청] {job_post.title} 공고의 면접관으로 선정되었습니다. ({dept_type})"
        
        notification = Notification(
            message=message,
            user_id=interviewer.id,
            type="INTERVIEW_PANEL_REQUEST",
            is_read=False
        )
        db.add(notification)
        db.flush()
        return notification
    
    @staticmethod
    def respond_to_request(db: Session, request_id: int, response: InterviewerResponse) -> dict:
        """Handle interviewer response (accept/reject)"""
        
        request = db.query(InterviewPanelRequest).filter(InterviewPanelRequest.id == request_id).first()
        if not request:
            raise ValueError("Interview panel request not found")
        
        if request.status != RequestStatus.PENDING:
            raise ValueError("Request has already been responded to")
        
        # Update request status
        request.status = response.status
        request.response_at = datetime.utcnow()
        
        if response.status == RequestStatus.ACCEPTED:
            # Add to panel members
            member = InterviewPanelMember(
                assignment_id=request.assignment_id,
                company_user_id=request.company_user_id,
                role=PanelRole.INTERVIEWER
            )
            db.add(member)
            
            # Check if assignment is complete
            InterviewPanelService._check_assignment_completion(db, request.assignment_id)
            
        elif response.status == RequestStatus.REJECTED:
            # Find replacement interviewer
            InterviewPanelService._find_replacement(db, request)
        
        db.commit()
        
        return {
            "request_id": request_id,
            "status": response.status,
            "message": "Response processed successfully"
        }
    
    @staticmethod
    def _check_assignment_completion(db: Session, assignment_id: int):
        """Check if assignment has enough accepted members"""
        assignment = db.query(InterviewPanelAssignment).filter(
            InterviewPanelAssignment.id == assignment_id
        ).first()
        
        if not assignment:
            return
        
        accepted_count = db.query(InterviewPanelMember).filter(
            InterviewPanelMember.assignment_id == assignment_id
        ).count()
        
        if accepted_count >= assignment.required_count:
            assignment.status = AssignmentStatus.COMPLETED
    
    @staticmethod
    def _find_replacement(db: Session, rejected_request: InterviewPanelRequest):
        """Find replacement interviewer for rejected request"""
        assignment = db.query(InterviewPanelAssignment).filter(
            InterviewPanelAssignment.id == rejected_request.assignment_id
        ).first()
        
        if not assignment:
            return
        
        job_post = db.query(JobPost).filter(JobPost.id == assignment.job_post_id).first()
        if not job_post:
            return
        
        # Get company and valid ranks
        company_id = job_post.company_id
        valid_ranks = ['senior_associate', 'team_lead', 'manager', 'senior_manager']
        
        # Find already requested users to exclude them
        requested_user_ids = db.query(InterviewPanelRequest.company_user_id).filter(
            InterviewPanelRequest.assignment_id == assignment.id
        ).all()
        requested_user_ids = [user_id[0] for user_id in requested_user_ids]
        
        if assignment.assignment_type == AssignmentType.SAME_DEPARTMENT:
            # Find replacement from same department
            replacement = db.query(CompanyUser).filter(
                and_(
                    CompanyUser.company_id == company_id,
                    CompanyUser.department_id == job_post.department_id,
                    CompanyUser.ranks.in_(valid_ranks),
                    CompanyUser.id != job_post.user_id,
                    ~CompanyUser.id.in_(requested_user_ids)
                )
            ).first()
        else:
            # Find replacement from HR department
            hr_department = db.query(Department).filter(
                and_(
                    Department.company_id == company_id,
                    Department.name.ilike('%인사%')
                )
            ).first()
            
            if not hr_department:
                return
            
            replacement = db.query(CompanyUser).filter(
                and_(
                    CompanyUser.company_id == company_id,
                    CompanyUser.department_id == hr_department.id,
                    CompanyUser.ranks.in_(valid_ranks),
                    ~CompanyUser.id.in_(requested_user_ids)
                )
            ).first()
        
        if replacement:
            # Create new request for replacement
            notification = InterviewPanelService._create_notification(
                db, replacement, assignment.job_post_id, assignment.assignment_type.value
            )
            
            new_request = InterviewPanelRequest(
                assignment_id=assignment.id,
                company_user_id=replacement.id,
                notification_id=notification.id if notification else None
            )
            db.add(new_request)
    
    @staticmethod
    def get_user_pending_requests(db: Session, user_id: int) -> List[dict]:
        """Get pending interview panel requests for a user"""
        requests = db.query(InterviewPanelRequest).filter(
            and_(
                InterviewPanelRequest.company_user_id == user_id,
                InterviewPanelRequest.status == RequestStatus.PENDING
            )
        ).all()
        
        result = []
        for request in requests:
            assignment = db.query(InterviewPanelAssignment).filter(
                InterviewPanelAssignment.id == request.assignment_id
            ).first()
            
            if assignment:
                job_post = db.query(JobPost).filter(JobPost.id == assignment.job_post_id).first()
                schedule = db.query(Schedule).filter(Schedule.id == assignment.schedule_id).first()
                
                result.append({
                    "request_id": request.id,
                    "job_post_title": job_post.title if job_post else "Unknown",
                    "schedule_date": schedule.scheduled_at if schedule else None,
                    "assignment_type": assignment.assignment_type.value,
                    "created_at": request.created_at
                })
        
        return result
    
    @staticmethod
    def get_panel_members(db: Session, job_post_id: int) -> List[dict]:
        """Get all panel members for a job post"""
        from app.models.interview_panel import InterviewPanelAssignment, InterviewPanelMember
        
        assignments = db.query(InterviewPanelAssignment).filter(
            InterviewPanelAssignment.job_post_id == job_post_id
        ).all()
        
        members = []
        for assignment in assignments:
            assignment_members = db.query(InterviewPanelMember).filter(
                InterviewPanelMember.assignment_id == assignment.id
            ).all()
            
            for member in assignment_members:
                company_user = db.query(CompanyUser).filter(CompanyUser.id == member.company_user_id).first()
                if company_user:
                    members.append({
                        "member_id": member.id,
                        "user_id": company_user.id,
                        "user_name": company_user.name,
                        "user_email": company_user.email,
                        "user_ranks": company_user.ranks,
                        "role": member.role.value,
                        "assignment_type": assignment.assignment_type.value,
                        "assigned_at": member.assigned_at
                    })
        
        return members

    @staticmethod
    def get_user_response_history(db: Session, user_id: int) -> List[dict]:
        """Get user's response history for interview panel requests"""
        from app.models.interview_panel import InterviewPanelAssignment, InterviewPanelRequest
        from app.models.job import JobPost
        from app.models.schedule import Schedule
        
        # Get all requests that the user has responded to (not pending)
        requests = db.query(InterviewPanelRequest).filter(
            and_(
                InterviewPanelRequest.company_user_id == user_id,
                InterviewPanelRequest.status != RequestStatus.PENDING
            )
        ).all()
        
        history = []
        for request in requests:
            # Get assignment info
            assignment = db.query(InterviewPanelAssignment).filter(
                InterviewPanelAssignment.id == request.assignment_id
            ).first()
            
            if assignment:
                # Get job post info
                job_post = db.query(JobPost).filter(JobPost.id == assignment.job_post_id).first()
                
                # Get schedule info
                schedule = db.query(Schedule).filter(Schedule.id == assignment.schedule_id).first()
                
                history.append({
                    "request_id": request.id,
                    "job_post_title": job_post.title if job_post else "Unknown",
                    "schedule_date": schedule.scheduled_at if schedule else None,
                    "assignment_type": assignment.assignment_type.value,
                    "status": request.status.value,
                    "created_at": request.created_at,
                    "responded_at": request.response_at
                })
        
        # Sort by responded_at (most recent first)
        history.sort(key=lambda x: x["responded_at"], reverse=True)
        
        return history 