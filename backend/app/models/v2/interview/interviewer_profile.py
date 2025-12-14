"""
면접관 프로필 모델
개별 면접관 특성 분석과 상대적 비교 분석을 통합한 시스템
"""

from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, Text, ForeignKey, Index, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import json


class InterviewerProfile(Base):
    """면접관 프로필 - 개별 특성과 상대적 분석 통합"""
    __tablename__ = "interviewer_profile"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 기존 테이블 연결
    evaluator_id = Column(Integer, ForeignKey("company_user.id"), nullable=False, unique=True)
    latest_evaluation_id = Column(Integer, ForeignKey("interview_evaluation.id"), nullable=True)
    
    # 개별 특성 분석 (0-100)
    strictness_score = Column(DECIMAL(5,2), default=50.0)       # 엄격도
    leniency_score = Column(DECIMAL(5,2), default=50.0)         # 관대함
    consistency_score = Column(DECIMAL(5,2), default=50.0)      # 일관성
    
    # 평가 패턴 분석 (0-100)
    tech_focus_score = Column(DECIMAL(5,2), default=50.0)       # 기술 중심도
    personality_focus_score = Column(DECIMAL(5,2), default=50.0) # 인성 중심도
    detail_level_score = Column(DECIMAL(5,2), default=50.0)     # 상세도
    
    # 신뢰도 지표 (0-100)
    experience_score = Column(DECIMAL(5,2), default=50.0)       # 경험치
    accuracy_score = Column(DECIMAL(5,2), default=50.0)         # 정확도
    
    # 통계 데이터
    total_interviews = Column(Integer, default=0)               # 총 면접 횟수
    avg_score_given = Column(DECIMAL(5,2), default=0.0)        # 평균 부여 점수
    score_variance = Column(DECIMAL(5,2), default=0.0)         # 점수 분산
    pass_rate = Column(DECIMAL(5,2), default=0.0)              # 합격률
    
    # 평가 세부 통계
    avg_tech_score = Column(DECIMAL(5,2), default=0.0)         # 평균 기술 점수
    avg_personality_score = Column(DECIMAL(5,2), default=0.0)  # 평균 인성 점수
    avg_memo_length = Column(DECIMAL(8,2), default=0.0)        # 평균 메모 길이
    
    # 상대적 위치 (전체 면접관 대비)
    strictness_percentile = Column(DECIMAL(5,2), default=50.0)  # 엄격도 백분위
    consistency_percentile = Column(DECIMAL(5,2), default=50.0) # 일관성 백분위
    
    # 메타데이터
    last_evaluation_date = Column(DateTime, nullable=True)     # 마지막 평가 날짜
    profile_version = Column(Integer, default=1)
    confidence_level = Column(DECIMAL(5,2), default=0.0)       # 프로필 신뢰도
    is_active = Column(Boolean, default=True)                  # 활성 상태
    
    # 타임스탬프
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 관계
    evaluator = relationship("CompanyUser")
    latest_evaluation = relationship("InterviewEvaluation")
    
    # 인덱스
    __table_args__ = (
        Index('idx_interviewer_profile_evaluator', 'evaluator_id'),
        Index('idx_interviewer_profile_scores', 'strictness_score', 'consistency_score'),
        Index('idx_interviewer_profile_focus', 'tech_focus_score', 'personality_focus_score'),
    )
    
    def calculate_balance_score(self, other_profiles):
        """다른 면접관들과의 밸런스 점수 계산"""
        if not other_profiles:
            return 0.0
        
        # Decimal을 float로 변환하여 계산
        strictness_scores = [float(self.strictness_score)] + [float(p.strictness_score) for p in other_profiles]
        strictness_variance = sum((s - sum(strictness_scores)/len(strictness_scores))**2 for s in strictness_scores) / len(strictness_scores)
        
        # 전문성 커버리지 계산 (높을수록 좋음)
        tech_coverage = max([float(self.tech_focus_score)] + [float(p.tech_focus_score) for p in other_profiles])
        personality_coverage = max([float(self.personality_focus_score)] + [float(p.personality_focus_score) for p in other_profiles])
        
        # 경험치 총합
        total_experience = float(self.experience_score) + sum(float(p.experience_score) for p in other_profiles)
        
        # 밸런스 점수 계산
        balance_score = (
            max(0, 100 - strictness_variance) * 0.3 +  # 분산 최소화
            (tech_coverage + personality_coverage) * 0.4 +  # 커버리지
            min(total_experience / len(other_profiles + [self]), 100) * 0.3  # 경험치
        )
        
        return round(balance_score, 2)
    
    def is_complementary_to(self, other_profile):
        """다른 면접관과 보완적인지 판단"""
        # 엄격도 차이가 적당한지 (20점 이상 차이나면 보완적)
        strictness_diff = abs(self.strictness_score - other_profile.strictness_score)
        
        # 전문성이 다른지 (기술 vs 인성)
        is_tech_complement = (self.tech_focus_score > 60 and other_profile.personality_focus_score > 60) or \
                           (self.personality_focus_score > 60 and other_profile.tech_focus_score > 60)
        
        return strictness_diff >= 20 or is_tech_complement
    
    def get_characteristic_summary(self):
        """면접관 특성 요약 반환"""
        characteristics = []
        
        if self.strictness_score > 70:
            characteristics.append("엄격한 평가자")
        elif self.strictness_score < 30:
            characteristics.append("관대한 평가자")
        
        if self.consistency_score > 70:
            characteristics.append("일관된 평가")
        
        if self.tech_focus_score > 60:
            characteristics.append("기술 중심")
        elif self.personality_focus_score > 60:
            characteristics.append("인성 중심")
        
        if self.experience_score > 80:
            characteristics.append("경험 풍부")
        
        return characteristics if characteristics else ["균형잡힌 평가자"]


class InterviewerProfileHistory(Base):
    """면접관 프로필 변경 이력"""
    __tablename__ = "interviewer_profile_history"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 연결 정보
    interviewer_profile_id = Column(Integer, ForeignKey("interviewer_profile.id"), nullable=False)
    evaluation_id = Column(Integer, ForeignKey("interview_evaluation.id"), nullable=True)
    
    # 변경 전후 값 (JSON)
    old_values = Column(Text, nullable=True)  # JSON 형태로 저장
    new_values = Column(Text, nullable=True)  # JSON 형태로 저장
    
    # 변경 정보
    change_type = Column(String(50), nullable=False)  # 'evaluation_added', 'profile_updated', 'manual_adjustment'
    change_reason = Column(Text, nullable=True)
    
    # 메타데이터
    created_at = Column(DateTime, default=datetime.now)
    
    # 관계
    interviewer_profile = relationship("InterviewerProfile")
    evaluation = relationship("InterviewEvaluation")
    
    # 인덱스
    __table_args__ = (
        Index('idx_profile_history_evaluator', 'interviewer_profile_id'),
        Index('idx_profile_history_date', 'created_at'),
    ) 