from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from app.core.database import get_db
from app.models.v2.auth.user import User
from app.api.v2.auth.auth import get_current_user
from app.services.v2.interview.interview_panel_service import InterviewPanelService
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


@router.get("/my-response-history/", response_model=List[dict])
def get_my_response_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's response history for interview panel requests (accepted/rejected)
    """
    try:
        history = InterviewPanelService.get_user_response_history(db, current_user.id)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get response history: {str(e)}")


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
    from app.models.v2.interview_panel import InterviewPanelAssignment, InterviewPanelRequest, InterviewPanelMember
    from app.models.v2.recruitment.job import JobPost
    from app.models.v2.document.schedule import Schedule
    
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
    from app.models.v2.interview_panel import InterviewPanelAssignment, InterviewPanelRequest, InterviewPanelMember
    from app.models.v2.auth.user import CompanyUser
    from app.models.v2.recruitment.job import JobPost
    from app.models.v2.document.schedule import Schedule
    
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
    from app.models.v2.interview_panel import InterviewPanelAssignment, AssignmentStatus
    
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


@router.get("/assignment/{assignment_id}/matching-details/", response_model=dict)
def get_assignment_matching_details(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get matching details for a specific assignment including balance scores and reasoning
    """
    from app.models.v2.interview_panel import InterviewPanelAssignment, InterviewPanelRequest, InterviewPanelMember
    from app.models.v2.auth.user import CompanyUser
    from app.services.v2.interviewer_profile_service import InterviewerProfileService
    import statistics
    
    try:
        assignment = db.query(InterviewPanelAssignment).filter(
            InterviewPanelAssignment.id == assignment_id
        ).first()
        
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Get all accepted members for this assignment
        members = db.query(InterviewPanelMember).filter(
            InterviewPanelMember.assignment_id == assignment_id
        ).all()
        
        if not members:
            return {
                "assignment_id": assignment_id,
                "matching_info": {
                    "algorithm_used": "NONE",
                    "balance_score": 0.0,
                    "balance_factors": {},
                    "individual_profiles": {},
                    "team_composition_reason": "아직 확정된 면접관이 없습니다",
                    "ai_recommendation_available": False
                }
            }
        
        # Get interviewer profiles
        matching_info = {
            "algorithm_used": "HISTORICAL_DATA",
            "balance_score": 0.0,
            "balance_factors": {},
            "individual_profiles": {},
            "team_composition_reason": "",
            "ai_recommendation_available": True
        }
        
        # Collect individual profiles
        interviewer_ids = [member.company_user_id for member in members]
        strictness_scores = []
        tech_scores = []
        experience_scores = []
        consistency_scores = []
        
        for member in members:
            company_user = db.query(CompanyUser).filter(CompanyUser.id == member.company_user_id).first()
            if company_user:
                try:
                    profile_info = InterviewerProfileService.get_interviewer_characteristics(db, member.company_user_id)
                    matching_info['individual_profiles'][str(member.company_user_id)] = {
                        'user_name': company_user.name,
                        'user_email': company_user.email,
                        'strictness_score': profile_info.get('strictness_score', 50),
                        'consistency_score': profile_info.get('consistency_score', 50),
                        'tech_focus_score': profile_info.get('tech_focus_score', 50),
                        'personality_focus_score': profile_info.get('personality_focus_score', 50),
                        'experience_score': profile_info.get('experience_score', 50),
                        'confidence': profile_info.get('confidence', 0),
                        'characteristics': profile_info.get('characteristics', [])
                    }
                    
                    strictness_scores.append(profile_info.get('strictness_score', 50))
                    tech_scores.append(profile_info.get('tech_focus_score', 50))
                    experience_scores.append(profile_info.get('experience_score', 50))
                    consistency_scores.append(profile_info.get('consistency_score', 50))
                except:
                    # Fallback to default values
                    matching_info['individual_profiles'][str(member.company_user_id)] = {
                        'user_name': company_user.name,
                        'user_email': company_user.email,
                        'strictness_score': 50,
                        'consistency_score': 50,
                        'tech_focus_score': 50,
                        'personality_focus_score': 50,
                        'experience_score': 50,
                        'confidence': 0,
                        'characteristics': ['신규 면접관']
                    }
                    
                    strictness_scores.append(50)
                    tech_scores.append(50)
                    experience_scores.append(50)
                    consistency_scores.append(50)
        
        # Calculate balance factors
        if len(strictness_scores) > 1:
            matching_info['balance_factors'] = {
                'strictness_balance': round(100 - statistics.variance(strictness_scores), 1),
                'tech_coverage': round(max(tech_scores), 1),
                'experience_avg': round(statistics.mean(experience_scores), 1),
                'consistency_avg': round(statistics.mean(consistency_scores), 1)
            }
            
            # Calculate overall balance score
            balance_factors = matching_info['balance_factors']
            matching_info['balance_score'] = round(
                (balance_factors['strictness_balance'] * 0.3 + 
                 balance_factors['tech_coverage'] * 0.3 + 
                 balance_factors['experience_avg'] * 0.2 + 
                 balance_factors['consistency_avg'] * 0.2), 2
            )
            
            # Generate team composition reason
            avg_strictness = statistics.mean(strictness_scores)
            avg_tech = statistics.mean(tech_scores)
            avg_experience = statistics.mean(experience_scores)
            
            if avg_strictness > 70:
                strictness_desc = "높은 엄격도"
            elif avg_strictness < 30:
                strictness_desc = "관대한 평가"
            else:
                strictness_desc = "균형잡힌 엄격도"
            
            if avg_tech > 70:
                tech_desc = "기술 중심"
            elif avg_tech < 30:
                tech_desc = "인성 중심"
            else:
                tech_desc = "기술-인성 균형"
            
            if avg_experience > 70:
                experience_desc = "풍부한 경험"
            elif avg_experience < 30:
                experience_desc = "신규 면접관"
            else:
                experience_desc = "적절한 경험"
            
            matching_info['team_composition_reason'] = f"{strictness_desc}, {tech_desc}, {experience_desc}의 조합"
        else:
            matching_info['balance_factors'] = {
                'strictness_balance': 100.0,
                'tech_coverage': tech_scores[0] if tech_scores else 50,
                'experience_avg': experience_scores[0] if experience_scores else 50,
                'consistency_avg': consistency_scores[0] if consistency_scores else 50
            }
            matching_info['balance_score'] = 75.0
            matching_info['team_composition_reason'] = "단일 면접관"
        
        return {
            "assignment_id": assignment_id,
            "assignment_type": assignment.assignment_type.value,
            "total_members": len(members),
            "matching_info": matching_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get matching details: {str(e)}")


@router.get("/interviewer-profile/{user_id}/", response_model=dict)
def get_interviewer_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed profile information for a specific interviewer
    """
    from app.models.v2.auth.user import CompanyUser
    from app.services.v2.interviewer_profile_service import InterviewerProfileService
    
    try:
        company_user = db.query(CompanyUser).filter(CompanyUser.id == user_id).first()
        if not company_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        profile_info = InterviewerProfileService.get_interviewer_characteristics(db, user_id)
        
        return {
            "user_id": user_id,
            "user_name": company_user.name,
            "user_email": company_user.email,
            "user_ranks": company_user.ranks,
            "profile": {
                "strictness_score": profile_info.get('strictness_score', 50),
                "consistency_score": profile_info.get('consistency_score', 50),
                "tech_focus_score": profile_info.get('tech_focus_score', 50),
                "personality_focus_score": profile_info.get('personality_focus_score', 50),
                "experience_score": profile_info.get('experience_score', 50),
                "confidence": profile_info.get('confidence', 0),
                "total_interviews": profile_info.get('total_interviews', 0),
                "characteristics": profile_info.get('characteristics', []),
                "summary": profile_info.get('summary', '프로필 정보가 부족합니다')
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get interviewer profile: {str(e)}")


@router.post("/request/{request_id}/cancel/", response_model=dict)
def cancel_interview_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancel a specific interview panel request
    """
    from app.models.v2.interview_panel import InterviewPanelRequest, RequestStatus
    
    try:
        request = db.query(InterviewPanelRequest).filter(
            InterviewPanelRequest.id == request_id
        ).first()
        
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        if request.status != RequestStatus.PENDING:
            raise HTTPException(status_code=400, detail="Can only cancel pending requests")
        
        # Remove the request
        db.delete(request)
        db.commit()
        
        return {"message": "Request cancelled successfully", "request_id": request_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel request: {str(e)}")


@router.post("/assignment/{assignment_id}/invite/", response_model=dict)
def invite_interviewer_to_assignment(
    assignment_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Invite a specific user to an interview panel assignment
    """
    from app.models.v2.interview_panel import InterviewPanelAssignment, InterviewPanelRequest, RequestStatus
    from app.models.v2.auth.user import CompanyUser
    from app.models.v2.common.notification import Notification
    
    try:
        assignment = db.query(InterviewPanelAssignment).filter(
            InterviewPanelAssignment.id == assignment_id
        ).first()
        
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        company_user = db.query(CompanyUser).filter(CompanyUser.id == user_id).first()
        if not company_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if already invited
        existing_request = db.query(InterviewPanelRequest).filter(
            InterviewPanelRequest.assignment_id == assignment_id,
            InterviewPanelRequest.company_user_id == user_id
        ).first()
        
        if existing_request:
            raise HTTPException(status_code=400, detail="User already invited to this assignment")
        
        # Create notification
        notification = Notification(
            message=f"[면접관 요청] 면접관으로 초대되었습니다. ({assignment.assignment_type.value})",
            user_id=user_id,
            type="INTERVIEW_PANEL_REQUEST",
            is_read=False
        )
        db.add(notification)
        db.flush()
        
        # Create request
        request = InterviewPanelRequest(
            assignment_id=assignment_id,
            company_user_id=user_id,
            notification_id=notification.id,
            status=RequestStatus.PENDING
        )
        db.add(request)
        db.commit()
        
        return {
            "message": "Invitation sent successfully",
            "request_id": request.id,
            "user_name": company_user.name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to invite interviewer: {str(e)}")


@router.get("/company/{company_id}/members/search/", response_model=List[dict])
def search_company_members(
    company_id: int,
    q: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search company members for interviewer invitation
    """
    from app.models.v2.auth.user import CompanyUser
    from app.models.v2.auth.company import Department
    
    try:
        query = db.query(CompanyUser).filter(CompanyUser.company_id == company_id)
        
        if q:
            query = query.filter(
                (CompanyUser.name.ilike(f"%{q}%")) |
                (CompanyUser.email.ilike(f"%{q}%"))
            )
        
        # Only include users with valid ranks for interviewers
        valid_ranks = ['senior_associate', 'team_lead', 'manager', 'senior_manager']
        query = query.filter(CompanyUser.ranks.in_(valid_ranks))
        
        members = query.limit(20).all()
        
        result = []
        for member in members:
            department = db.query(Department).filter(Department.id == member.department_id).first()
            result.append({
                "id": member.id,
                "name": member.name,
                "email": member.email,
                "ranks": member.ranks,
                "department": department.name if department else None,
                "department_id": member.department_id
            })
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search company members: {str(e)}")


@router.get("/my-interview-schedules/", response_model=List[dict])
def get_my_interview_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get interview schedules for the current logged-in user
    현재 로그인된 유저의 면접 일정을 가져옵니다.
    """
    try:
        from app.models.v2.interview_panel import InterviewPanelMember, InterviewPanelAssignment
        from app.models.v2.document.schedule import Schedule
        from app.models.v2.recruitment.job import JobPost
        from app.models.v2.auth.user import CompanyUser
        from app.models.v2.document.application import Application
        from sqlalchemy import and_
        
        # 현재 유저가 면접관으로 배정된 일정들을 조회
        schedules_query = db.query(
            Schedule.id.label('schedule_id'),
            Schedule.title.label('job_title'),
            Schedule.scheduled_at,
            Schedule.location,
            JobPost.title.label('position'),
            JobPost.id.label('job_post_id')
        ).join(
            InterviewPanelAssignment, Schedule.id == InterviewPanelAssignment.schedule_id
        ).join(
            InterviewPanelMember, InterviewPanelAssignment.id == InterviewPanelMember.assignment_id
        ).join(
            JobPost, Schedule.job_post_id == JobPost.id
        ).filter(
            InterviewPanelMember.company_user_id == current_user.id
        ).order_by(Schedule.scheduled_at)
        
        schedules = schedules_query.all()
        
        result = []
        for schedule in schedules:
            # 해당 면접 일정에 배정된 지원자들 조회
            # schedule_interview_applicant 테이블을 통해 지원자 정보 가져오기
            applicants_query = db.execute(text("""
                SELECT DISTINCT 
                    u.name as applicant_name,
                    a.id as application_id
                FROM schedule_interview_applicant sia
                JOIN application a ON sia.user_id = a.user_id 
                JOIN users u ON a.user_id = u.id
                JOIN schedule_interview si ON sia.schedule_interview_id = si.id
                WHERE si.schedule_id = :schedule_id
                AND a.job_post_id = :job_post_id
                AND sia.interview_status = 'SCHEDULED'
            """), {
                'schedule_id': schedule.schedule_id,
                'job_post_id': schedule.job_post_id
            })
            
            applicants = applicants_query.fetchall()
            applicant_names = [applicant.applicant_name for applicant in applicants] if applicants else []
            
            result.append({
                'id': schedule.schedule_id,
                'title': schedule.job_title or schedule.position,
                'position': schedule.position,
                'scheduled_at': schedule.scheduled_at.isoformat() if schedule.scheduled_at else None,
                'location': schedule.location,
                'job_post_id': schedule.job_post_id,
                'applicants': applicant_names,
                'applicant_count': len(applicant_names)
            })
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get interview schedules: {str(e)}") 


@router.get("/my-interview-schedules-test/", response_model=List[dict])
def get_my_interview_schedules_test(
    db: Session = Depends(get_db)
):
    """
    임시 테스트용 엔드포인트 - 인증 없이 면접 일정 조회
    """
    try:
        from app.models.v2.interview_panel import InterviewPanelMember, InterviewPanelAssignment
        from app.models.v2.document.schedule import Schedule
        from app.models.v2.recruitment.job import JobPost
        from app.models.v2.auth.user import CompanyUser
        from app.models.v2.document.application import Application
        from sqlalchemy import and_
        
        # 모든 면접 일정 조회 (테스트용)
        schedules_query = db.query(
            Schedule.id.label('schedule_id'),
            Schedule.title.label('job_title'),
            Schedule.scheduled_at,
            Schedule.location,
            JobPost.title.label('position'),
            JobPost.id.label('job_post_id')
        ).join(
            JobPost, Schedule.job_post_id == JobPost.id
        ).filter(
            Schedule.schedule_type == 'interview'
        ).order_by(Schedule.scheduled_at)
        
        schedules = schedules_query.all()
        
        result = []
        for schedule in schedules:
            result.append({
                'id': schedule.schedule_id,
                'title': schedule.job_title or schedule.position,
                'position': schedule.position,
                'scheduled_at': schedule.scheduled_at.isoformat() if schedule.scheduled_at else None,
                'location': schedule.location,
                'job_post_id': schedule.job_post_id,
                'applicants': [],  # 테스트용으로 빈 배열
                'applicant_count': 0
            })
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get interview schedules: {str(e)}") 