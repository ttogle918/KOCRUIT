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
from collections import defaultdict

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