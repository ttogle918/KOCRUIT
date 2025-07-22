#!/usr/bin/env python3
"""
AI 면접 질문 간단 확인 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import SessionLocal
from app.models.interview_question import InterviewQuestion, QuestionType

def check_ai_questions():
    """AI 면접 질문 확인"""
    db = SessionLocal()
    try:
        # AI 면접 질문 개수 확인
        ai_questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.type == QuestionType.AI_INTERVIEW
        ).all()
        
        print(f"=== AI 면접 질문 현황 ===")
        print(f"총 AI 면접 질문 수: {len(ai_questions)}개")
        
        # 카테고리별 분류
        categories = {}
        for q in ai_questions:
            category = q.category or "unknown"
            if category not in categories:
                categories[category] = 0
            categories[category] += 1
        
        print(f"\n카테고리별 분류:")
        for category, count in categories.items():
            print(f"  - {category}: {count}개")
        
        # 샘플 질문 출력
        print(f"\n샘플 질문:")
        for i, q in enumerate(ai_questions[:5]):
            print(f"  {i+1}. [{q.category}] {q.question_text}")
        
    except Exception as e:
        print(f"❌ 확인 실패: {e}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
    finally:
        db.close()

if __name__ == "__main__":
    check_ai_questions() 