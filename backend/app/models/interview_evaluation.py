import enum
from sqlalchemy import Column, Integer, ForeignKey, DECIMAL, Text, TIMESTAMP, Boolean, Enum as SqlEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.job import JobPost
from app.models.application import Application, ApplyStatus, DocumentStatus
from app.models.resume import Resume
from app.models.weight import Weight
from app.models.schedule import AIInterviewSchedule

class EvaluationStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"

class EvaluationType(str, enum.Enum):
    AI = "AI"
    PRACTICAL = "실무진"
    EXECUTIVE = "임원"
    
class InterviewEvaluation(Base):
    __tablename__ = 'interview_evaluation'
    id = Column(Integer, primary_key=True, autoincrement=True)
    interview_id = Column(Integer, ForeignKey('ai_interview_schedule.id'), nullable=False)  # AI 면접용으로 변경
    evaluator_id = Column(Integer, ForeignKey('company_user.id'))
    is_ai = Column(Boolean, default=False)
    evaluation_type = Column(SqlEnum(EvaluationType), default=EvaluationType.AI, nullable=False)
    total_score = Column(DECIMAL(5,2))  # score -> total_score로 변경
    summary = Column(Text)
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)  # updated_at 추가
    status = Column(SqlEnum(EvaluationStatus), default=EvaluationStatus.PENDING, nullable=False)

    # 새로운 관계 추가
    evaluation_items = relationship('InterviewEvaluationItem', back_populates='evaluation', cascade='all, delete-orphan')
    # 기존 관계 유지 (호환성)
    details = relationship('EvaluationDetail', back_populates='evaluation')
    # AI 면접 일정 관계 추가
    ai_interview_schedule = relationship('AIInterviewSchedule')

class InterviewEvaluationItem(Base):
    __tablename__ = 'interview_evaluation_item'
    id = Column(Integer, primary_key=True, autoincrement=True)
    evaluation_id = Column(Integer, ForeignKey('interview_evaluation.id'), nullable=False)
    evaluate_type = Column(Text, nullable=False)  # 평가 항목 타입
    evaluate_score = Column(DECIMAL(5,2), nullable=False)  # 평가 점수
    grade = Column(Text)  # 등급 (A, B, C 등)
    comment = Column(Text)  # 개별 항목 코멘트
    created_at = Column(TIMESTAMP, default=datetime.now)

    evaluation = relationship('InterviewEvaluation', back_populates='evaluation_items')

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
        ).order_by(Application.score.desc()).all()
        # 상위 N명만 PASSED, 나머지는 REJECTED
        for idx, app in enumerate(waiting_apps):
            if idx < limit:
                app.status = ApplyStatus.PASSED
            else:
                app.status = ApplyStatus.REJECTED
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
                "certifications": [],
                "awards": [],
                "skills": {},
                "activities": [],
                "projects": []
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
                        elif spec.spec_title == "start_date":
                            spec_data["education"]["start_date"] = spec.spec_description
                        elif spec.spec_title == "end_date":
                            spec_data["education"]["end_date"] = spec.spec_description
                    elif spec.spec_type == "certifications":
                        if spec.spec_title == "name":
                            spec_data["certifications"].append(spec.spec_description)
                        elif spec.spec_title == "date":
                            if spec_data["certifications"]:
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
            # 모든 spec 타입이 항상 포함되도록 보장
            for key, default in [
                ("education", {}),
                ("certifications", []),
                ("awards", []),
                ("skills", {}),
                ("activities", []),
                ("projects", [])
            ]:
                if key not in spec_data:
                    spec_data[key] = default
            
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
            
            # Weight 데이터 구성
            weights = db.query(Weight).filter(
                Weight.target_type == "resume_feature",
                Weight.jobpost_id == job_post.id
            ).all()
            weight_dict = {w.field_name: w.weight_value for w in weights}
            
            # Weight 데이터 로깅 추가
            print(f"Weight 데이터 - job_post_id={job_post.id}:")
            print(f"  조회된 weight 개수: {len(weights)}")
            print(f"  weight_dict: {weight_dict}")

            # AI Agent API 호출
            agent_url = "http://kocruit_agent:8001/evaluate-application/"
            payload = {
                "job_posting": job_posting,
                "spec_data": spec_data,
                "resume_data": resume_data,
                "weight_data": weight_dict
            }
            
            # Payload 로깅 추가
            print(f"AI Agent 요청 payload - application_id={application.id}:")
            print(f"  job_posting 길이: {len(job_posting)}")
            print(f"  spec_data 키: {list(spec_data.keys())}")
            print(f"  resume_data 키: {list(resume_data.keys())}")
            print(f"  weight_data 키: {list(weight_dict.keys())}")
            
            response = requests.post(agent_url, json=payload, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            
            # AI Agent 응답 로깅 추가
            print(f"AI Agent 응답 - application_id={application.id}:")
            print(f"  ai_score: {result.get('ai_score', 0.0)}")
            print(f"  status: {result.get('status', 'REJECTED')}")
            print(f"  pass_reason: {result.get('pass_reason', '')[:100]}...")
            print(f"  fail_reason: {result.get('fail_reason', '')[:100]}...")
            print(f"  전체 응답: {result}")
            
            # 데이터베이스 업데이트
            application.ai_score = result.get("ai_score", 0.0)
            application.pass_reason = result.get("pass_reason", "")
            application.fail_reason = result.get("fail_reason", "")
            
            # AI가 제안한 서류 상태로 업데이트
            ai_suggested_status = result.get("status", "REJECTED")
            if ai_suggested_status == "PASSED":
                application.document_status = DocumentStatus.PASSED.value
                application.status = ApplyStatus.IN_PROGRESS.value  # 서류 합격 시 진행 중으로 변경
            elif ai_suggested_status == "REJECTED":
                application.document_status = DocumentStatus.REJECTED.value
                application.status = ApplyStatus.REJECTED.value  # 서류 불합격 시 최종 불합격
            
            print(f"AI 평가 완료: application_id={application.id}, score={application.ai_score}, status={application.status}")
            
        except Exception as e:
            print(f"AI 평가 실패: application_id={application.id}, error={str(e)}")
            continue
    
    # 모든 변경사항 커밋
    db.commit()
    print(f"AI 평가 배치 프로세스 완료: {len(unevaluated_applications)}개 지원자 처리")
    return True 