import enum
from sqlalchemy import Column, Integer, ForeignKey, DECIMAL, Text, TIMESTAMP, Boolean, Enum as SqlEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.job import JobPost
from app.models.application import Application, ApplyStatus
from app.models.resume import Resume
from app.models.weight import Weight

class EvaluationStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"

class InterviewEvaluation(Base):
    __tablename__ = 'interview_evaluation'
    id = Column(Integer, primary_key=True, autoincrement=True)
    interview_id = Column(Integer, ForeignKey('schedule_interview.id'), nullable=False)
    evaluator_id = Column(Integer, ForeignKey('company_user.id'))
    is_ai = Column(Boolean, default=False)
    score = Column(DECIMAL(5,2))
    summary = Column(Text)
    created_at = Column(TIMESTAMP)
    status = Column(SqlEnum(EvaluationStatus), default=EvaluationStatus.PENDING, nullable=False)

    details = relationship('EvaluationDetail', back_populates='evaluation')

class EvaluationDetail(Base):
    __tablename__ = 'evaluation_detail'
    id = Column(Integer, primary_key=True, autoincrement=True)
    evaluation_id = Column(Integer, ForeignKey('interview_evaluation.id'), nullable=False)
    category = Column(Text)
    grade = Column(Text)
    score = Column(DECIMAL(5,2))

    evaluation = relationship('InterviewEvaluation', back_populates='details')

def auto_process_applications(db: Session):
    now = datetime.now()
    expired_jobposts = db.query(JobPost).filter(JobPost.end_date < now).all()
    for jobpost in expired_jobposts:
        headcount = getattr(jobpost, 'headcount', 1) or 1
        limit = headcount * 3
        # 대기 상태 지원서만 score 기준 내림차순 정렬
        waiting_apps = db.query(Application).filter(
            Application.job_post_id == jobpost.id,
            Application.status == ApplyStatus.WAITING
        ).order_by(Application.score.desc().nullslast()).all()
        # 상위 N명만 PASSED, 나머지는 REJECTED
        for idx, app in enumerate(waiting_apps):
            if idx < limit:
                app.status = str(ApplyStatus.PASSED)
            else:
                app.status = str(ApplyStatus.REJECTED)
    db.commit()
    return True


def auto_evaluate_all_applications(db: Session):
    """
    모든 지원자에 대해 AI 평가를 자동으로 실행합니다.
    AI 평가가 아직 실행되지 않은 지원자들의 ai_score, status, pass_reason, fail_reason을 업데이트합니다.
    """
    import requests
    import json
    
    # AI 평가가 아직 실행되지 않은 지원자들 조회
    unevaluated_applications = db.query(Application).filter(
        (Application.ai_score.is_(None)) | (Application.ai_score == 0)
    ).all()
    
    print(f"AI 평가가 필요한 지원자 수: {len(unevaluated_applications)}")
    
    for application in unevaluated_applications:
        try:
            # 채용공고 정보 가져오기
            job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
            if not job_post:
                print(f"채용공고를 찾을 수 없음: application_id={application.id}")
                continue
            
            # 이력서 정보 가져오기
            resume = db.query(Resume).filter(Resume.id == application.resume_id).first()
            if not resume:
                print(f"이력서를 찾을 수 없음: application_id={application.id}")
                continue
            
            # Spec 데이터 구성
            spec_data = {
                "education": {},
                "experience": {},
                "skills": {},
                "portfolio": {}
            }
            
            if resume.specs:
                for spec in resume.specs:
                    if spec.spec_type == "education":
                        if spec.spec_title == "institution":
                            spec_data["education"]["university"] = spec.spec_description
                        elif spec.spec_title == "major":
                            spec_data["education"]["major"] = spec.spec_description
                        elif spec.spec_title == "degree":
                            spec_data["education"]["degree"] = spec.spec_description
                        elif spec.spec_title == "gpa":
                            spec_data["education"]["gpa"] = float(spec.spec_description) if spec.spec_description and spec.spec_description.replace('.', '').isdigit() else 0.0
                    elif spec.spec_type == "activity":
                        if spec.spec_title == "organization":
                            spec_data["experience"]["companies"] = [spec.spec_description]
                        elif spec.spec_title == "role":
                            spec_data["experience"]["position"] = spec.spec_description
                        elif spec.spec_title == "duration":
                            spec_data["experience"]["duration"] = spec.spec_description
                    elif spec.spec_type == "project_experience":
                        if spec.spec_title == "title":
                            spec_data["experience"]["projects"] = [spec.spec_description]
                    elif spec.spec_type == "skills":
                        if spec.spec_title == "name":
                            spec_data["skills"]["programming_languages"] = [spec.spec_description]
                    elif spec.spec_type == "certifications":
                        if spec.spec_title == "name":
                            spec_data["skills"]["certifications"] = [spec.spec_description]
            
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
            회사: {job_post.company_name}
            직무: {job_post.position}
            요구사항: {job_post.requirements or ''}
            우대사항: {job_post.preferred_qualifications or ''}
            """
            
            # Weight 데이터 구성
            weights = db.query(Weight).filter(
                Weight.target_type == "resume_feature",
                Weight.jobpost_id == job_post.id
            ).all()
            weight_dict = {w.field_name: w.weight_value for w in weights}

            # AI Agent API 호출
            agent_url = "http://localhost:8001/evaluate-application/"
            payload = {
                "job_posting": job_posting,
                "spec_data": spec_data,
                "resume_data": resume_data,
                "weight_data": weight_dict
            }
            
            response = requests.post(agent_url, json=payload, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            
            # 데이터베이스 업데이트
            application.ai_score = result.get("ai_score", 0.0)
            application.pass_reason = result.get("pass_reason", "")
            application.fail_reason = result.get("fail_reason", "")
            
            # AI가 제안한 상태로 업데이트
            ai_suggested_status = result.get("status", "REJECTED")
            if ai_suggested_status in ["PASSED", "REJECTED"]:
                application.status = ai_suggested_status
            
            print(f"AI 평가 완료: application_id={application.id}, score={application.ai_score}, status={application.status}")
            
        except Exception as e:
            print(f"AI 평가 실패: application_id={application.id}, error={str(e)}")
            continue
    
    # 모든 변경사항 커밋
    db.commit()
    print(f"AI 평가 배치 프로세스 완료: {len(unevaluated_applications)}개 지원자 처리")
    return True 