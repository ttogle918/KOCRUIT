from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.core.database import get_db
from app.schemas.application import (
    ApplicationCreate, ApplicationUpdate, ApplicationDetail, 
    ApplicationList
)
from app.models.application import Application, ApplyStatus, ApplicationStatus
from app.models.user import User
from app.api.v1.auth import get_current_user
from app.models.resume import Resume, Spec
from app.models.user import User
from app.models.applicant_user import ApplicantUser
import re
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.application import Application
from app.models.user import User
from app.models.schedule import ScheduleInterview
from sqlalchemy import Table, MetaData, select

router = APIRouter()


@router.get("/", response_model=List[ApplicationList])
def get_applications(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    applications = db.query(Application).offset(skip).limit(limit).all()
    return applications


@router.get("/{application_id}", response_model=ApplicationDetail)
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # joinedload를 사용하여 관계 데이터를 한 번에 가져오기
    application = (
        db.query(Application)
        .options(
            joinedload(Application.user),
            joinedload(Application.resume).joinedload(Resume.specs)
        )
        .filter(Application.id == application_id)
        .first()
    )
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Spec 데이터 분류 (의미적으로 유사한 것들을 그룹화)
    educations = []
    awards = []
    certificates = []
    skills = []
    experiences = []  # activities + project_experience를 통합
    
    if application.resume and application.resume.specs:
        for spec in application.resume.specs:
            spec_type = str(spec.spec_type)
            spec_title = str(spec.spec_title)
            spec_description = spec.spec_description or ""
            
            if spec_type == "education":
                if spec_title == "institution":
                    education = {
                        "period": "",
                        "schoolName": spec_description,
                        "major": "",
                        "graduated": False,
                        "degree": "",
                        "gpa": "",
                        "duration": ""
                    }
                    educations.append(education)
                elif spec_title == "start_date":
                    if educations:
                        educations[-1]["startDate"] = spec_description
                elif spec_title == "end_date":
                    if educations:
                        educations[-1]["endDate"] = spec_description
                elif spec_title == "degree":
                    if educations:
                        educations[-1]["degree"] = spec_description
                        # major/degree 파싱 추가
                        degree_raw = spec_description or ""
                        school_name = educations[-1]["schoolName"] or ""
                        import re
                        if "고등학교" in school_name:
                            educations[-1]["major"] = ""
                            educations[-1]["degree"] = ""
                        elif "대학교" in school_name or "대학" in school_name:
                            if degree_raw:
                                m = re.match(r"(.+?)\((.+?)\)", degree_raw)
                                if m:
                                    educations[-1]["major"] = m.group(1).strip() if m.group(1) else degree_raw.strip()
                                    educations[-1]["degree"] = m.group(2).strip() if m.group(2) else ""
                                else:
                                    educations[-1]["major"] = degree_raw.strip()
                                    educations[-1]["degree"] = ""
                            else:
                                educations[-1]["major"] = ""
                                educations[-1]["degree"] = ""
                        else:
                            educations[-1]["major"] = ""
                            educations[-1]["degree"] = ""
                elif spec_title == "gpa":
                    if educations:
                        educations[-1]["gpa"] = spec_description
                elif spec_title == "duration":
                    if educations:
                        educations[-1]["duration"] = spec_description
            
            elif spec_type == "awards":
                if spec_title == "title":
                    award = {
                        "title": spec_description,
                        "date": "",
                        "description": "",
                        "duration": ""
                    }
                    awards.append(award)
                elif spec_title == "date":
                    if awards:
                        awards[-1]["date"] = spec_description
                elif spec_title == "description":
                    if awards:
                        awards[-1]["description"] = spec_description
                elif spec_title == "duration":
                    if awards:
                        awards[-1]["duration"] = spec_description
            
            elif spec_type == "certifications":
                if spec_title == "name":
                    certificate = {
                        "name": spec_description,
                        "date": "",
                        "duration": ""
                    }
                    certificates.append(certificate)
                elif spec_title == "date":
                    if certificates:
                        certificates[-1]["date"] = spec_description
                elif spec_title == "duration":
                    if certificates:
                        certificates[-1]["duration"] = spec_description
            
            elif spec_type == "skills":
                skills.append(spec_description)
            
            elif spec_type == "activities":
                if spec_title == "organization":
                    experience = {
                        "type": "activity",
                        "organization": spec_description,
                        "role": "",
                        "period": "",
                        "description": "",
                        "duration": ""
                    }
                    experiences.append(experience)
                elif spec_title == "role":
                    if experiences and experiences[-1]["type"] == "activity":
                        experiences[-1]["role"] = spec_description
                elif spec_title == "period":
                    if experiences and experiences[-1]["type"] == "activity":
                        experiences[-1]["period"] = spec_description
                elif spec_title == "description":
                    if experiences and experiences[-1]["type"] == "activity":
                        experiences[-1]["description"] = spec_description
                elif spec_title == "duration":
                    if experiences and experiences[-1]["type"] == "activity":
                        experiences[-1]["duration"] = spec_description
            
            elif spec_type == "project_experience":
                if spec_title == "title":
                    experience = {
                        "type": "project",
                        "title": spec_description,
                        "role": "",
                        "duration": "",
                        "technologies": "",
                        "description": ""
                    }
                    experiences.append(experience)
                elif spec_title == "role":
                    if experiences and experiences[-1]["type"] == "project":
                        experiences[-1]["role"] = spec_description
                elif spec_title == "duration":
                    if experiences and experiences[-1]["type"] == "project":
                        experiences[-1]["duration"] = spec_description
                elif spec_title == "technologies":
                    if experiences and experiences[-1]["type"] == "project":
                        experiences[-1]["technologies"] = spec_description
                elif spec_title == "description":
                    if experiences and experiences[-1]["type"] == "project":
                        experiences[-1]["description"] = spec_description
    
    # 응답 데이터 구성
    response_data = {
        "id": application.id,
        "user_id": application.user_id,
        "resume_id": application.resume_id,
        "job_post_id": application.job_post_id,
        "score": application.score,
        "ai_score": application.ai_score,
        "human_score": application.human_score,
        "final_score": application.final_score,
        "status": application.status,
        "applied_at": application.applied_at,
        "application_source": application.application_source,
        "pass_reason": application.pass_reason,
        "fail_reason": application.fail_reason,
        "created_at": None,
        "updated_at": None,
        # 이력서 정보 추가
        "applicantName": application.user.name if application.user else "",
        "gender": application.user.gender if application.user else "",
        "birthDate": str(application.user.birth_date) if application.user and application.user.birth_date else None,
        "email": application.user.email if application.user else "",
        "address": application.user.address if application.user else "",
        "phone": application.user.phone if application.user else "",
        "educations": educations,  # Spec 테이블에서 가져오기
        "awards": awards,      # Spec 테이블에서 가져오기
        "certificates": certificates, # Spec 테이블에서 가져오기
        "skills": skills,      # Spec 테이블에서 가져오기
        "experiences": experiences, # activities + project_experience 통합
        "content": application.resume.content if application.resume else ""
    }
    
    print(f"API 응답 데이터: {response_data}")
    print(f"User 정보: {application.user.name if application.user else 'None'}")
    print(f"Resume 정보: {application.resume.content[:50] if application.resume and application.resume.content is not None else 'None'}")
    print(f"Spec 개수: {len(application.resume.specs) if application.resume else 0}")
    print(f"Education 개수: {len(educations)}")
    print(f"Awards 개수: {len(awards)}")
    print(f"Certificates 개수: {len(certificates)}")
    
    return response_data


@router.post("/", response_model=ApplicationDetail)
def create_application(
    application: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_application = Application(
        **application.dict(),
        user_id=current_user.id
    )
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application


@router.put("/{application_id}/status")
def update_application_status(
    application_id: int,
    status_update: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if status_update.status:
        application.status = status_update.status.value 
    if status_update.document_status:
        application.document_status = status_update.document_status.value
    db.commit()
    return {"message": "Application status updated successfully"}


@router.get("/job/{job_post_id}/applicants")
def get_applicants_by_job(
    job_post_id: int,
    db: Session = Depends(get_db)
):
    # joinedload를 사용하여 관계 데이터를 한 번에 가져오기
    applications = (
        db.query(Application)
        .options(
            joinedload(Application.user),
            joinedload(Application.resume).joinedload(Resume.specs)
        )
        .filter(Application.job_post_id == job_post_id)
        .all()
    )
    
    applicants = []
    for app in applications:
        # ApplicantUser 확인
        is_applicant = db.query(ApplicantUser).filter(ApplicantUser.id == app.user_id).first()
        if not is_applicant:
            continue
        if not app.user:
            continue
        # 학력 정보 추출: resume.specs에서 추출
        education = None
        degree = None  # 추가: degree 정보
        major = None   # 추가: major 정보
        certificates = []  # 자격증 정보 추가
        if app.resume and app.resume.specs:
            edu_specs = [
                s for s in app.resume.specs 
                if s.spec_type == "education" and s.spec_title == "institution"
            ]
            if edu_specs:
                education = edu_specs[0].spec_description  # 최신 학교명만 추출
            # degree 정보 추출 및 major/degree 분리
            degree_specs = [
                s for s in app.resume.specs
                if s.spec_type == "education" and s.spec_title == "degree"
            ]
            major = None
            degree = None
            if degree_specs:
                degree_raw = degree_specs[0].spec_description or ""
                school_name = education or ""
                import re
                print("degree_raw:", degree_raw)
                print("school_name:", school_name)
                if "고등학교" in school_name:
                    major = ""
                    degree = ""
                elif "대학교" in school_name or "대학" in school_name:
                    if degree_raw:
                        m = re.match(r"(.+?)\((.+?)\)", degree_raw)
                        print("정규식 매칭 결과:", m)
                        if m:
                            major = m.group(1).strip() if m.group(1) else degree_raw.strip()
                            degree = m.group(2).strip() if m.group(2) else ""
                        else:
                            major = degree_raw.strip()
                            degree = ""
                    else:
                        major = ""
                        degree = ""
                else:
                    major = ""
                    degree = ""
            else:
                major = ""
                degree = ""
            print(f"최종 major: {major}, degree: {degree}")
            # 자격증 정보 추출
            cert_name_specs = [
                s for s in app.resume.specs
                if s.spec_type == "certifications" and s.spec_title == "name"
            ]
            for cert in cert_name_specs:
                # date, duration 정보도 spec에서 찾아서 매칭
                if cert.spec_description:  # null/빈 문자열 제외
                    cert_date = next((s.spec_description for s in app.resume.specs if s.spec_type == "certifications" and s.spec_title == "date"), "")
                    cert_duration = next((s.spec_description for s in app.resume.specs if s.spec_type == "certifications" and s.spec_title == "duration"), "")
                    certificates.append({
                        "name": cert.spec_description,
                        "date": cert_date,
                        "duration": cert_duration
                    })
        applicant_data = {
            "id": app.user.id,
            "name": app.user.name,
            "email": app.user.email,
            "application_id": app.id,
            "status": app.status,
            "applied_at": app.applied_at,
            "score": app.score,
            "birthDate": app.user.birth_date.isoformat() if app.user.birth_date else None,
            "gender": app.user.gender if app.user.gender else None,
            "education": education,
            "degree": degree_specs[0].spec_description if degree_specs else None,  # 기존 전체 degree
            "major": major,   # 전공
            "degree_type": degree,  # 학위(석사/박사 등)
            "resume_id": app.resume_id,  # ← 이 줄 추가!
            "address": app.user.address if app.user.address else None,  # address 필드 추가
            "certificates": certificates  # 자격증 배열 추가
        }
        applicants.append(applicant_data)
    return applicants

@router.get("/job/{job_post_id}/applicants-with-interview")
def get_applicants_with_interview(job_post_id: int, db: Session = Depends(get_db)):
    meta = MetaData()
    schedule_interview_applicant = Table('schedule_interview_applicant', meta, autoload_with=db.bind)
    applicants = db.query(Application).filter(Application.job_post_id == job_post_id).all()
    result = []
    for app in applicants:
        sia_row = db.execute(
            select(
                schedule_interview_applicant.c.schedule_interview_id
            ).where(schedule_interview_applicant.c.user_id == app.user_id)
        ).first()
        schedule_interview_id = None
        schedule_date = None
        if sia_row:
            schedule_interview_id = sia_row[0]
            si = db.query(ScheduleInterview).filter(ScheduleInterview.id == schedule_interview_id).first()
            if si:
                schedule_date = si.schedule_date
        user = db.query(User).filter(User.id == app.user_id).first()
        result.append({
            "applicant_id": app.user_id,
            "name": user.name if user else "",
            "schedule_interview_id": schedule_interview_id,
            "schedule_date": schedule_date,
        })
    return result