from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from typing import List
import json
import logging
import time
from datetime import datetime
from app.core.database import get_db
from app.core.cache import cache_result, invalidate_cache, CACHE_KEYS
from app.schemas.job import JobPostCreate, JobPostUpdate, JobPostDetail, JobPostList, InterviewScheduleCreate, InterviewScheduleDetail
from app.models.job import JobPost, JobPostRole
from app.models.schedule import Schedule
from app.models.weight import Weight
from app.models.auth.user import User, CompanyUser
from app.models.company import Department
from app.models.application import Application
from app.models.interview_panel import InterviewPanelAssignment
from app.api.v2.auth.auth import get_current_user
from app.utils.job_status_utils import determine_job_status
from app.models.application import OverallStatus, StageStatus, StageName
from app.models.schedule import ScheduleInterview

from pytz import timezone
KST = timezone('Asia/Seoul')

# 로깅 설정
logger = logging.getLogger(__name__)

router = APIRouter()

# 기업 공고 API 접근 가능 권한: ADMIN, MEMBER, MANAGER, EMPLOYEE (USER는 불가)
ALLOWED_COMPANY_ROLES = ["ADMIN", "MEMBER", "MANAGER", "EMPLOYEE"]

def check_company_role(current_user: User):
    """기업 회원 권한 체크"""
    if current_user.role not in ALLOWED_COMPANY_ROLES:
        raise HTTPException(status_code=403, detail="기업 회원만 접근 가능합니다")

@router.get("/", response_model=List[JobPostList])
@cache_result(expire_time=1800, key_prefix="company_job_posts")  # 30분 캐싱
def get_company_job_posts(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 기업 사용자만 접근 가능
        check_company_role(current_user)
        
        query = db.query(JobPost).filter(JobPost.company_id == current_user.company_id)
        
        # 상태별 필터링
        if status:
            if status.upper() in ["SCHEDULED", "RECRUITING", "SELECTING", "CLOSED"]:
                query = query.filter(JobPost.status == status.upper())
            else:
                raise HTTPException(status_code=400, detail="Invalid status. Use SCHEDULED, RECRUITING, SELECTING, or CLOSED")
        
        # 성능 최적화: joinedload 적용
        job_posts = query.options(
            joinedload(JobPost.company)
        ).offset(skip).limit(limit).all()
        
        # Add company name to each job post
        for job_post in job_posts:
            if job_post.company:
                job_post.companyName = job_post.company.name
        
        return job_posts
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get company job posts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve job posts. Please try again later."
        )


@router.get("/{job_post_id}", response_model=JobPostDetail)
@cache_result(expire_time=300, key_prefix="company_job_post_detail")  # 5분 캐싱 (매우 빠른 반응)
def get_company_job_post(
    job_post_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 기업 사용자만 접근 가능
    check_company_role(current_user)
    
    # 성능 최적화: joinedload 적용
    job_post = db.query(JobPost).options(
        joinedload(JobPost.company)
    ).filter(
        JobPost.id == job_post_id,
        JobPost.company_id == current_user.company_id
    ).first()
    
    if not job_post:
        raise HTTPException(status_code=404, detail="Job post not found")
    
    # Add company name to the response
    if job_post.company:
        job_post.companyName = job_post.company.name
    
    # 성능 최적화: 한 번에 모든 관련 데이터 조회
    job_post_id = job_post.id
    
    # 팀 멤버 데이터를 JOIN으로 한 번에 조회
    team_members_query = db.query(JobPostRole, CompanyUser).join(
        CompanyUser, JobPostRole.company_user_id == CompanyUser.id
    ).filter(JobPostRole.jobpost_id == job_post_id).all()
    
    team_members = []
    for jobpost_role, company_user in team_members_query:
        role_mapping = {
            'MANAGER': '관리자',
            'MEMBER': '멤버'
        }
        mapped_role = role_mapping.get(jobpost_role.role, jobpost_role.role)
        team_members.append({
            "email": company_user.email,
            "role": mapped_role
        })
    
    # 가중치 데이터를 한 번에 조회
    weights = db.query(Weight).filter(Weight.jobpost_id == job_post_id).all()
    weights_list = [
        {"item": weight.field_name, "score": weight.weight_value}
        for weight in weights
    ]
    
    # 면접 일정을 한 번에 조회
    interview_schedules = db.query(Schedule).filter(
        Schedule.job_post_id == job_post_id,
        Schedule.schedule_type == "interview"
    ).all()
    
    # 부서 정보를 한 번에 조회 (JOIN으로 최적화)
    department_name = None
    if job_post.department_id:
        department = db.query(Department).filter(Department.id == job_post.department_id).first()
        if department:
            department_name = department.name
    
    # Pydantic 응답 모델을 위해 department 이름을 별도로 설정
    job_post_dict = {
        "id": job_post.id,
        "company_id": job_post.company_id,
        "department_id": job_post.department_id,
        "title": job_post.title,
        "department": department_name,  # 문자열로 설정
        "qualifications": job_post.qualifications,
        "conditions": job_post.conditions,
        "job_details": job_post.job_details,
        "procedures": job_post.procedures,
        "headcount": job_post.headcount,
        "start_date": job_post.start_date,
        "end_date": job_post.end_date,
        "location": job_post.location,
        "employment_type": job_post.employment_type,
        "deadline": job_post.deadline,
        "status": job_post.status,
        "companyName": job_post.company.name if job_post.company else None,
        "interviewReportDone": job_post.interview_report_done,
        "finalReportDone": job_post.final_report_done,
        "created_at": job_post.created_at,
        "updated_at": job_post.updated_at,
        "teamMembers": team_members,
        "weights": weights_list,
        "interview_schedules": interview_schedules,
        "applications": [
            {
                "id": app.id,
                "status": app.status.value if app.status else None,
                "document_status": app.document_status.value if app.document_status else None,
                "ai_interview_status": app.ai_interview_status.value if app.ai_interview_status else None,
                        "practical_interview_status": app.practical_interview_status.value if app.practical_interview_status else None,
        "executive_interview_status": app.executive_interview_status.value if app.executive_interview_status else None,
                "final_status": app.final_status.value if app.final_status else None,
                "ai_interview_video_url": app.ai_interview_video_url
            }
            for app in job_post.applications
        ] if job_post.applications else []
    }
    
    return job_post_dict


@router.get("/{job_post_id}/agent")
def get_job_post_for_agent(
    job_post_id: int, 
    db: Session = Depends(get_db)
):
    """Agent용: 인증 없이 채용공고 정보 가져오기"""
    job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
    
    if not job_post:
        raise HTTPException(status_code=404, detail="Job post not found")
    
    return {
        "id": job_post.id,
        "qualifications": job_post.qualifications or "",
        "job_details": job_post.job_details or "",
        "company_id": job_post.company_id
    }


@router.post("/", response_model=JobPostDetail, status_code=201)
def create_company_job_post(
    job_post: JobPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 기업 사용자만 접근 가능
    check_company_role(current_user)
    
    job_data = job_post.dict()
    
    # company_id 제거 (백엔드에서 설정)
    job_data.pop('company_id', None)
    
    # 면접 일정 처리
    interview_schedules = job_data.pop('interview_schedules', [])
    
    # 디버깅용 로그
    print(f"Current user: {current_user.id}, company_id: {current_user.company_id}")
    print(f"Job data: {job_data}")
    print(f"Interview schedules: {interview_schedules}")
    
    # 부서 처리 - department 테이블에 생성하고 department_id 사용
    department_name = job_data.get('department')
    department_id = None
    if department_name:
        # 기존 부서가 있는지 확인
        existing_department = db.query(Department).filter(
            Department.name == department_name,
            Department.company_id == current_user.company_id
        ).first()
        
        if existing_department:
            department_id = existing_department.id
        else:
            # 새 부서 생성
            new_department = Department(
                name=department_name,
                company_id=current_user.company_id
            )
            db.add(new_department)
            db.commit()
            db.refresh(new_department)
            department_id = new_department.id
    
    # department_id 설정
    job_data['department_id'] = department_id
    
    # team_members는 jobpost_role 테이블에 저장하므로 jobpost 테이블에는 저장하지 않음
    job_data.pop('team_members', None)
    job_data.pop('teamMembers', None)
    
    # weights 데이터를 별도로 저장 (JSON 필드에는 저장하지 않음)
    job_data.pop('weights', None)
    
    # 현재 시간 기준으로 적절한 상태 결정
    start_date = job_data.get('start_date')
    end_date = job_data.get('end_date')
    determined_status = determine_job_status(start_date, end_date)
    job_data['status'] = determined_status
    
    print(f"Job post status determined: {determined_status} (start_date: {start_date}, end_date: {end_date})")
    
    db_job_post = JobPost(**job_data, company_id=current_user.company_id)
    db.add(db_job_post)
    db.commit()
    db.refresh(db_job_post)
    
    # 캐시 무효화: 새로운 채용공고가 추가되었으므로 목록 캐시 무효화
    try:
        company_cache_pattern = f"cache:company_job_posts:*company_id_{current_user.company_id}*"
        public_cache_pattern = "cache:job_posts:*"
        invalidate_cache(company_cache_pattern)
        invalidate_cache(public_cache_pattern)
        logger.info(f"Cache invalidated after creating job post {db_job_post.id}")
    except Exception as e:
        logger.warning(f"Failed to invalidate cache: {e}")
    
    # 면접 일정 저장 - Schedule 테이블에 저장
    if interview_schedules:
        for schedule_data in interview_schedules:
            # 날짜와 시간을 합쳐서 scheduled_at으로 저장
            if isinstance(schedule_data, dict):
                interview_date = schedule_data.get('interview_date')
                interview_time = schedule_data.get('interview_time')
                location = schedule_data.get('location')
            else:
                interview_date = schedule_data.interview_date
                interview_time = schedule_data.interview_time
                location = schedule_data.location
            # 날짜와 시간을 합쳐서 datetime 객체 생성
            if interview_date and interview_time:
                try:
                    datetime_str = f"{interview_date} {interview_time}:00"
                    scheduled_at = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S")
                    scheduled_at = KST.localize(scheduled_at)
                except ValueError:
                    scheduled_at = datetime.now(KST)
            else:
                scheduled_at = datetime.now(KST)
            # Schedule 테이블에 저장
            interview_schedule = Schedule(
                schedule_type="interview",
                user_id=current_user.id,  # 공고를 올린 사용자
                job_post_id=db_job_post.id,
                title=db_job_post.title,  # 공고 제목
                description="",  # 비워둠
                location=location,
                scheduled_at=scheduled_at,
                status=""  # 비워둠
            )
            db.add(interview_schedule)
            db.flush()  # Get the ID for interview panel assignment
        
        db.commit()
        
        # 면접관 자동 배정
        try:
            from app.services.interview_panel_service import InterviewPanelService
            from app.schemas.interview_panel import InterviewerSelectionCriteria
            
            # 면접 일정이 있는 경우에만 면접관 배정
            if interview_schedules:
                for schedule_data in interview_schedules:
                    # 해당 schedule 찾기
                    if isinstance(schedule_data, dict):
                        interview_date = schedule_data.get('interview_date')
                        interview_time = schedule_data.get('interview_time')
                    else:
                        interview_date = schedule_data.interview_date
                        interview_time = schedule_data.interview_time
                    
                    if interview_date and interview_time:
                        datetime_str = f"{interview_date} {interview_time}:00"
                        scheduled_at = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S")
                        
                        # 해당 schedule 찾기
                        schedule = db.query(Schedule).filter(
                            Schedule.job_post_id == db_job_post.id,
                            Schedule.scheduled_at == scheduled_at
                        ).first()
                        
                        if schedule:
                            criteria = InterviewerSelectionCriteria(
                                job_post_id=db_job_post.id,
                                schedule_id=schedule.id,
                                same_department_count=2,
                                hr_department_count=1
                            )
                            InterviewPanelService.create_panel_assignments(db, criteria)
        except Exception as e:
            print(f"면접관 자동 배정 실패: {str(e)}")
            # 면접관 배정 실패는 공고 생성에 영향을 주지 않도록 함
    
    # 가중치 데이터를 weight 테이블에 저장
    weights_data = job_post.weights
    if weights_data:
        for weight_item in weights_data:
            if weight_item.item and weight_item.score is not None:
                weight_record = Weight(
                    target_type='resume_feature',
                    jobpost_id=db_job_post.id,
                    field_name=weight_item.item,
                    weight_value=float(weight_item.score)
                )
                db.add(weight_record)
        db.commit()
    
    # 팀 멤버 역할을 jobpost_role 테이블에 저장
    team_members_data = job_post.teamMembers
    if team_members_data:
        for member in team_members_data:
            # Support both dict and Pydantic object
            if (hasattr(member, 'email') and hasattr(member, 'role')):
                email = getattr(member, 'email', None)
                role = getattr(member, 'role', None)
            else:
                email = member.get('email') if isinstance(member, dict) else None
                role = member.get('role') if isinstance(member, dict) else None
            if email and role:
                company_user = db.query(CompanyUser).filter(
                    CompanyUser.email == email,
                    CompanyUser.company_id == current_user.company_id
                ).first()
                if company_user:
                    role_mapping = {
                        '관리자': 'MANAGER',
                        '멤버': 'MEMBER'
                    }
                    mapped_role = role_mapping.get(role, 'MEMBER')
                    jobpost_role = JobPostRole(
                        jobpost_id=db_job_post.id,
                        company_user_id=company_user.id,
                        role=mapped_role
                    )
                    db.add(jobpost_role)
        db.commit()
        # 팀 멤버에게 알림 발송 (공고 생성 시 모든 멤버)
        try:
            from app.services.notification_service import NotificationService
            # Patch: pass list of dicts for notification service
            notify_members = []
            for member in team_members_data:
                if (hasattr(member, 'email') and hasattr(member, 'role')):
                    notify_members.append({'email': member.email, 'role': member.role})
                elif isinstance(member, dict):
                    notify_members.append({'email': member.get('email'), 'role': member.get('role')})
            NotificationService.create_team_member_notifications(
                db=db,
                job_post=db_job_post,
                team_members=notify_members,
                creator_user_id=current_user.id,
                is_update=False
            )
            print(f"팀 멤버 알림 발송 완료: {len(notify_members)}명")
        except Exception as e:
            import traceback
            print(f"팀 멤버 알림 발송 실패: {str(e)}")
            traceback.print_exc()
            # 알림 발송 실패는 공고 생성에 영향을 주지 않도록 함
    
    # Add company name to the response
    if db_job_post.company:
        db_job_post.companyName = db_job_post.company.name
    
    # Add department name to the response
    if db_job_post.department_id:
        department = db.query(Department).filter(Department.id == db_job_post.department_id).first()
        if department:
            db_job_post.department = department.name
    
    return db_job_post


@router.put("/{job_post_id}", response_model=JobPostDetail)
def update_company_job_post(
    job_post_id: int,
    job_post: JobPostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 기업 사용자만 접근 가능
    check_company_role(current_user)
    
    db_job_post = db.query(JobPost).filter(
        JobPost.id == job_post_id,
        JobPost.company_id == current_user.company_id
    ).first()
    
    if not db_job_post:
        raise HTTPException(status_code=404, detail="Job post not found")
    
    job_data = job_post.dict(exclude_unset=True)
    
    # 면접 일정 처리
    interview_schedules = job_data.pop('interview_schedules', None)
    
    # 부서 처리 - department 테이블에 생성하고 department_id 사용
    department_name = job_data.get('department')
    department_id = None
    if department_name:
        # 기존 부서가 있는지 확인
        existing_department = db.query(Department).filter(
            Department.name == department_name,
            Department.company_id == current_user.company_id
        ).first()
        
        if existing_department:
            department_id = existing_department.id
        else:
            # 새 부서 생성
            new_department = Department(
                name=department_name,
                company_id=current_user.company_id
            )
            db.add(new_department)
            db.commit()
            db.refresh(new_department)
            department_id = new_department.id
    
    # department_id 설정
    job_data['department_id'] = department_id
    
    # team_members는 jobpost_role 테이블에 저장하므로 jobpost 테이블에는 저장하지 않음
    team_members_data = job_data.pop('teamMembers', None)
    job_data.pop('team_members', None)
    
    # weights 데이터를 별도로 저장 (JSON 필드에는 저장하지 않음)
    job_data.pop('weights', None)
    
    # 면접 일정이 변경되었는지 확인
    dates_changed = False
    if 'start_date' in job_data or 'end_date' in job_data:
        dates_changed = True
    
    for field, value in job_data.items():
        setattr(db_job_post, field, value)
    
    # 면접 일정이 변경되었으면 상태 재확인
    if dates_changed:
        start_date = db_job_post.start_date
        end_date = db_job_post.end_date
        new_status = determine_job_status(start_date, end_date)
        
        # 현재 상태보다 높은 우선순위인 경우에만 업데이트
        from app.utils.job_status_utils import should_update_status
        if should_update_status(db_job_post.status, new_status):
            db_job_post.status = new_status
            print(f"Job post status updated: {db_job_post.status} -> {new_status} (start_date: {start_date}, end_date: {end_date})")
    
    db.commit()
    db.refresh(db_job_post)
    
    # 캐시 무효화: 채용공고가 수정되었으므로 관련 캐시 무효화
    try:
        company_cache_pattern = f"cache:company_job_posts:*company_id_{current_user.company_id}*"
        detail_cache_pattern = f"cache:company_job_post_detail:*job_post_id_{job_post_id}*"
        public_cache_pattern = "cache:job_posts:*"
        public_detail_cache_pattern = f"cache:job_post_detail:*job_post_id_{job_post_id}*"
        
        invalidate_cache(company_cache_pattern)
        invalidate_cache(detail_cache_pattern)
        invalidate_cache(public_cache_pattern)
        invalidate_cache(public_detail_cache_pattern)
        logger.info(f"Cache invalidated after updating job post {job_post_id}")
    except Exception as e:
        logger.warning(f"Failed to invalidate cache: {e}")
    
    # 팀 멤버 역할을 jobpost_role 테이블에 업데이트
    if team_members_data is not None:
        existing_team_members = db.query(JobPostRole).filter(
            JobPostRole.jobpost_id == job_post_id
        ).all()
        existing_emails = []
        for existing_member in existing_team_members:
            company_user = db.query(CompanyUser).filter(
                CompanyUser.id == existing_member.company_user_id
            ).first()
            if company_user:
                existing_emails.append(company_user.email)
        db.query(JobPostRole).filter(JobPostRole.jobpost_id == job_post_id).delete()
        new_team_members = []
        if team_members_data:
            for member in team_members_data:
                if (hasattr(member, 'email') and hasattr(member, 'role')):
                    email = getattr(member, 'email', None)
                    role = getattr(member, 'role', None)
                else:
                    email = member.get('email') if isinstance(member, dict) else None
                    role = member.get('role') if isinstance(member, dict) else None
                if email and role:
                    company_user = db.query(CompanyUser).filter(
                        CompanyUser.email == email,
                        CompanyUser.company_id == current_user.company_id
                    ).first()
                    if company_user:
                        role_mapping = {
                            '관리자': 'MANAGER',
                            '멤버': 'MEMBER'
                        }
                        mapped_role = role_mapping.get(role, 'MEMBER')
                        jobpost_role = JobPostRole(
                            jobpost_id=job_post_id,
                            company_user_id=company_user.id,
                            role=mapped_role
                        )
                        db.add(jobpost_role)
                        new_team_members.append({'email': email, 'role': role})
        db.commit()
        # 팀 멤버 변경사항에 따른 알림 처리
        try:
            from app.services.notification_service import NotificationService
            added_emails = [m['email'] for m in new_team_members if m['email'] not in existing_emails]
            added_members = [m for m in new_team_members if m['email'] in added_emails]
            if added_members:
                NotificationService.create_team_member_notifications(
                    db=db,
                    job_post=db_job_post,
                    team_members=added_members,
                    creator_user_id=current_user.id,
                    is_update=True
                )
                print(f"팀 멤버 알림 발송 완료: {len(added_members)}명")
            removed_emails = [email for email in existing_emails if email not in [m['email'] for m in new_team_members]]
            if removed_emails:
                removed_count = NotificationService.remove_team_member_notifications(
                    db=db,
                    job_post_id=job_post_id,
                    removed_member_emails=removed_emails
                )
                print(f"제거된 팀 멤버 알림 삭제 완료: {removed_count}개")
        except Exception as e:
            import traceback
            print(f"팀 멤버 알림 처리 실패: {str(e)}")
            traceback.print_exc()
            # 알림 처리 실패는 공고 수정에 영향을 주지 않도록 함
    
    # 가중치 데이터를 weight 테이블에 업데이트
    weights_data = job_post.weights
    if weights_data is not None:
        # 기존 가중치 삭제
        db.query(Weight).filter(Weight.jobpost_id == job_post_id).delete()
        
        # 새로운 가중치 생성
        for weight_item in weights_data:
            if weight_item.item and weight_item.score is not None:
                weight_record = Weight(
                    target_type='resume_feature',
                    jobpost_id=job_post_id,
                    field_name=weight_item.item,
                    weight_value=float(weight_item.score)
                )
                db.add(weight_record)
        db.commit()
    
    # 면접 일정 업데이트 (기존 일정 삭제 후 새로 생성)
    if interview_schedules is not None:
        # 1. 기존 면접 일정 조회
        existing_schedules = db.query(Schedule).filter(
            Schedule.job_post_id == job_post_id,
            Schedule.schedule_type == "interview"
        ).all()
        existing_schedule_keys = set((s.scheduled_at.strftime("%Y-%m-%d %H:%M"), s.location) for s in existing_schedules)
        new_schedule_keys = set((s.get('interview_date') + ' ' + s.get('interview_time'), s.get('location')) for s in interview_schedules)

        # 2. 삭제 대상 일정만 추출
        schedules_to_delete = [s for s in existing_schedules if (s.scheduled_at.strftime("%Y-%m-%d %H:%M"), s.location) not in new_schedule_keys]
        for schedule in schedules_to_delete:
            # 해당 일정에 연결된 assignment, request, member 등만 삭제
            from app.models.interview_panel import InterviewPanelAssignment, InterviewPanelRequest, InterviewPanelMember
            db.query(InterviewPanelMember).filter(InterviewPanelMember.assignment_id.in_(
                db.query(InterviewPanelAssignment.id).filter(InterviewPanelAssignment.schedule_id == schedule.id)
            )).delete()
            db.query(InterviewPanelRequest).filter(InterviewPanelRequest.assignment_id.in_(
                db.query(InterviewPanelAssignment.id).filter(InterviewPanelAssignment.schedule_id == schedule.id)
            )).delete()
            db.query(InterviewPanelAssignment).filter(InterviewPanelAssignment.schedule_id == schedule.id).delete()
            db.query(Schedule).filter(Schedule.id == schedule.id).delete()
        db.commit()

        # 3. 신규 일정 추가 및 배정 로직은 기존대로 유지
        if interview_schedules:
            for schedule_data in interview_schedules:
                # dict 형태로 전달된 경우 처리
                if isinstance(schedule_data, dict):
                    interview_date = schedule_data.get('interview_date')
                    interview_time = schedule_data.get('interview_time')
                    location = schedule_data.get('location')
                else:
                    interview_date = schedule_data.interview_date
                    interview_time = schedule_data.interview_time
                    location = schedule_data.location
                
                # 날짜와 시간을 합쳐서 datetime 객체 생성
                if interview_date and interview_time:
                    try:
                        datetime_str = f"{interview_date} {interview_time}:00"
                        scheduled_at = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S")
                        scheduled_at = KST.localize(scheduled_at)
                    except ValueError:
                        scheduled_at = datetime.now(KST)
                else:
                    scheduled_at = datetime.now(KST)
                
                # Schedule 테이블에 저장
                interview_schedule = Schedule(
                    schedule_type="interview",
                    user_id=current_user.id,
                    job_post_id=job_post_id,
                    title=db_job_post.title,
                    description="",
                    location=location,
                    scheduled_at=scheduled_at,
                    status=""
                )
                db.add(interview_schedule)
                db.flush()  # Get the ID for interview panel assignment

                # ScheduleInterview 테이블에도 row 생성 (주요 필드 포함)
                schedule_interview = ScheduleInterview(
                    schedule_id=interview_schedule.id,
                    user_id=current_user.id,
                    schedule_date=scheduled_at,
                    status=StageStatus.PENDING # InterviewStatus.SCHEDULED 대체
                )
                db.add(schedule_interview)
                db.flush()
        
        db.commit()
        
        # 면접관 자동 배정 (업데이트 시)
        # 부서가 변경된 경우에만 실행
        department_changed = False
        prev_department_id = db_job_post.department_id
        new_department_id = department_id
        if prev_department_id != new_department_id:
            department_changed = True

        try:
            from app.services.interview_panel_service import InterviewPanelService
            from app.schemas.interview_panel import InterviewerSelectionCriteria
            # 새로운 면접관 배정 (기존 배정은 유지, 중복 체크는 서비스에서 처리)
            if interview_schedules and department_changed:
                for schedule_data in interview_schedules:
                    # 해당 schedule 찾기
                    if isinstance(schedule_data, dict):
                        interview_date = schedule_data.get('interview_date')
                        interview_time = schedule_data.get('interview_time')
                    else:
                        interview_date = schedule_data.interview_date
                        interview_time = schedule_data.interview_time
                    
                    if interview_date and interview_time:
                        datetime_str = f"{interview_date} {interview_time}:00"
                        scheduled_at = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S")
                        
                        # 해당 schedule 찾기
                        schedule = db.query(Schedule).filter(
                            Schedule.job_post_id == job_post_id,
                            Schedule.scheduled_at == scheduled_at
                        ).first()
                        
                        if schedule:
                            # 해당 schedule에 대한 기존 배정이 있는지 확인
                            from app.models.interview_panel import InterviewPanelAssignment
                            existing_assignment = db.query(InterviewPanelAssignment).filter(
                                InterviewPanelAssignment.schedule_id == schedule.id
                            ).first()
                            
                            # 기존 배정이 없을 때만 새로 배정
                            if not existing_assignment:
                                criteria = InterviewerSelectionCriteria(
                                    job_post_id=job_post_id,
                                    schedule_id=schedule.id,
                                    same_department_count=2,
                                    hr_department_count=1
                                )
                                InterviewPanelService.create_panel_assignments(db, criteria)
        except Exception as e:
            print(f"면접관 자동 배정 실패: {str(e)}")
            # 면접관 배정 실패는 공고 수정에 영향을 주지 않도록 함
    
    # Add company name to the response
    if db_job_post.company:
        db_job_post.companyName = db_job_post.company.name
    
    # Add department name to the response
    if db_job_post.department_id:
        department = db.query(Department).filter(Department.id == db_job_post.department_id).first()
        if department:
            db_job_post.department = department.name
    
    # 팀 멤버 데이터를 jobpost_role 테이블에서 조회
    jobpost_roles = db.query(JobPostRole).filter(JobPostRole.jobpost_id == job_post_id).all()
    team_members = []
    
    for jobpost_role in jobpost_roles:
        # CompanyUser 정보 조회
        company_user = db.query(CompanyUser).filter(CompanyUser.id == jobpost_role.company_user_id).first()
        if company_user:
            # 역할 매핑 (MANAGER -> 관리자, MEMBER -> 멤버)
            role_mapping = {
                'MANAGER': '관리자',
                'MEMBER': '멤버'
            }
            mapped_role = role_mapping.get(jobpost_role.role, jobpost_role.role)
            
            team_members.append({
                "email": company_user.email,
                "role": mapped_role
            })
    
    db_job_post.teamMembers = team_members
    
    # 가중치 데이터를 weight 테이블에서 조회
    weights = db.query(Weight).filter(Weight.jobpost_id == job_post_id).all()
    db_job_post.weights = [
        {"item": weight.field_name, "score": weight.weight_value}
        for weight in weights
    ]
    
    # 면접 일정 조회 - Schedule 테이블에서 interview 타입으로 조회
    interview_schedules = db.query(Schedule).filter(
        Schedule.job_post_id == job_post_id,
        Schedule.schedule_type == "interview"
    ).all()
    db_job_post.interview_schedules = interview_schedules
    
    # 보고서 상태 필드 추가
    db_job_post.interviewReportDone = db_job_post.interview_report_done
    db_job_post.finalReportDone = db_job_post.final_report_done
    
    return db_job_post


@router.delete("/{job_post_id}")
def delete_company_job_post(
    job_post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_company_role(current_user)
    
    db_job_post = db.query(JobPost).filter(
        JobPost.id == job_post_id,
        JobPost.company_id == current_user.company_id
    ).first()
    
    if not db_job_post:
        raise HTTPException(status_code=404, detail="Job post not found")
    
    try:
        # 각 관련 테이블의 존재 여부를 확인하고 안전하게 삭제
        # 1. post_interview 테이블 삭제 (구버전 데이터 정리)
        try:
            post_interview_count = db.execute(
                text("DELETE FROM post_interview WHERE job_post_id = :job_post_id"), 
                {"job_post_id": job_post_id}
            ).rowcount
            if post_interview_count > 0:
                print(f"Deleted {post_interview_count} post_interview records for job post {job_post_id}")
        except Exception as post_interview_error:
            print(f"post_interview table not found or no records to delete: {post_interview_error}")
        
        # 2. 면접관 배정 관련 데이터 삭제 (CASCADE로 자동 삭제됨)
        try:
            from app.models.interview_panel import InterviewPanelAssignment
            interview_assignments = db.query(InterviewPanelAssignment).filter(
                InterviewPanelAssignment.job_post_id == job_post_id
            ).all()
            if interview_assignments:
                db.query(InterviewPanelAssignment).filter(
                    InterviewPanelAssignment.job_post_id == job_post_id
                ).delete()
                print(f"Deleted {len(interview_assignments)} interview panel assignments for job post {job_post_id}")
        except Exception as e:
            print(f"Interview panel assignments deletion failed: {e}")
        
        # 3. schedule_interview 테이블 데이터 삭제
        try:
            from app.models.schedule import ScheduleInterview
            schedule_interviews = db.query(ScheduleInterview).filter(
                ScheduleInterview.schedule_id.in_(
                    db.query(Schedule.id).filter(Schedule.job_post_id == job_post_id)
                )
            ).all()
            if schedule_interviews:
                db.query(ScheduleInterview).filter(
                    ScheduleInterview.schedule_id.in_(
                        db.query(Schedule.id).filter(Schedule.job_post_id == job_post_id)
                    )
                ).delete()
                print(f"Deleted {len(schedule_interviews)} schedule interviews for job post {job_post_id}")
        except Exception as e:
            print(f"Schedule interviews deletion failed: {e}")
        
        # 4. interview_evaluation_item 테이블 데이터 삭제 (interview_evaluation 참조)
        try:
            from app.models.interview_evaluation import InterviewEvaluationItem, InterviewEvaluation
            evaluation_items = db.query(InterviewEvaluationItem).filter(
                InterviewEvaluationItem.evaluation_id.in_(
                    db.query(InterviewEvaluation.id).filter(
                        InterviewEvaluation.interview_id.in_(
                            db.query(ScheduleInterview.id).filter(
                                ScheduleInterview.schedule_id.in_(
                                    db.query(Schedule.id).filter(Schedule.job_post_id == job_post_id)
                                )
                            )
                        )
                    )
                )
            ).all()
            if evaluation_items:
                db.query(InterviewEvaluationItem).filter(
                    InterviewEvaluationItem.evaluation_id.in_(
                        db.query(InterviewEvaluation.id).filter(
                            InterviewEvaluation.interview_id.in_(
                                db.query(ScheduleInterview.id).filter(
                                    ScheduleInterview.schedule_id.in_(
                                        db.query(Schedule.id).filter(Schedule.job_post_id == job_post_id)
                                    )
                                )
                            )
                        )
                    )
                ).delete()
                print(f"Deleted {len(evaluation_items)} evaluation items for job post {job_post_id}")
        except Exception as e:
            print(f"Evaluation items deletion failed: {e}")
        
        # 5. evaluation_detail 테이블 데이터 삭제 (interview_evaluation 참조)
        try:
            from app.models.interview_evaluation import EvaluationDetail, InterviewEvaluation
            evaluation_details = db.query(EvaluationDetail).filter(
                EvaluationDetail.evaluation_id.in_(
                    db.query(InterviewEvaluation.id).filter(
                        InterviewEvaluation.interview_id.in_(
                            db.query(ScheduleInterview.id).filter(
                                ScheduleInterview.schedule_id.in_(
                                    db.query(Schedule.id).filter(Schedule.job_post_id == job_post_id)
                                )
                            )
                        )
                    )
                )
            ).all()
            if evaluation_details:
                db.query(EvaluationDetail).filter(
                    EvaluationDetail.evaluation_id.in_(
                        db.query(InterviewEvaluation.id).filter(
                            InterviewEvaluation.interview_id.in_(
                                db.query(ScheduleInterview.id).filter(
                                    ScheduleInterview.schedule_id.in_(
                                        db.query(Schedule.id).filter(Schedule.job_post_id == job_post_id)
                                    )
                                )
                            )
                        )
                    )
                ).delete()
                print(f"Deleted {len(evaluation_details)} evaluation details for job post {job_post_id}")
        except Exception as e:
            print(f"Evaluation details deletion failed: {e}")
        
        # 6. interview_evaluation 테이블 데이터 삭제 (schedule_interview 참조)
        try:
            from app.models.interview_evaluation import InterviewEvaluation
            interview_evaluations = db.query(InterviewEvaluation).filter(
                InterviewEvaluation.interview_id.in_(
                    db.query(ScheduleInterview.id).filter(
                        ScheduleInterview.schedule_id.in_(
                            db.query(Schedule.id).filter(Schedule.job_post_id == job_post_id)
                        )
                    )
                )
            ).all()
            if interview_evaluations:
                # 면접관 프로필 관련 정리 (InterviewEvaluation 삭제 전에 수행)
                evaluation_ids = [ev.id for ev in interview_evaluations]
                
                # InterviewerProfileHistory에서 해당 evaluation_id를 참조하는 기록들 정리
                try:
                    from app.models.interviewer_profile import InterviewerProfileHistory
                    profile_histories = db.query(InterviewerProfileHistory).filter(
                        InterviewerProfileHistory.evaluation_id.in_(evaluation_ids)
                    ).all()
                    if profile_histories:
                        for history in profile_histories:
                            history.evaluation_id = None  # 히스토리는 보존하되 참조만 제거
                            history.change_reason = f"관련 평가 삭제됨 - {history.change_reason or ''}"
                        print(f"Updated {len(profile_histories)} profile history records to remove evaluation references")
                except Exception as e:
                    print(f"Profile history cleanup failed: {e}")
                
                # InterviewerProfile에서 latest_evaluation_id가 삭제될 evaluation을 참조하는 경우 정리
                try:
                    from app.models.interviewer_profile import InterviewerProfile
                    affected_profiles = db.query(InterviewerProfile).filter(
                        InterviewerProfile.latest_evaluation_id.in_(evaluation_ids)
                    ).all()
                    if affected_profiles:
                        for profile in affected_profiles:
                            # 해당 면접관의 다른 평가 중 가장 최근 것을 찾아서 설정
                            other_evaluation = db.query(InterviewEvaluation).filter(
                                InterviewEvaluation.evaluator_id == profile.evaluator_id,
                                ~InterviewEvaluation.id.in_(evaluation_ids)  # 삭제될 evaluation 제외
                            ).order_by(InterviewEvaluation.created_at.desc()).first()
                            
                            if other_evaluation:
                                profile.latest_evaluation_id = other_evaluation.id
                            else:
                                profile.latest_evaluation_id = None
                                print(f"Interviewer {profile.evaluator_id} has no remaining evaluations")
                        print(f"Updated {len(affected_profiles)} interviewer profiles to fix evaluation references")
                except Exception as e:
                    print(f"Profile evaluation reference cleanup failed: {e}")
                
                # 이제 InterviewEvaluation 삭제
                db.query(InterviewEvaluation).filter(
                    InterviewEvaluation.interview_id.in_(
                        db.query(ScheduleInterview.id).filter(
                            ScheduleInterview.schedule_id.in_(
                                db.query(Schedule.id).filter(Schedule.job_post_id == job_post_id)
                            )
                        )
                    )
                ).delete()
                print(f"Deleted {len(interview_evaluations)} interview evaluations for job post {job_post_id}")
        except Exception as e:
            print(f"Interview evaluations deletion failed: {e}")

        # 6-2. 면접관 프로필 완전 정리 (평가가 없는 면접관 프로필 삭제)
        try:
            from app.models.interviewer_profile import InterviewerProfile, InterviewerProfileHistory
            
            # 더 이상 평가가 없는 면접관 프로필들 찾기
            profiles_without_evaluations = db.query(InterviewerProfile).filter(
                ~db.query(InterviewEvaluation).filter(
                    InterviewEvaluation.evaluator_id == InterviewerProfile.evaluator_id
                ).exists()
            ).all()
            
            if profiles_without_evaluations:
                profile_ids = [p.id for p in profiles_without_evaluations]
                
                # 해당 프로필들의 히스토리 삭제
                deleted_histories = db.query(InterviewerProfileHistory).filter(
                    InterviewerProfileHistory.interviewer_profile_id.in_(profile_ids)
                ).delete()
                
                # 프로필 자체 삭제
                deleted_profiles = db.query(InterviewerProfile).filter(
                    InterviewerProfile.id.in_(profile_ids)
                ).delete()
                
                print(f"Cleaned up {deleted_profiles} empty interviewer profiles and {deleted_histories} related histories")
        except Exception as e:
            print(f"Empty interviewer profiles cleanup failed: {e}")
        
        # 6. 관련된 지원서(Application) 삭제
        applications = db.query(Application).filter(Application.job_post_id == job_post_id).all()
        if applications:
            db.query(Application).filter(Application.job_post_id == job_post_id).delete()
            print(f"Deleted {len(applications)} applications for job post {job_post_id}")
        
        # 7. 관련된 면접 일정(Schedule) 삭제
        schedules = db.query(Schedule).filter(Schedule.job_post_id == job_post_id).all()
        if schedules:
            db.query(Schedule).filter(Schedule.job_post_id == job_post_id).delete()
            print(f"Deleted {len(schedules)} schedules for job post {job_post_id}")
        
        # 8. 관련된 가중치(Weight) 삭제
        weights = db.query(Weight).filter(Weight.jobpost_id == job_post_id).all()
        if weights:
            db.query(Weight).filter(Weight.jobpost_id == job_post_id).delete()
            print(f"Deleted {len(weights)} weights for job post {job_post_id}")
        
        # 9. 관련된 채용공고 역할(JobPostRole) 삭제
        jobpost_roles = db.query(JobPostRole).filter(JobPostRole.jobpost_id == job_post_id).all()
        if jobpost_roles:
            db.query(JobPostRole).filter(JobPostRole.jobpost_id == job_post_id).delete()
            print(f"Deleted {len(jobpost_roles)} job post roles for job post {job_post_id}")
        
        # 10. 관련된 알림(Notification) 삭제 - 면접관 요청 알림들
        try:
            from app.models.notification import Notification
            from app.models.interview_panel import InterviewPanelRequest

            # 면접관 요청과 연결된 알림들 찾기
            interview_requests = db.query(InterviewPanelRequest).filter(
                InterviewPanelRequest.assignment_id.in_(
                    db.query(InterviewPanelAssignment.id).filter(
                        InterviewPanelAssignment.job_post_id == job_post_id
                    )
                )
            ).all()
            
            notification_ids = [req.notification_id for req in interview_requests if req.notification_id]
            
            # 면접관 요청 알림 삭제
            if notification_ids:
                deleted_notifications = db.query(Notification).filter(
                    Notification.id.in_(notification_ids)
                ).delete()
                print(f"Deleted {deleted_notifications} notifications for job post {job_post_id}")

            # 팀 편성 알림 등 job_post.title이 포함된 알림도 삭제
            if db_job_post.title:
                deleted_team_notifications = db.query(Notification).filter(
                    Notification.message.like(f"%{db_job_post.title}%")
                ).delete()
                print(f"Deleted {deleted_team_notifications} team/related notifications for job post {job_post_id}")
        except Exception as e:
            print(f"Notification deletion failed: {e}")
        
        # 11. 마지막으로 채용공고 삭제
        db.delete(db_job_post)
        
        db.commit()
        
        # 캐시 무효화: 채용공고가 삭제되었으므로 관련 캐시 무효화
        try:
            company_cache_pattern = f"cache:company_job_posts:*company_id_{current_user.company_id}*"
            detail_cache_pattern = f"cache:company_job_post_detail:*job_post_id_{job_post_id}*"
            public_cache_pattern = "cache:job_posts:*"
            public_detail_cache_pattern = f"cache:job_post_detail:*job_post_id_{job_post_id}*"
            
            invalidate_cache(company_cache_pattern)
            invalidate_cache(detail_cache_pattern)
            invalidate_cache(public_cache_pattern)
            invalidate_cache(public_detail_cache_pattern)
            logger.info(f"Cache invalidated after deleting job post {job_post_id}")
        except Exception as e:
            logger.warning(f"Failed to invalidate cache: {e}")
        
        print(f"Successfully deleted job post {job_post_id}")
        return {"message": "Job post deleted successfully"}
        
    except Exception as e:
        db.rollback()
        print(f"Error deleting job post {job_post_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete job post and related data")


@router.post("/trigger-status-update")
async def trigger_job_status_update(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """수동으로 JobPost 상태 업데이트 실행 (테스트용)"""
    check_company_role(current_user)
    
    try:
        from app.scheduler.job_status_scheduler import JobStatusScheduler
        scheduler = JobStatusScheduler()
        result = await scheduler.run_manual_update()
        return {"success": True, "result": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/cache/clear")
def clear_company_job_posts_cache(
    current_user: User = Depends(get_current_user)
):
    """기업 채용공고 관련 캐시 무효화 (관리자용)"""
    try:
        # 기업 회원 권한 체크
        check_company_role(current_user)
        
        # 해당 기업의 캐시만 무효화
        company_cache_pattern = f"cache:company_job_posts:*company_id_{current_user.company_id}*"
        detail_cache_pattern = f"cache:company_job_post_detail:*company_id_{current_user.company_id}*"
        
        invalidate_cache(company_cache_pattern)
        invalidate_cache(detail_cache_pattern)
        
        logger.info(f"Cleared cache for company {current_user.company_id}")
        return {"message": "Company job posts cache cleared successfully"}
    except Exception as e:
        logger.error(f"Failed to clear company cache: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to clear cache"
        )