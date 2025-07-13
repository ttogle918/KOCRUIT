from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
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
    
    # JSON 데이터를 파싱하여 응답에 추가
    if job_post.team_members:
        job_post.teamMembers = json.loads(job_post.team_members)
    else:
        job_post.teamMembers = []
    
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
    
    # JSON 데이터 처리 및 필드명 매핑
    if job_data.get('teamMembers'):
        job_data['team_members'] = json.dumps(job_data['teamMembers']) if job_data['teamMembers'] else None
    else:
        job_data['team_members'] = None
    
    # weights 데이터를 별도로 저장 (JSON 필드에는 저장하지 않음)
    weights_data = job_data.pop('weights', [])
    
    # JobPost 모델에 전달할 데이터에서 camelCase 필드 제거
    job_data.pop('teamMembers', None)
    
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
        db.commit()
    
    # 가중치 데이터를 weight 테이블에 저장
    if weights_data:
        for weight_item in weights_data:
            if weight_item.get('item') and weight_item.get('score') is not None:
                weight_record = Weight(
                    target_type='resume_feature',
                    jobpost_id=db_job_post.id,
                    field_name=weight_item['item'],
                    weight_value=float(weight_item['score'])
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
                        jobpost_id=db_job_post.id,
                        company_user_id=company_user.id,
                        role=mapped_role
                    )
                    db.add(jobpost_role)
        
                db.commit()
    
    # 팀 멤버 역할을 jobpost_role 테이블에 저장 (생성 시에는 기존 데이터 삭제 불필요)
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
    
    # JSON 데이터 처리 및 필드명 매핑
    if job_data.get('teamMembers'):
        job_data['team_members'] = json.dumps(job_data['teamMembers']) if job_data['teamMembers'] else None
    else:
        job_data['team_members'] = None
    
    # weights 데이터를 별도로 저장 (JSON 필드에는 저장하지 않음)
    weights_data = job_data.pop('weights', None)
    
    # JobPost 모델에 전달할 데이터에서 camelCase 필드 제거
    job_data.pop('teamMembers', None)
    
    for field, value in job_data.items():
        setattr(db_job_post, field, value)
    
    db.commit()
    db.refresh(db_job_post)
    
    # 가중치 데이터를 weight 테이블에 업데이트
    if weights_data is not None:
        # 기존 가중치 삭제
        db.query(Weight).filter(Weight.jobpost_id == job_post_id).delete()
        
        # 새로운 가중치 생성
        for weight_item in weights_data:
            if weight_item.get('item') and weight_item.get('score') is not None:
                weight_record = Weight(
                    target_type='resume_feature',
                    jobpost_id=job_post_id,
                    field_name=weight_item['item'],
                    weight_value=float(weight_item['score'])
                )
                db.add(weight_record)
        db.commit()
    
    # 면접 일정 업데이트 (기존 일정 삭제 후 새로 생성)
    if interview_schedules is not None:
        # 기존 면접 일정 삭제
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
        db.commit()
    
    # Add company name to the response
    if db_job_post.company:
        db_job_post.companyName = db_job_post.company.name
    
    # Add department name to the response
    if db_job_post.department_id:
        department = db.query(Department).filter(Department.id == db_job_post.department_id).first()
        if department:
            db_job_post.department = department.name
    
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
    
    db.delete(db_job_post)
    db.commit()
    return {"message": "Job post deleted successfully"}