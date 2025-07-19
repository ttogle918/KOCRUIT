from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.interview_question import LangGraphGeneratedData
import hashlib
import json
from typing import Optional, Dict, Any

class LangGraphDataService:
    """LangGraph 생성 데이터를 관리하는 서비스"""
    
    @staticmethod
    def generate_cache_key(
        resume_id: int,
        application_id: Optional[int],
        job_post_id: Optional[int],
        company_name: str,
        applicant_name: str,
        data_type: str,
        interview_stage: Optional[str] = None,
        evaluator_type: Optional[str] = None
    ) -> str:
        """캐시 키 생성"""
        key_data = {
            'resume_id': resume_id,
            'application_id': application_id,
            'job_post_id': job_post_id,
            'company_name': company_name,
            'applicant_name': applicant_name,
            'data_type': data_type,
            'interview_stage': interview_stage,
            'evaluator_type': evaluator_type
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    @staticmethod
    def save_generated_data(
        db: Session,
        resume_id: int,
        application_id: Optional[int],
        job_post_id: Optional[int],
        company_name: str,
        applicant_name: str,
        data_type: str,
        generated_data: Dict[str, Any],
        interview_stage: Optional[str] = None,
        evaluator_type: Optional[str] = None
    ) -> LangGraphGeneratedData:
        """생성된 데이터를 DB에 저장"""
        
        cache_key = LangGraphDataService.generate_cache_key(
            resume_id, application_id, job_post_id, company_name, 
            applicant_name, data_type, interview_stage, evaluator_type
        )
        
        # 기존 데이터가 있는지 확인
        existing_data = db.query(LangGraphGeneratedData).filter(
            LangGraphGeneratedData.cache_key == cache_key
        ).first()
        
        if existing_data:
            # 기존 데이터 업데이트
            existing_data.generated_data = generated_data
            db.commit()
            return existing_data
        else:
            # 새 데이터 생성
            new_data = LangGraphGeneratedData(
                resume_id=resume_id,
                application_id=application_id,
                job_post_id=job_post_id,
                company_name=company_name,
                applicant_name=applicant_name,
                data_type=data_type,
                interview_stage=interview_stage,
                evaluator_type=evaluator_type,
                generated_data=generated_data,
                cache_key=cache_key
            )
            db.add(new_data)
            db.commit()
            db.refresh(new_data)
            return new_data
    
    @staticmethod
    def get_generated_data(
        db: Session,
        resume_id: int,
        application_id: Optional[int],
        job_post_id: Optional[int],
        company_name: str,
        applicant_name: str,
        data_type: str,
        interview_stage: Optional[str] = None,
        evaluator_type: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """저장된 데이터 조회"""
        
        cache_key = LangGraphDataService.generate_cache_key(
            resume_id, application_id, job_post_id, company_name, 
            applicant_name, data_type, interview_stage, evaluator_type
        )
        
        data = db.query(LangGraphGeneratedData).filter(
            LangGraphGeneratedData.cache_key == cache_key
        ).first()
        
        return data.generated_data if data else None
    
    @staticmethod
    def get_all_data_for_resume(
        db: Session,
        resume_id: int,
        application_id: Optional[int] = None,
        interview_stage: Optional[str] = None
    ) -> Dict[str, Any]:
        """특정 이력서의 모든 생성 데이터 조회"""
        
        query = db.query(LangGraphGeneratedData).filter(
            LangGraphGeneratedData.resume_id == resume_id
        )
        
        if application_id:
            query = query.filter(LangGraphGeneratedData.application_id == application_id)
        
        if interview_stage:
            query = query.filter(LangGraphGeneratedData.interview_stage == interview_stage)
        
        data_list = query.all()
        
        result = {}
        for data in data_list:
            result[data.data_type] = data.generated_data
        
        return result
    
    @staticmethod
    def delete_old_data(db: Session, days: int = 30) -> int:
        """오래된 데이터 삭제 (기본 30일)"""
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.now() - timedelta(days=days)
        deleted_count = db.query(LangGraphGeneratedData).filter(
            LangGraphGeneratedData.created_at < cutoff_date
        ).delete()
        
        db.commit()
        return deleted_count 