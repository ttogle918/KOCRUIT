#!/usr/bin/env python3
"""
임원진 면접 더미데이터 삽입 스크립트
"""

import sys
import os
import json
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 프로젝트 루트 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.models.interview_question_log import InterviewQuestionLog, InterviewType
from app.models.interview_evaluation import InterviewEvaluation, InterviewEvaluationItem, EvaluationType, EvaluationStatus

def insert_executive_interview_data():
    """임원진 면접 더미데이터 삽입"""
    
    # DB 연결
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("=== 임원진 면접 더미데이터 삽입 시작 ===")
        
        # 1. 임원진 면접 질문 로그 삽입
        print("\n📝 임원진 면접 질문 로그 삽입 중...")
        
        with open('/app/data/executive_interview_question_logs.json', 'r', encoding='utf-8') as f:
            question_logs_data = json.load(f)
        
        for log_data in question_logs_data['executive_interview_logs']:
            # 기존 데이터 확인
            existing_log = db.query(InterviewQuestionLog).filter(
                InterviewQuestionLog.application_id == log_data['application_id'],
                InterviewQuestionLog.interview_type == InterviewType.EXECUTIVE_INTERVIEW,
                InterviewQuestionLog.question_text == log_data['question_text']
            ).first()
            
            if not existing_log:
                question_log = InterviewQuestionLog(
                    application_id=log_data['application_id'],
                    interview_type=InterviewType.EXECUTIVE_INTERVIEW,
                    question_text=log_data['question_text'],
                    answer_text=log_data['answer_text'],
                    created_at=datetime.fromisoformat(log_data['created_at'].replace('Z', '+00:00'))
                )
                db.add(question_log)
                print(f"  ✅ 질문 로그 추가: 지원자 ID {log_data['application_id']}")
            else:
                print(f"  ⚠️ 기존 질문 로그 존재: 지원자 ID {log_data['application_id']}")
        
        # 2. 임원진 평가 결과 삽입
        print("\n📊 임원진 평가 결과 삽입 중...")
        
        with open('/app/data/executive_interview_evaluations.json', 'r', encoding='utf-8') as f:
            evaluations_data = json.load(f)
        
        for eval_data in evaluations_data['executive_evaluations']:
            # 기존 평가 확인
            existing_eval = db.query(InterviewEvaluation).filter(
                InterviewEvaluation.interview_id == eval_data['interview_id'],
                InterviewEvaluation.evaluation_type == EvaluationType.EXECUTIVE
            ).first()
            
            if not existing_eval:
                # 평가 생성
                evaluation = InterviewEvaluation(
                    interview_id=eval_data['interview_id'],
                    evaluator_id=eval_data['evaluator_id'],
                    is_ai=eval_data['is_ai'],
                    evaluation_type=EvaluationType.EXECUTIVE,
                    total_score=eval_data['total_score'],
                    summary=eval_data['summary'],
                    created_at=datetime.fromisoformat(eval_data['created_at'].replace('Z', '+00:00')),
                    updated_at=datetime.fromisoformat(eval_data['updated_at'].replace('Z', '+00:00')),
                    status=EvaluationStatus.SUBMITTED
                )
                db.add(evaluation)
                db.flush()  # ID 생성을 위해 flush
                
                # 평가 항목들 추가
                for item_data in eval_data['evaluation_items']:
                    evaluation_item = InterviewEvaluationItem(
                        evaluation_id=evaluation.id,
                        evaluate_type=item_data['evaluate_type'],
                        evaluate_score=item_data['evaluate_score'],
                        grade=item_data['grade'],
                        comment=item_data['comment']
                    )
                    db.add(evaluation_item)
                
                print(f"  ✅ 평가 결과 추가: 지원자 ID {eval_data['interview_id']} - {eval_data['total_score']}점")
            else:
                print(f"  ⚠️ 기존 평가 결과 존재: 지원자 ID {eval_data['interview_id']}")
        
        # 3. 지원자 상태 업데이트 (임원진 평가 완료)
        print("\n🔄 지원자 상태 업데이트 중...")
        
        from app.models.application import Application, SecondInterviewStatus
        
        evaluated_applications = [eval_data['interview_id'] for eval_data in evaluations_data['executive_evaluations']]
        
        for app_id in evaluated_applications:
            application = db.query(Application).filter(Application.id == app_id).first()
            if application:
                application.second_interview_status = SecondInterviewStatus.COMPLETED
                print(f"  ✅ 지원자 상태 업데이트: ID {app_id} → EXECUTIVE_INTERVIEW_COMPLETED")
        
        # 커밋
        db.commit()
        print(f"\n✅ 임원진 면접 더미데이터 삽입 완료!")
        
        # 4. 삽입 결과 요약
        print(f"\n📊 삽입 결과 요약:")
        
        # 질문 로그 개수
        question_logs_count = db.query(InterviewQuestionLog).filter(
            InterviewQuestionLog.interview_type == InterviewType.EXECUTIVE_INTERVIEW
        ).count()
        print(f"  - 임원진 면접 질문 로그: {question_logs_count}개")
        
        # 평가 결과 개수
        evaluations_count = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.evaluation_type == EvaluationType.EXECUTIVE
        ).count()
        print(f"  - 임원진 평가 결과: {evaluations_count}개")
        
        # 평가 완료 지원자 수
        completed_count = db.query(Application).filter(
            Application.second_interview_status == SecondInterviewStatus.COMPLETED
        ).count()
        print(f"  - 임원진 평가 완료 지원자: {completed_count}명")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    insert_executive_interview_data() 