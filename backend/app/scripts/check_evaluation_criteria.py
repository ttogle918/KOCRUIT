#!/usr/bin/env python3
"""
생성된 평가 기준 확인 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import get_db
from app.models.evaluation_criteria import EvaluationCriteria

def check_evaluation_criteria(job_post_id: int):
    """특정 공고의 평가 기준 확인"""
    db = next(get_db())
    
    try:
        criteria = db.query(EvaluationCriteria).filter(
            EvaluationCriteria.job_post_id == job_post_id
        ).all()
        
        print(f"📊 Job Post {job_post_id}의 평가 기준: {len(criteria)}개")
        
        if not criteria:
            print("❌ 평가 기준이 없습니다.")
            return
        
        # 타입별 통계
        job_based = [c for c in criteria if c.evaluation_type == "job_based"]
        resume_based = [c for c in criteria if c.evaluation_type == "resume_based"]
        
        print(f"📋 job_based: {len(job_based)}개")
        print(f"📋 resume_based: {len(resume_based)}개")
        
        # 단계별 통계
        practical = [c for c in criteria if getattr(c, 'interview_stage', None) == 'practical']
        executive = [c for c in criteria if getattr(c, 'interview_stage', None) == 'executive']
        
        print(f"📋 practical: {len(practical)}개")
        print(f"📋 executive: {len(executive)}개")
        
        print("\n📝 상세 정보 (최대 10개):")
        for i, c in enumerate(criteria[:10], 1):
            stage = getattr(c, 'interview_stage', 'N/A')
            print(f"  {i}. ID: {c.id}, Type: {c.evaluation_type}, Stage: {stage}, Resume: {c.resume_id}")
        
        if len(criteria) > 10:
            print(f"  ... 외 {len(criteria) - 10}개")
            
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
    finally:
        db.close()

def main():
    if len(sys.argv) != 2:
        print("사용법: python check_evaluation_criteria.py <job_post_id>")
        print("예시: python check_evaluation_criteria.py 17")
        return
    
    try:
        job_post_id = int(sys.argv[1])
        check_evaluation_criteria(job_post_id)
    except ValueError:
        print("❌ job_post_id는 숫자여야 합니다.")

if __name__ == "__main__":
    main() 