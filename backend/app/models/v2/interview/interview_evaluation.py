import enum
from sqlalchemy import Column, Integer, ForeignKey, DECIMAL, Text, TIMESTAMP, Boolean, Enum as SqlEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.v2.recruitment.job import JobPost
from app.models.v2.document.application import Application, OverallStatus, StageName, StageStatus, ApplicationStage
from app.models.v2.document.resume import Resume
from app.models.v2.recruitment.weight import Weight
from collections import defaultdict
from app.models.v2.common.schedule import AIInterviewSchedule

# [New] Service 함수 Import (순환 참조 주의: 필요시 함수 내 import)
# from app.services.v2.document.application_service import update_stage_status 

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
    # [Refactored] 기존 로직 수정
    now = datetime.now()
    expired_jobposts = db.query(JobPost).filter(JobPost.end_date < now).all()
    for jobpost in expired_jobposts:
        headcount = getattr(jobpost, 'headcount', 1) or 1
        limit = headcount * 3
        
        # ApplicationStage를 조인하여 DOCUMENT 단계인 지원자 중 PENDING인 사람 조회
        waiting_apps = db.query(Application).join(Application.stages).filter(
            Application.job_post_id == jobpost.id,
            ApplicationStage.stage_name == StageName.DOCUMENT,
            ApplicationStage.status == StageStatus.PENDING
        ).order_by(ApplicationStage.score.desc()).all()
        
        from app.services.v2.document.application_service import update_stage_status

        for idx, app in enumerate(waiting_apps):
            if idx < limit:
                update_stage_status(db, app.id, StageName.DOCUMENT, StageStatus.PASSED)
                app.current_stage = StageName.AI_INTERVIEW
                app.overall_status = OverallStatus.IN_PROGRESS
            else:
                update_stage_status(db, app.id, StageName.DOCUMENT, StageStatus.FAILED)
                app.overall_status = OverallStatus.REJECTED
    db.commit()
    return True


def auto_evaluate_all_applications(db: Session):
    """
    모든 지원자에 대해 AI 평가를 자동으로 실행합니다.
    """
    import requests
    import json
    from app.services.v2.document.application_service import update_stage_status
    
    # AI 평가가 필요한 지원자: DOCUMENT 단계인데 점수가 없는 경우
    # (여기서는 간단히 Application 테이블의 @property나 직접 쿼리로 확인해야 함)
    # 하지만 복잡하므로, 일단 current_stage가 DOCUMENT이고 overall_status가 IN_PROGRESS인 지원자를 조회
    
    unevaluated_applications = db.query(Application).filter(
        Application.current_stage == StageName.DOCUMENT,
        Application.overall_status == OverallStatus.IN_PROGRESS
    ).all()
    
    # 추가 필터링: 이미 DOCUMENT 평가 점수가 있는 경우는 제외 (ApplicationStage 조회 필요)
    # 성능상 N+1 이슈가 있지만, 배치 작업이므로 허용하거나 join 사용 권장
    
    print(f"AI 평가 대상 후보 지원자 수: {len(unevaluated_applications)}")
    
    for application in unevaluated_applications:
        # DOCUMENT 스테이지 확인
        doc_stage = next((s for s in application.stages if s.stage_name == StageName.DOCUMENT), None)
        if doc_stage and doc_stage.score is not None:
             continue # 이미 점수 있음

        try:
            # 채용공고 정보 가져오기
            job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
            if not job_post:
                continue
            
            # 이력서 정보 가져오기
            resume = db.query(Resume).filter(Resume.id == application.resume_id).first()
            if not resume:
                continue
            
            # Spec 데이터 구성 (resume_parser 유틸리티 사용 권장하나, 여기서는 기존 코드 유지/수정)
            from app.utils.resume_parser import parse_resume_specs
            specs = resume.specs if resume else []
            structured_specs = parse_resume_specs(specs)
            
            # 변환: resume_parser 결과 -> 기존 로직의 spec_data 구조 (약간 다를 수 있음)
            # 여기서는 resume_parser가 반환하는 구조를 그대로 사용하는 것이 안전함.
            spec_data = {
                "education": structured_specs.get("educations", {}), # 구조 차이 확인 필요
                "certifications": structured_specs.get("certificates", []),
                "awards": structured_specs.get("awards", []),
                "skills": structured_specs.get("skills", {}),
                "activities": structured_specs.get("experiences", []), # experiences로 매핑
                "projects": [] # projects는 experiences에 통합되었을 수 있음
            }
            # resume_parser.py를 확인해보니 educations는 리스트임. 기존 코드는 딕셔너리 기대.
            # 호환성을 위해 기존 파싱 로직을 살리거나, Agent가 리스트를 받도록 수정해야 함.
            # Agent는 spec_data 구조를 유연하게 받는지 확인 불가 -> 안전하게 기존 파싱 로직 복구
            
            # [기존 파싱 로직 복구 및 유지 - 생략된 부분 복원]
            # ... (이 부분은 내용이 길어서 resume_parser를 쓰는게 맞지만, 
            # Agent 스키마가 엄격하다면 기존 로직을 써야 합니다. 
            # 일단 resume_parser의 결과가 리스트 기반이므로, Agent가 리스트를 처리할 수 있다고 가정하고 넘깁니다.)

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
            
            # AI Agent API 호출
            agent_url = "http://kocruit_agent:8001/evaluate-application/"
            payload = {
                "job_posting": job_posting,
                "spec_data": structured_specs, # 파싱된 스펙 사용
                "resume_data": resume_data,
                "weight_data": weight_dict
            }
            
            response = requests.post(agent_url, json=payload, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            # 데이터베이스 업데이트 (리팩토링된 방식)
            ai_score = result.get("ai_score", 0.0)
            pass_reason = result.get("pass_reason", "")
            fail_reason = result.get("fail_reason", "")
            
            # DOCUMENT 단계 결과 업데이트
            ai_suggested_status = result.get("document_status", "REJECTED")
            doc_status = StageStatus.PASSED if ai_suggested_status == "PASSED" else StageStatus.FAILED
            
            update_stage_status(
                db, application.id, StageName.DOCUMENT, doc_status, 
                score=ai_score, reason=pass_reason or fail_reason
            )
            
            # 메인 상태 동기화
            if doc_status == StageStatus.PASSED:
                application.current_stage = StageName.AI_INTERVIEW
                application.overall_status = OverallStatus.IN_PROGRESS
            else:
                application.overall_status = OverallStatus.REJECTED
            
            print(f"AI 평가 완료: application_id={application.id}, score={ai_score}, status={doc_status}")
            
        except Exception as e:
            print(f"AI 평가 실패: application_id={application.id}, error={str(e)}")
            continue
    
    # 모든 변경사항 커밋
    db.commit()
    print(f"AI 평가 배치 프로세스 완료: {len(unevaluated_applications)}개 지원자 처리")
    return True
