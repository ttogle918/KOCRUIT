#!/usr/bin/env python3
"""
QuestionType enum 수정사항 테스트 스크립트
"""

import sys
import os

# 현재 스크립트의 디렉토리를 기준으로 backend 디렉토리 경로 설정
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal
from app.models.interview_question import InterviewQuestion, QuestionType

def test_question_type_fix():
    """QuestionType enum 수정사항 테스트"""
    db = SessionLocal()
    try:
        print("=== QuestionType Enum 테스트 ===")
        
        # 1. Enum 값들 확인
        print("1. Enum 값들:")
        for member in QuestionType:
            print(f"   {member.name} = '{member.value}'")
        
        # 2. 기존 데이터 확인
        print("\n2. 기존 데이터 확인:")
        existing_questions = db.query(InterviewQuestion).limit(5).all()
        for q in existing_questions:
            print(f"   ID: {q.id}, Type: {q.types}")
        
        # 3. 새로운 질문 생성 테스트
        print("\n3. 새로운 질문 생성 테스트:")
        test_question = InterviewQuestion(
            question_text="테스트 질문입니다.",
            category="test",
            difficulty="medium",
            job_post_id=1,
            types=QuestionType.AI_INTERVIEW
        )
        
        db.add(test_question)
        db.commit()
        print(f"   ✅ 테스트 질문 생성 성공: ID={test_question.id}")
        
        # 4. 생성된 질문 확인
        created_question = db.query(InterviewQuestion).filter(
            InterviewQuestion.id == test_question.id
        ).first()
        print(f"   생성된 질문 타입: {created_question.types}")
        
        # 5. 테스트 데이터 정리
        db.delete(test_question)
        db.commit()
        print("   ✅ 테스트 데이터 정리 완료")
        
        print("\n=== 모든 테스트 통과 ===")
        
    except Exception as e:
        print(f"❌ 테스트 실패: {e}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_question_type_fix() 