import enum
from sqlalchemy import Column, Integer, ForeignKey, DECIMAL, Text, TIMESTAMP, Boolean, Enum as SqlEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.job import JobPost
from app.models.application import Application, ApplyStatus

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
    total_score = Column(DECIMAL(5,2))  # score -> total_score로 변경
    summary = Column(Text)
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)  # updated_at 추가
    status = Column(SqlEnum(EvaluationStatus), default=EvaluationStatus.PENDING, nullable=False)

    # 새로운 관계 추가
    evaluation_items = relationship('InterviewEvaluationItem', back_populates='evaluation', cascade='all, delete-orphan')
    # 기존 관계 유지 (호환성)
    details = relationship('EvaluationDetail', back_populates='evaluation')

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
        ).order_by(Application.score.desc().nullslast()).all()
        # 상위 N명만 PASSED, 나머지는 REJECTED
        for idx, app in enumerate(waiting_apps):
            if idx < limit:
                app.status = str(ApplyStatus.PASSED)
            else:
                app.status = str(ApplyStatus.REJECTED)
    db.commit()
    return True 