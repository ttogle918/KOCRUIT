from sqlalchemy.orm import Session
from app.models.evaluation_criteria import EvaluationCriteria
from app.schemas.evaluation_criteria import EvaluationCriteriaCreate, EvaluationCriteriaResponse
from typing import Optional, List
import json

class EvaluationCriteriaService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_evaluation_criteria(self, criteria_data: EvaluationCriteriaCreate) -> EvaluationCriteriaResponse:
        """평가항목 생성 및 저장"""
        db_criteria = EvaluationCriteria(
            job_post_id=criteria_data.job_post_id,
            company_name=criteria_data.company_name,
            suggested_criteria=criteria_data.suggested_criteria,
            weight_recommendations=criteria_data.weight_recommendations,
            evaluation_questions=criteria_data.evaluation_questions,
            scoring_guidelines=criteria_data.scoring_guidelines
        )
        
        self.db.add(db_criteria)
        self.db.commit()
        self.db.refresh(db_criteria)
        
        return EvaluationCriteriaResponse.from_orm(db_criteria)
    
    def get_evaluation_criteria_by_job_post(self, job_post_id: int) -> Optional[EvaluationCriteriaResponse]:
        """공고 ID로 평가항목 조회"""
        db_criteria = self.db.query(EvaluationCriteria).filter(
            EvaluationCriteria.job_post_id == job_post_id
        ).first()
        
        if not db_criteria:
            return None
        
        return EvaluationCriteriaResponse.from_orm(db_criteria)
    
    def update_evaluation_criteria(self, job_post_id: int, criteria_data: EvaluationCriteriaCreate) -> Optional[EvaluationCriteriaResponse]:
        """평가항목 업데이트"""
        db_criteria = self.db.query(EvaluationCriteria).filter(
            EvaluationCriteria.job_post_id == job_post_id
        ).first()
        
        if not db_criteria:
            return None
        
        # 기존 데이터 업데이트
        db_criteria.company_name = criteria_data.company_name
        db_criteria.suggested_criteria = criteria_data.suggested_criteria
        db_criteria.weight_recommendations = criteria_data.weight_recommendations
        db_criteria.evaluation_questions = criteria_data.evaluation_questions
        db_criteria.scoring_guidelines = criteria_data.scoring_guidelines
        
        self.db.commit()
        self.db.refresh(db_criteria)
        
        return EvaluationCriteriaResponse.from_orm(db_criteria)
    
    def delete_evaluation_criteria(self, job_post_id: int) -> bool:
        """평가항목 삭제"""
        db_criteria = self.db.query(EvaluationCriteria).filter(
            EvaluationCriteria.job_post_id == job_post_id
        ).first()
        
        if not db_criteria:
            return False
        
        self.db.delete(db_criteria)
        self.db.commit()
        
        return True
    
    def get_all_evaluation_criteria(self) -> List[EvaluationCriteriaResponse]:
        """모든 평가항목 조회"""
        db_criteria_list = self.db.query(EvaluationCriteria).all()
        return [EvaluationCriteriaResponse.from_orm(criteria) for criteria in db_criteria_list] 