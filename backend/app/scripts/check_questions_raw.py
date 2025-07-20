#!/usr/bin/env python3
"""
DB 질문 데이터 직접 확인 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import SessionLocal
from sqlalchemy import text

def check_questions_raw():
    """DB에서 직접 질문 데이터 확인"""
    db = SessionLocal()
    try:
        # 모든 질문 조회
        result = db.execute(text("SELECT id, type, category, question_text FROM interview_question LIMIT 10"))
        questions = result.fetchall()
        
        print(f"=== DB 질문 데이터 확인 ===")
        print(f"총 질문 수: {len(questions)}개")
        
        for q in questions:
            print(f"ID: {q[0]}, Type: {q[1]}, Category: {q[2]}")
            print(f"질문: {q[3][:50]}...")
            print("-" * 50)
        
        # 타입별 개수 확인
        result = db.execute(text("SELECT type, COUNT(*) as count FROM interview_question GROUP BY type"))
        type_counts = result.fetchall()
        
        print(f"\n타입별 개수:")
        for tc in type_counts:
            print(f"  - {tc[0]}: {tc[1]}개")
        
    except Exception as e:
        print(f"❌ 확인 실패: {e}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
    finally:
        db.close()

if __name__ == "__main__":
    check_questions_raw() 