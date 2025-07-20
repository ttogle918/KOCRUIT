#!/usr/bin/env python3
"""
DB에 저장된 질문 수와 체크리스트 상태를 확인하는 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import SessionLocal
from app.models.interview_question import InterviewQuestion, QuestionType
from app.models.application import Application, InterviewStatus

def check_questions_db():
    db = SessionLocal()
    try:
        print("=== DB 질문 저장 상태 확인 ===")
        
        # 공고 17의 모든 지원자 조회
        applications = db.query(Application).filter(
            Application.job_post_id == 17
        ).all()
        
        print(f"총 지원자 수: {len(applications)}")
        
        # 각 지원자별 질문 수 확인
        total_questions = 0
        questions_by_type = {}
        
        for app in applications:
            app_questions = db.query(InterviewQuestion).filter(
                InterviewQuestion.application_id == app.id
            ).all()
            
            if app_questions:
                print(f"지원자 {app.id}: {len(app_questions)}개 질문")
                total_questions += len(app_questions)
                
                # 질문 타입별 분류
                for q in app_questions:
                    q_type = q.type
                    if q_type not in questions_by_type:
                        questions_by_type[q_type] = 0
                    questions_by_type[q_type] += 1
            else:
                print(f"지원자 {app.id}: 질문 없음")
        
        print(f"\n=== 전체 통계 ===")
        print(f"총 질문 수: {total_questions}")
        print(f"질문 타입별 분포:")
        for q_type, count in questions_by_type.items():
            print(f"  - {q_type}: {count}개")
        
        # AI 면접 일정 확정된 지원자 중 질문이 없는 지원자 확인
        ai_scheduled_no_questions = []
        for app in applications:
            if app.interview_status == InterviewStatus.AI_INTERVIEW_SCHEDULED.value:
                question_count = db.query(InterviewQuestion).filter(
                    InterviewQuestion.application_id == app.id
                ).count()
                if question_count == 0:
                    ai_scheduled_no_questions.append(app.id)
        
        if ai_scheduled_no_questions:
            print(f"\n⚠️ AI 면접 일정 확정되었지만 질문이 없는 지원자: {len(ai_scheduled_no_questions)}명")
            print(f"  - 지원자 ID: {ai_scheduled_no_questions[:10]}...")  # 처음 10개만 표시
        else:
            print(f"\n✅ 모든 AI 면접 일정 확정 지원자에게 질문이 생성됨")
        
        # 체크리스트 관련 질문 확인
        checklist_questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.application_id.in_([app.id for app in applications]),
            InterviewQuestion.content.contains("체크리스트")
        ).all()
        
        print(f"\n=== 체크리스트 관련 질문 ===")
        print(f"체크리스트 관련 질문 수: {len(checklist_questions)}")
        if checklist_questions:
            for i, q in enumerate(checklist_questions[:3], 1):
                print(f"  {i}. {q.content[:100]}...")
        
        return total_questions > 0
        
    except Exception as e:
        print(f"DB 확인 중 오류: {str(e)}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    check_questions_db() 