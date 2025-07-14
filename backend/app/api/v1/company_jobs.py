from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import json
from datetime import datetime
from app.core.database import get_db
from app.schemas.job import JobPostCreate, JobPostUpdate, JobPostDetail, JobPostList, InterviewScheduleCreate, InterviewScheduleDetail
from app.models.job import JobPost, JobPostRole
from app.models.schedule import Schedule
from app.models.weight import Weight
from app.models.user import User, CompanyUser
from app.models.company import Department
from app.models.application import Application
from app.models.interview_panel import InterviewPanelAssignment
from app.api.v1.auth import get_current_user

router = APIRouter()

# 기업 공고 API 접근 가능 권한: ADMIN, MEMBER, MANAGER, EMPLOYEE (USER는 불가)
ALLOWED_COMPANY_ROLES = ["ADMIN", "MEMBER", "MANAGER", "EMPLOYEE"]

def check_company_role(current_user: User):
    """기업 회원 권한 체크"""
    if current_user.role not in ALLOWED_COMPANY_ROLES:
        raise HTTPException(status_code=403, detail="기업 회원만 접근 가능합니다")

@router.get("/", response_model=List[JobPostList])
def get_company_job_posts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 기업 사용자만 접근 가능
    check_company_role(current_user)
    
    job_posts = db.query(JobPost).filter(JobPost.company_id == current_user.company_id).offset(skip).limit(limit).all()
    
    # Add company name to each job post
    for job_post in job_posts:
        if job_post.company:
            job_post.companyName = job_post.company.name
    
    return job_posts


@router.get("/{job_post_id}", response_model=JobPostDetail)
def get_company_job_post(
    job_post_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 기업 사용자만 접근 가능
    check_company_role(current_user)
    
    job_post = db.query(JobPost).filter(
        JobPost.id == job_post_id,
        JobPost.company_id == current_user.company_id
    ).first()
    
    if not job_post:
        raise HTTPException(status_code=404, detail="Job post not found")
    
    # Add company name to the response
    if job_post.company:
        job_post.companyName = job_post.company.name
    
    # 팀 멤버 데이터를 jobpost_role 테이블에서 조회
    jobpost_roles = db.query(JobPostRole).filter(JobPostRole.jobpost_id == job_post.id).all()
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
    
    job_post.teamMembers = team_members
    
    # 가중치 데이터를 weight 테이블에서 조회
    weights = db.query(Weight).filter(Weight.jobpost_id == job_post.id).all()
    job_post.weights = [
        {"item": weight.field_name, "score": weight.weight_value}
        for weight in weights
    ]
    
    # 면접 일정 조회 - Schedule 테이블에서 interview 타입으로 조회
    interview_schedules = db.query(Schedule).filter(
        Schedule.job_post_id == job_post.id,
        Schedule.schedule_type == "interview"
    ).all()
    job_post.interview_schedules = interview_schedules
    
    # 부서 정보 추가
    if job_post.department_id:
        department = db.query(Department).filter(Department.id == job_post.department_id).first()
        if department:
            job_post.department = department.name
    
    return job_post


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
    
    db_job_post = JobPost(**job_data, company_id=current_user.company_id)
    db.add(db_job_post)
    db.commit()
    db.refresh(db_job_post)
    
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
                    # YYYY-MM-DD HH:MM 형식으로 합치기
                    datetime_str = f"{interview_date} {interview_time}:00"
                    scheduled_at = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    # 기본값으로 현재 시간 사용
                    scheduled_at = datetime.utcnow()
            else:
                scheduled_at = datetime.utcnow()
            
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
            if member.email and member.role:
                # 이메일로 CompanyUser 찾기
                company_user = db.query(CompanyUser).filter(
                    CompanyUser.email == member.email,
                    CompanyUser.company_id == current_user.company_id
                ).first()
                
                if company_user:
                    # 역할 매핑 (관리자 -> MANAGER, 멤버 -> MEMBER)
                    role_mapping = {
                        '관리자': 'MANAGER',
                        '멤버': 'MEMBER'
                    }
                    mapped_role = role_mapping.get(member.role, 'MEMBER')
                    
                    # jobpost_role 생성
                    jobpost_role = JobPostRole(
                        jobpost_id=db_job_post.id,  # 새로 생성된 job post의 ID 사용
                        company_user_id=company_user.id,
                        role=mapped_role
                    )
                    db.add(jobpost_role)
        
        db.commit()
        
        # 팀 멤버에게 알림 발송
        try:
            from app.services.notification_service import NotificationService
            
            # 공고 작성자 제외하고 팀 멤버에게 알림 발송
            NotificationService.create_team_member_notifications(
                db=db,
                job_post=db_job_post,
                team_members=team_members_data,
                creator_user_id=current_user.id,
                is_update=False
            )
            print(f"팀 멤버 알림 발송 완료: {len(team_members_data)}명")
        except Exception as e:
            print(f"팀 멤버 알림 발송 실패: {str(e)}")
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
    
    for field, value in job_data.items():
        setattr(db_job_post, field, value)
    
    db.commit()
    db.refresh(db_job_post)
    
    # 팀 멤버 역할을 jobpost_role 테이블에 업데이트
    if team_members_data is not None:
        # 기존 팀 멤버 정보 저장 (알림 처리용)
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
        
        # 기존 팀 멤버 역할 삭제
        db.query(JobPostRole).filter(JobPostRole.jobpost_id == job_post_id).delete()
        
        # 새로운 팀 멤버 역할 추가
        new_team_members = []
        if team_members_data:
            for member in team_members_data:
                if member.email and member.role:
                    # 이메일로 CompanyUser 찾기
                    company_user = db.query(CompanyUser).filter(
                        CompanyUser.email == member.email,
                        CompanyUser.company_id == current_user.company_id
                    ).first()
                    
                    if company_user:
                        # 역할 매핑 (관리자 -> MANAGER, 멤버 -> MEMBER)
                        role_mapping = {
                            '관리자': 'MANAGER',
                            '멤버': 'MEMBER'
                        }
                        mapped_role = role_mapping.get(member.role, 'MEMBER')
                        
                        # jobpost_role 생성
                        jobpost_role = JobPostRole(
                            jobpost_id=job_post_id,
                            company_user_id=company_user.id,
                            role=mapped_role
                        )
                        db.add(jobpost_role)
                        new_team_members.append(member)
        
        db.commit()
        
        # 팀 멤버 변경사항에 따른 알림 처리
        try:
            from app.services.notification_service import NotificationService
            
            # 새로 추가된 팀 멤버에게 알림 발송
            if new_team_members:
                NotificationService.create_team_member_notifications(
                    db=db,
                    job_post=db_job_post,
                    team_members=new_team_members,
                    creator_user_id=current_user.id,
                    is_update=True
                )
                print(f"팀 멤버 알림 발송 완료: {len(new_team_members)}명")
            
            # 제거된 팀 멤버의 알림 삭제
            removed_emails = [email for email in existing_emails if email not in [m['email'] for m in new_team_members]]
            if removed_emails:
                removed_count = NotificationService.remove_team_member_notifications(
                    db=db,
                    job_post_id=job_post_id,
                    removed_member_emails=removed_emails
                )
                print(f"제거된 팀 멤버 알림 삭제 완료: {removed_count}개")
                
        except Exception as e:
            print(f"팀 멤버 알림 처리 실패: {str(e)}")
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
        # 기존 면접관 배정 및 관련 데이터 삭제 (순서 중요)
        try:
            from app.models.interview_panel import InterviewPanelAssignment, InterviewPanelRequest, InterviewPanelMember
            
            # 1. 면접관 배정 관련 데이터 삭제 (CASCADE로 자동 삭제됨)
            db.query(InterviewPanelAssignment).filter(
                InterviewPanelAssignment.job_post_id == job_post_id
            ).delete()
        except Exception as e:
            print(f"면접관 배정 데이터 삭제 실패: {str(e)}")
        
        # 2. interview_evaluation_item 테이블 데이터 삭제 (interview_evaluation 참조)
        try:
            from app.models.interview_evaluation import InterviewEvaluationItem, InterviewEvaluation
            from app.models.schedule import ScheduleInterview
            evaluation_items = db.query(InterviewEvaluationItem).filter(
                InterviewEvaluationItem.evaluation_id.in_(
                    db.query(InterviewEvaluation.id).filter(
                        InterviewEvaluation.interview_id.in_(
                            db.query(ScheduleInterview.id).filter(
                                ScheduleInterview.schedule_id.in_(
                                    db.query(Schedule.id).filter(
                                        Schedule.job_post_id == job_post_id,
                                        Schedule.schedule_type == "interview"
                                    )
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
                                        db.query(Schedule.id).filter(
                                            Schedule.job_post_id == job_post_id,
                                            Schedule.schedule_type == "interview"
                                        )
                                    )
                                )
                            )
                        )
                    )
                ).delete()
                print(f"Deleted {len(evaluation_items)} evaluation items for job post {job_post_id}")
        except Exception as e:
            print(f"Evaluation items deletion failed: {e}")
        
        # 3. evaluation_detail 테이블 데이터 삭제 (interview_evaluation 참조)
        try:
            from app.models.interview_evaluation import EvaluationDetail, InterviewEvaluation
            from app.models.schedule import ScheduleInterview
            evaluation_details = db.query(EvaluationDetail).filter(
                EvaluationDetail.evaluation_id.in_(
                    db.query(InterviewEvaluation.id).filter(
                        InterviewEvaluation.interview_id.in_(
                            db.query(ScheduleInterview.id).filter(
                                ScheduleInterview.schedule_id.in_(
                                    db.query(Schedule.id).filter(
                                        Schedule.job_post_id == job_post_id,
                                        Schedule.schedule_type == "interview"
                                    )
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
                                        db.query(Schedule.id).filter(
                                            Schedule.job_post_id == job_post_id,
                                            Schedule.schedule_type == "interview"
                                        )
                                    )
                                )
                            )
                        )
                    )
                ).delete()
                print(f"Deleted {len(evaluation_details)} evaluation details for job post {job_post_id}")
        except Exception as e:
            print(f"Evaluation details deletion failed: {e}")
        
        # 4. interview_evaluation 테이블 데이터 삭제 (schedule_interview 참조)
        try:
            from app.models.interview_evaluation import InterviewEvaluation
            interview_evaluations = db.query(InterviewEvaluation).filter(
                InterviewEvaluation.interview_id.in_(
                    db.query(ScheduleInterview.id).filter(
                        ScheduleInterview.schedule_id.in_(
                            db.query(Schedule.id).filter(
                                Schedule.job_post_id == job_post_id,
                                Schedule.schedule_type == "interview"
                            )
                        )
                    )
                )
            ).all()
            if interview_evaluations:
                db.query(InterviewEvaluation).filter(
                    InterviewEvaluation.interview_id.in_(
                        db.query(ScheduleInterview.id).filter(
                            ScheduleInterview.schedule_id.in_(
                                db.query(Schedule.id).filter(
                                    Schedule.job_post_id == job_post_id,
                                    Schedule.schedule_type == "interview"
                                )
                            )
                        )
                    )
                ).delete()
                print(f"Deleted {len(interview_evaluations)} interview evaluations for job post {job_post_id}")
        except Exception as e:
            print(f"Interview evaluations deletion failed: {e}")
        
        # 4. schedule_interview 테이블 데이터 삭제
        try:
            from app.models.schedule import ScheduleInterview
            db.query(ScheduleInterview).filter(
                ScheduleInterview.schedule_id.in_(
                    db.query(Schedule.id).filter(
                        Schedule.job_post_id == job_post_id,
                        Schedule.schedule_type == "interview"
                    )
                )
            ).delete()
        except Exception as e:
            print(f"schedule_interview 데이터 삭제 실패: {str(e)}")
        
        # 5. 기존 면접 일정 삭제
        db.query(Schedule).filter(Schedule.job_post_id == job_post_id, Schedule.schedule_type == "interview").delete()
        
        # 새로운 면접 일정 추가
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
                    except ValueError:
                        scheduled_at = datetime.utcnow()
                else:
                    scheduled_at = datetime.utcnow()
                
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
                from app.models.schedule import ScheduleInterview, InterviewStatus
                schedule_interview = ScheduleInterview(
                    schedule_id=interview_schedule.id,
                    user_id=current_user.id,
                    schedule_date=scheduled_at,
                    status=InterviewStatus.SCHEDULED
                )
                db.add(schedule_interview)
                db.flush()
        
        db.commit()
        
        # 면접관 자동 배정 (업데이트 시)
        try:
            from app.services.interview_panel_service import InterviewPanelService
            from app.schemas.interview_panel import InterviewerSelectionCriteria
            
            # 새로운 면접관 배정 (기존 배정은 유지, 중복 체크는 서비스에서 처리)
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
        print(f"Successfully deleted job post {job_post_id}")
        return {"message": "Job post deleted successfully"}
        
    except Exception as e:
        db.rollback()
        print(f"Error deleting job post {job_post_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete job post and related data")