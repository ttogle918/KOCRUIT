#!/usr/bin/env python3
"""
기존 면접 평가 데이터 복원 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import get_db
from app.models.interview_evaluation import InterviewEvaluation, InterviewEvaluationItem, EvaluationType, EvaluationStatus
from datetime import datetime

def restore_interview_evaluation_data():
    """기존 면접 평가 데이터 복원"""
    db = next(get_db())
    
    try:
        print("=== 기존 면접 평가 데이터 복원 ===\n")
        
        # 1. 평가 메인 데이터 생성 (필요한 경우)
        evaluation_data = [
            {'id': 12, 'interview_id': 12, 'evaluation_type': '실무진', 'total_score': 25.0},
            {'id': 13, 'interview_id': 13, 'evaluation_type': '실무진', 'total_score': 21.0},
            {'id': 14, 'interview_id': 14, 'evaluation_type': 'AI', 'total_score': 22.5},
            {'id': 15, 'interview_id': 15, 'evaluation_type': '실무진', 'total_score': 17.0},
            {'id': 16, 'interview_id': 16, 'evaluation_type': '실무진', 'total_score': 29.0}
        ]
        
        for eval_data in evaluation_data:
            existing = db.query(InterviewEvaluation).filter(InterviewEvaluation.id == eval_data['id']).first()
            if not existing:
                evaluation = InterviewEvaluation(
                    id=eval_data['id'],
                    interview_id=eval_data['interview_id'],
                    evaluator_id=None,
                    is_ai=(eval_data['evaluation_type'] == 'AI'),
                    evaluation_type=EvaluationType.AI if eval_data['evaluation_type'] == 'AI' else EvaluationType.PRACTICAL,
                    total_score=eval_data['total_score'],
                    summary="기존 평가 데이터",
                    created_at=datetime(2025, 7, 17, 6, 30, 49),
                    updated_at=datetime(2025, 7, 17, 6, 30, 49),
                    status=EvaluationStatus.SUBMITTED
                )
                db.add(evaluation)
                print(f"✅ 평가 메인 데이터 생성: ID {eval_data['id']}")
            else:
                print(f"⚠️ 평가 메인 데이터 이미 존재: ID {eval_data['id']}")
        
        # 2. 평가 항목 데이터 삽입
        evaluation_items = [
            # 평가 ID 12
            (12, '인성_예의', 4.50, 'A', '매우 예의 바르고 정중함'),
            (12, '인성_성실성', 4.00, 'A', '성실하고 책임감이 강함'),
            (12, '인성_적극성', 4.00, 'A', '적극적으로 참여하고 의견 제시'),
            (12, '역량_기술력', 4.50, 'A', '기술력이 매우 우수함'),
            (12, '역량_문제해결', 4.00, 'A', '문제 해결 능력이 뛰어남'),
            (12, '역량_커뮤니케이션', 4.00, 'A', '의사소통이 명확하고 효과적'),
            
            # 평가 ID 13
            (13, '인성_예의', 3.50, 'B', '기본적인 예의는 갖춤'),
            (13, '인성_성실성', 4.00, 'A', '성실함'),
            (13, '인성_적극성', 3.00, 'B', '적극성 부족'),
            (13, '역량_기술력', 4.00, 'A', '기술력은 우수함'),
            (13, '역량_문제해결', 3.00, 'B', '문제 해결 능력 보통'),
            (13, '역량_커뮤니케이션', 2.50, 'C', '의사소통 개선 필요'),
            
            # 평가 ID 14
            (14, '인성_예의', 4.00, 'A', 'AI 평가: 예의 바른 태도'),
            (14, '인성_성실성', 3.50, 'B', 'AI 평가: 성실함'),
            (14, '인성_적극성', 4.00, 'A', 'AI 평가: 적극적 참여'),
            (14, '역량_기술력', 4.00, 'A', 'AI 평가: 기술력 우수'),
            (14, '역량_문제해결', 3.50, 'B', 'AI 평가: 문제 해결 능력 보통'),
            (14, '역량_커뮤니케이션', 3.50, 'B', 'AI 평가: 의사소통 보통'),
            
            # 평가 ID 15
            (15, '인성_예의', 3.00, 'B', '기본 예의는 있음'),
            (15, '인성_성실성', 2.50, 'C', '성실성 부족'),
            (15, '인성_적극성', 2.00, 'C', '적극성 매우 부족'),
            (15, '역량_기술력', 2.50, 'C', '기술력 부족'),
            (15, '역량_문제해결', 2.00, 'C', '문제 해결 능력 부족'),
            (15, '역량_커뮤니케이션', 3.00, 'B', '의사소통은 보통'),
            
            # 평가 ID 16
            (16, '인성_예의', 5.00, 'A', '완벽한 예의'),
            (16, '인성_성실성', 5.00, 'A', '완벽한 성실성'),
            (16, '인성_적극성', 5.00, 'A', '완벽한 적극성'),
            (16, '역량_기술력', 5.00, 'A', '완벽한 기술력'),
            (16, '역량_문제해결', 4.50, 'A', '뛰어난 문제 해결 능력'),
            (16, '역량_커뮤니케이션', 4.50, 'A', '뛰어난 의사소통 능력')
        ]
        
        inserted_count = 0
        for eval_id, eval_type, score, grade, comment in evaluation_items:
            existing = db.query(InterviewEvaluationItem).filter(
                InterviewEvaluationItem.evaluation_id == eval_id,
                InterviewEvaluationItem.evaluate_type == eval_type
            ).first()
            
            if not existing:
                item = InterviewEvaluationItem(
                    evaluation_id=eval_id,
                    evaluate_type=eval_type,
                    evaluate_score=score,
                    grade=grade,
                    comment=comment,
                    created_at=datetime(2025, 7, 17, 6, 30, 49)
                )
                db.add(item)
                inserted_count += 1
                print(f"✅ 평가 항목 추가: {eval_id} - {eval_type}")
            else:
                print(f"⚠️ 평가 항목 이미 존재: {eval_id} - {eval_type}")
        
        # 3. 변경사항 저장
        db.commit()
        
        print(f"\n✅ 데이터 복원 완료!")
        print(f"   - 삽입된 평가 항목: {inserted_count}개")
        
        # 4. 복원된 데이터 확인
        print(f"\n=== 복원된 데이터 확인 ===")
        for eval_id in [12, 13, 14, 15, 16]:
            items = db.query(InterviewEvaluationItem).filter(
                InterviewEvaluationItem.evaluation_id == eval_id
            ).all()
            
            print(f"평가 ID {eval_id}: {len(items)}개 항목")
            for item in items:
                print(f"  - {item.evaluate_type}: {item.evaluate_score} ({item.grade})")
        
    except Exception as e:
        print(f"❌ 데이터 복원 실패: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    restore_interview_evaluation_data() 