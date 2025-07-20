#!/usr/bin/env python3
"""
DB에 저장된 질문을 간단히 확인하는 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import SessionLocal
from app.models.interview_question import InterviewQuestion

def check_db_questions():
    db = SessionLocal()
    try:
        print("=== DB 질문 확인 ===")
        
        # 전체 질문 수 확인
        total_count = db.query(InterviewQuestion).count()
        print(f"총 질문 수: {total_count}")
        
        # 처음 5개 질문 확인
        questions = db.query(InterviewQuestion).limit(5).all()
        print(f"\n처음 5개 질문:")
        for i, q in enumerate(questions, 1):
            print(f"  {i}. ID: {q.id}, Type: {q.type}")
            print(f"     Content: {q.question_text[:100]}...")
            print()
        
        # 타입별 분포 확인
        from sqlalchemy import func
        type_counts = db.query(
            InterviewQuestion.type, 
            func.count(InterviewQuestion.id)
        ).group_by(InterviewQuestion.type).all()
        
        print("타입별 분포:")
        for q_type, count in type_counts:
            print(f"  - {q_type}: {count}개")
            
    except Exception as e:
        print(f"오류: {str(e)}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
    finally:
        db.close()

if __name__ == "__main__":
    check_db_questions() 