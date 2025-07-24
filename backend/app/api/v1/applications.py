from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import Table, MetaData, select
from typing import List
import json
import re
from app.core.database import get_db
from app.schemas.application import (
    ApplicationCreate, ApplicationUpdate, ApplicationDetail, 
    ApplicationList
)
from app.models.application import Application, ApplyStatus, DocumentStatus, InterviewStatus
from app.models.user import User
from app.api.v1.auth import get_current_user
from app.models.resume import Resume, Spec
from app.models.applicant_user import ApplicantUser
from app.models.schedule import ScheduleInterview
from app.models.job import JobPost
from app.models.weight import Weight
from app.utils.llm_cache import redis_cache
from app.models.written_test_answer import WrittenTestAnswer
from app.schemas.written_test_answer import WrittenTestAnswerResponse
from app.services.application_evaluation_service import auto_evaluate_all_applications

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
@redis_cache(expire=300)  # 5분 캐시
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


@router.get("/{application_id}/content")
def get_application_content(
    application_id: int,
    db: Session = Depends(get_db)
):
    """Agent용: 인증 없이 자소서 내용만 가져오기"""
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
    
    return {
        "content": application.resume.content if application.resume else "",
        "application_id": application_id
    }

@router.get("/{application_id}/agent")
def get_application_for_agent(
    application_id: int,
    db: Session = Depends(get_db)
):
    """Agent용: 인증 없이 application의 기본 정보만 가져오기"""
    application = (
        db.query(Application)
        .filter(Application.id == application_id)
        .first()
    )
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {
        "id": application.id,
        "job_post_id": application.job_post_id,
        "user_id": application.user_id,
        "resume_id": application.resume_id
    }


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
    
    # 서류 상태 업데이트
    if status_update.document_status:
        application.document_status = status_update.document_status.value
        
        # 서류 상태에 따른 메인 상태 업데이트
        if status_update.document_status == DocumentStatus.PASSED:
            application.status = ApplyStatus.IN_PROGRESS.value  # 서류 합격 시 진행 중
        elif status_update.document_status == DocumentStatus.REJECTED:
            application.status = ApplyStatus.REJECTED.value  # 서류 불합격 시 최종 불합격
    
    # 메인 상태 직접 업데이트 (면접 결과 등)
    if status_update.status:
        application.status = status_update.status.value
    
    db.commit()
    
    # 캐시 무효화: 지원자 상태가 변경되었으므로 관련 캐시 무효화
    try:
        from app.utils.llm_cache import invalidate_cache
        
        # 지원자 상세 캐시 무효화
        application_cache_pattern = f"api_cache:get_application:*application_id_{application_id}*"
        invalidate_cache(application_cache_pattern)
        
        # 지원자 목록 캐시 무효화 (해당 공고의 모든 지원자 목록)
        job_post_id = application.job_post_id
        applicants_cache_pattern = f"api_cache:get_applicants_by_job:*job_post_id_{job_post_id}*"
        applicants_with_interview_cache_pattern = f"api_cache:get_applicants_with_interview:*job_post_id_{job_post_id}*"
        invalidate_cache(applicants_cache_pattern)
        invalidate_cache(applicants_with_interview_cache_pattern)
        
        print(f"Cache invalidated after updating application {application_id} status")
    except Exception as e:
        print(f"Failed to invalidate cache: {e}")
    
    return {"message": "Application status updated successfully"}





@router.post("/{application_id}/ai-evaluate")
def ai_evaluate_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """AI를 사용하여 지원자의 서류를 평가합니다. (개발/테스트용)"""
    import requests
    import json
    
    # 지원서 정보 가져오기
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # 채용공고 정보 가져오기
    job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
    if not job_post:
        raise HTTPException(status_code=404, detail="Job post not found")
    
    # 이력서 정보 가져오기
    resume = db.query(Resume).filter(Resume.id == application.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Spec 데이터 구성
    spec_data = {
        "education": {},
        "certifications": [],
        "awards": [],
        "skills": {},
        "activities": [],
        "projects": []
    }
    
    if resume.specs:
        print(f"[AI-EVALUATION] 총 {len(resume.specs)}개의 spec 데이터 발견")
        for spec in resume.specs:
            print(f"[AI-EVALUATION] Spec: type={spec.spec_type}, title={spec.spec_title}, description={spec.spec_description}")
            
            if spec.spec_type == "education":
                if spec.spec_title == "institution":
                    spec_data["education"]["university"] = spec.spec_description
                elif spec.spec_title == "major":
                    spec_data["education"]["major"] = spec.spec_description
                elif spec.spec_title == "degree":
                    spec_data["education"]["degree"] = spec.spec_description
                elif spec.spec_title == "gpa":
                    spec_data["education"]["gpa"] = float(spec.spec_description) if spec.spec_description and spec.spec_description.replace('.', '').isdigit() else 0.0
                elif spec.spec_title == "start_date":
                    spec_data["education"]["start_date"] = spec.spec_description
                elif spec.spec_title == "end_date":
                    spec_data["education"]["end_date"] = spec.spec_description
            
            elif spec.spec_type == "certifications":
                if spec.spec_title == "name":
                    spec_data["certifications"].append(spec.spec_description)
                    print(f"[AI-EVALUATION] 자격증 추가: {spec.spec_description}")
                elif spec.spec_title == "date":
                    if spec_data["certifications"]:
                        # 마지막 자격증에 날짜 정보 추가
                        spec_data["certifications"][-1] = f"{spec_data['certifications'][-1]} ({spec.spec_description})"
            
            elif spec.spec_type == "awards":
                if spec.spec_title == "title":
                    spec_data["awards"].append(spec.spec_description)
                elif spec.spec_title == "date":
                    if spec_data["awards"]:
                        spec_data["awards"][-1] = f"{spec_data['awards'][-1]} ({spec.spec_description})"
                elif spec.spec_title == "description":
                    if spec_data["awards"]:
                        spec_data["awards"][-1] = f"{spec_data['awards'][-1]} - {spec.spec_description}"
            
            elif spec.spec_type == "skills":
                if spec.spec_title == "name" or spec.spec_title == "내용":
                    if "programming_languages" not in spec_data["skills"]:
                        spec_data["skills"]["programming_languages"] = []
                    spec_data["skills"]["programming_languages"].append(spec.spec_description)
            
            elif spec.spec_type == "activities":
                if spec.spec_title == "organization":
                    activity = {"organization": spec.spec_description}
                    spec_data["activities"].append(activity)
                elif spec.spec_title == "role":
                    if spec_data["activities"]:
                        spec_data["activities"][-1]["role"] = spec.spec_description
                elif spec.spec_title == "period":
                    if spec_data["activities"]:
                        spec_data["activities"][-1]["period"] = spec.spec_description
                elif spec.spec_title == "description":
                    if spec_data["activities"]:
                        spec_data["activities"][-1]["description"] = spec.spec_description
            
            elif spec.spec_type == "project_experience":
                if spec.spec_title == "title":
                    project = {"title": spec.spec_description}
                    spec_data["projects"].append(project)
                elif spec.spec_title == "role":
                    if spec_data["projects"]:
                        spec_data["projects"][-1]["role"] = spec.spec_description
                elif spec.spec_title == "duration":
                    if spec_data["projects"]:
                        spec_data["projects"][-1]["duration"] = spec.spec_description
                elif spec.spec_title == "technologies":
                    if spec_data["projects"]:
                        spec_data["projects"][-1]["technologies"] = spec.spec_description
                elif spec.spec_title == "description":
                    if spec_data["projects"]:
                        spec_data["projects"][-1]["description"] = spec.spec_description
    else:
        print(f"[AI-EVALUATION] Spec 데이터가 없습니다.")
    
    # 모든 spec 타입이 항상 포함되도록 보장
    for key, default in [
        ("education", {}),
        ("certifications", []),
        ("awards", []),
        ("skills", {}),
        ("activities", []),
        ("projects", []),
        ("portfolio", {})
    ]:
        if key not in spec_data:
            spec_data[key] = default

    # Weight 데이터 구성
    weights = db.query(Weight).filter(
        Weight.target_type == "resume_feature",
        Weight.jobpost_id == job_post.id
    ).all()
    weight_dict = {w.field_name: w.weight_value for w in weights}

    # 이력서 데이터 구성
    resume_data = {
        "personal_info": {
            "name": application.user.name if application.user else "",
            "email": application.user.email if application.user else "",
            "phone": application.user.phone if application.user else ""
        },
        "summary": resume.content[:200] if resume.content else "",
        "work_experience": [],
        "projects": []
    }
    
    # 채용공고 내용 구성
    job_posting = f"""
    [채용공고]
    제목: {job_post.title}
    회사: {job_post.company.name if job_post.company else 'N/A'}
    직무: {job_post.department or 'N/A'}
    요구사항: {job_post.qualifications or ''}
    우대사항: {job_post.conditions or ''}
    """
    
    # AI Agent API 호출
    try:
        agent_url = "http://kocruit_agent:8001/evaluate-application/"
        payload = {
            "job_posting": job_posting,
            "spec_data": spec_data,
            "resume_data": resume_data,
            "weight_data": weight_dict
        }
        
        # 디버깅을 위한 로그 출력
        print(f"[AI-EVALUATION] Application ID: {application_id}")
        print(f"[AI-EVALUATION] Spec Data: {json.dumps(spec_data, ensure_ascii=False, indent=2)}")
        print(f"[AI-EVALUATION] Weight Data: {json.dumps(weight_dict, ensure_ascii=False, indent=2)}")
        
        response = requests.post(agent_url, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        
        # 데이터베이스 업데이트
        application.ai_score = result.get("ai_score", 0.0)
        application.pass_reason = result.get("pass_reason", "")
        application.fail_reason = result.get("fail_reason", "")
        
        # AI가 제안한 서류 상태로 업데이트
        ai_suggested_document_status = result.get("document_status", "REJECTED")
        if ai_suggested_document_status == "PASSED":
            application.document_status = DocumentStatus.PASSED.value
            application.status = ApplyStatus.IN_PROGRESS.value  # 서류 합격 시 진행 중으로 변경
        elif ai_suggested_document_status == "REJECTED":
            application.document_status = DocumentStatus.REJECTED.value
            application.status = ApplyStatus.REJECTED.value  # 서류 불합격 시 최종 불합격
        
        db.commit()
        
        return {
            "message": "AI evaluation completed successfully",
            "ai_score": application.ai_score,
            "status": application.status,
            "pass_reason": application.pass_reason,
            "fail_reason": application.fail_reason,
            "scoring_details": result.get("scoring_details", {}),
            "confidence": result.get("confidence", 0.0)
        }
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"AI Agent API 호출 실패: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 평가 중 오류 발생: {str(e)}")


@router.post("/batch-ai-evaluate")
def batch_ai_evaluate_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """모든 지원자에 대해 AI 평가를 배치로 실행합니다."""
    
    try:
        result = auto_evaluate_all_applications(db)
        return {
            "message": "AI evaluation batch process completed successfully",
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 평가 배치 프로세스 중 오류 발생: {str(e)}")


@router.post("/job/{job_post_id}/reset-ai-scores")
def reset_ai_scores_for_job(
    job_post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """특정 채용공고의 모든 지원자의 AI 점수를 초기화합니다.
    초기화 후 자동 평가 시스템이 실행되어 새로운 AI 평가가 진행됩니다."""
    
    # 해당 채용공고의 모든 지원자 조회
    applications = db.query(Application).filter(Application.job_post_id == job_post_id).all()
    
    if not applications:
        raise HTTPException(status_code=404, detail="해당 채용공고에 지원자가 없습니다.")
    
    reset_count = 0
    for application in applications:
        # AI 점수 및 관련 필드 초기화
        application.ai_score = None
        application.pass_reason = None
        application.fail_reason = None
        application.status = ApplyStatus.WAITING  # 상태도 대기로 초기화
        reset_count += 1
    
    db.commit()
    
    # 자동 평가 시스템 실행 (기존 함수 활용)
    try:
        auto_evaluate_all_applications(db)
        return {
            "message": f"AI 점수 초기화 완료: {reset_count}명의 지원자",
            "reset_count": reset_count,
            "note": "자동 평가 시스템이 실행되어 새로운 AI 평가가 진행됩니다."
        }
    except Exception as e:
        # 초기화는 성공했지만 자동 평가 실패
        return {
            "message": f"AI 점수 초기화 완료: {reset_count}명의 지원자",
            "reset_count": reset_count,
            "warning": f"자동 평가 실행 중 오류 발생: {str(e)}",
            "note": "10분 후 자동으로 재평가가 실행됩니다."
        }


@router.get("/job/{job_post_id}/applicants")
@redis_cache(expire=300)  # 5분 캐시
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
            "document_status": app.document_status,  # 서류 상태 추가
            "interview_status": app.interview_status,  # 면접 상태 추가
            "applied_at": app.applied_at,
            "score": app.score,
            "ai_score": app.ai_score,  # AI 점수 추가
            "pass_reason": app.pass_reason,  # 합격 이유 추가
            "fail_reason": app.fail_reason,  # 불합격 이유 추가
            "birthDate": app.user.birth_date.isoformat() if app.user.birth_date else None,
            "gender": app.user.gender if app.user.gender else None,
            "education": education,
            "degree": degree_specs[0].spec_description if degree_specs else None,  # 기존 전체 degree
            "major": major,   # 전공
            "degree_type": degree,  # 학위(석사/박사 등)
            "resume_id": app.resume_id,  # ← 이 줄 추가!
            "address": app.user.address if app.user.address else None,  # address 필드 추가
            "certificates": certificates,  # 자격증 배열 추가
            # 표절 점수 관련 정보 추가
            "plagiarism_score": app.resume.plagiarism_score if app.resume else None,
            "plagiarism_checked_at": app.resume.plagiarism_checked_at.isoformat() if app.resume and app.resume.plagiarism_checked_at else None,
            "most_similar_resume_id": app.resume.most_similar_resume_id if app.resume else None,
            "similarity_threshold": app.resume.similarity_threshold if app.resume else 0.9
        }
        applicants.append(applicant_data)
    return applicants
@router.get("/job/{job_post_id}/applicants-with-interview")
@redis_cache(expire=300)  # 5분 캐시
def get_applicants_with_interview(job_post_id: int, db: Session = Depends(get_db)):
    # 지원자 + 면접일정 포함 API : "지원자 면접시간 그룹핑"과 "첫 지원자만 미리 상세 fetch"
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


@router.get("/job/{job_post_id}/applicants-with-ai-interview")
@redis_cache(expire=300)  # 5분 캐시
def get_applicants_with_ai_interview(job_post_id: int, db: Session = Depends(get_db)):
    """AI 면접 지원자 + 면접일정 포함 API"""
    # 모든 지원자를 보여주도록 필터링 조건 완화
    meta = MetaData()
    schedule_interview_applicant = Table('schedule_interview_applicant', meta, autoload_with=db.bind)
    
    # 모든 지원자 조회 (필터링 조건 제거)
    applicants = db.query(Application).filter(
        Application.job_post_id == job_post_id
    ).all()
    
    result = []
    for app in applicants:
        # AI 면접 일정 조회
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
            "interview_status": app.interview_status,  # AI 면접 상태 추가
            "document_status": app.document_status,  # 서류 상태 추가
            "status": app.status,  # 전체 상태 추가
        })
    return result


@router.get("/job/{job_post_id}/applicants-with-second-interview")
@redis_cache(expire=300)  # 5분 캐시
def get_applicants_with_second_interview(job_post_id: int, db: Session = Depends(get_db)):
    """2차 면접(임원면접) 지원자 + 면접일정 포함 API"""
    # 1차 면접(실무진 면접) 합격자만 필터링
    meta = MetaData()
    schedule_interview_applicant = Table('schedule_interview_applicant', meta, autoload_with=db.bind)
    
    # 1차 면접 합격자 조회 (실무진 면접에서 합격한 지원자)
    # interview_status가 FIRST_INTERVIEW_COMPLETED인 지원자
    applicants = db.query(Application).filter(
        Application.job_post_id == job_post_id,
        Application.interview_status == InterviewStatus.FIRST_INTERVIEW_COMPLETED,
        Application.status.in_([ApplyStatus.PASSED, ApplyStatus.IN_PROGRESS])
    ).all()
    
    result = []
    for app in applicants:
        # 2차 면접 일정 조회
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


@router.get("/job/{job_post_id}/passed-applicants")
@redis_cache(expire=300)  # 5분 캐싱
def get_passed_applicants(
    job_post_id: int,
    db: Session = Depends(get_db)
):
    """서류 합격자만 조회하는 API"""
    # joinedload를 사용하여 관계 데이터를 한 번에 가져오기
    applications = (
        db.query(Application)
        .options(
            joinedload(Application.user),
            joinedload(Application.resume).joinedload(Resume.specs)
        )
        .filter(
            Application.job_post_id == job_post_id,
            Application.status == ApplyStatus.PASSED
        )
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
        degree = None
        major = None
        certificates = []
        if app.resume and app.resume.specs:
            edu_specs = [
                s for s in app.resume.specs 
                if s.spec_type == "education" and s.spec_title == "institution"
            ]
            if edu_specs:
                education = edu_specs[0].spec_description
            
            # degree 정보 추출 및 major/degree 분리
            degree_specs = [
                s for s in app.resume.specs
                if s.spec_type == "education" and s.spec_title == "degree"
            ]
            if degree_specs:
                degree_raw = degree_specs[0].spec_description or ""
                school_name = education or ""
                if "고등학교" in school_name:
                    major = ""
                    degree = ""
                elif "대학교" in school_name or "대학" in school_name:
                    if degree_raw:
                        m = re.match(r"(.+?)\((.+?)\)", degree_raw)
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
                
            # 자격증 정보 추출
            cert_name_specs = [
                s for s in app.resume.specs
                if s.spec_type == "certifications" and s.spec_title == "name"
            ]
            for cert in cert_name_specs:
                if cert.spec_description:
                    cert_date = next((s.spec_description for s in app.resume.specs if s.spec_type == "certifications" and s.spec_title == "date"), "")
                    cert_duration = next((s.spec_description for s in app.resume.specs if s.spec_type == "certifications" and s.spec_title == "duration"), "")
                    certificates.append({
                        "name": cert.spec_description,
                        "date": cert_date,
                        "duration": cert_duration
                    })
        
        applicant_data = {
            "id": app.user.id,
            "user_id": app.user.id,  # user_id 필드 추가
            "name": app.user.name,
            "email": app.user.email,
            "application_id": app.id,
            "status": app.status,
            "document_status": app.document_status,  # 서류 상태 추가
            "interview_status": app.interview_status,  # 면접 상태 추가
            "applied_at": app.applied_at,
            "score": app.score,
            "ai_score": app.ai_score,
            "pass_reason": app.pass_reason,
            "fail_reason": app.fail_reason,
            "birthDate": app.user.birth_date.isoformat() if app.user.birth_date else None,
            "gender": app.user.gender if app.user.gender else None,
            "education": education,
            "degree": degree_specs[0].spec_description if degree_specs else None,
            "major": major,
            "degree_type": degree,
            "resume_id": app.resume_id,
            "address": app.user.address if app.user.address else None,
            "certificates": certificates
        }
        applicants.append(applicant_data)
    
    return {
        "total_count": len(applicants),
        "passed_applicants": applicants
    }


@router.get("/job/{job_post_id}/user/{user_id}/written-answers", response_model=List[WrittenTestAnswerResponse])
def get_written_test_answers(job_post_id: int, user_id: int, db: Session = Depends(get_db)):
    answers = db.query(WrittenTestAnswer).filter(
        WrittenTestAnswer.jobpost_id == job_post_id,
        WrittenTestAnswer.user_id == user_id
    ).all()
    return answers