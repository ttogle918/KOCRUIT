#!/usr/bin/env python3
"""
평가 기준에 맞는 실제 평가 데이터를 랜덤으로 생성하는 스크립트
"""

import sys
import os
import random
import json
from datetime import datetime
from typing import List, Dict, Any

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import get_db
from app.models.evaluation_criteria import EvaluationCriteria
from app.models.interview_evaluation import InterviewEvaluation
from app.models.application import Application
from app.models.company_user import CompanyUser

def get_evaluation_criteria_for_job_post(job_post_id: int) -> List[EvaluationCriteria]:
    """특정 공고의 평가 기준 조회"""
    db = next(get_db())
    criteria = db.query(EvaluationCriteria).filter(
        EvaluationCriteria.job_post_id == job_post_id
    ).all()
    return criteria

def get_applications_for_job_post(job_post_id: int) -> List[Application]:
    """특정 공고의 지원자 목록 조회"""
    db = next(get_db())
    applications = db.query(Application).filter(
        Application.job_post_id == job_post_id
    ).all()
    return applications

def get_evaluators_by_type(evaluator_type: str) -> List[int]:
    """평가자 타입별 ID 목록 조회"""
    db = next(get_db())
    
    if evaluator_type == "practical":
        # 실무진 평가자 (3001-3003)
        evaluator_ids = [3001, 3002, 3003]
    elif evaluator_type == "executive":
        # 임원진 평가자 (3004-3006)
        evaluator_ids = [3004, 3005, 3006]
    else:
        evaluator_ids = []
    
    # 실제 존재하는 평가자만 필터링
    existing_evaluators = db.query(CompanyUser.id).filter(
        CompanyUser.id.in_(evaluator_ids)
    ).all()
    
    return [e.id for e in existing_evaluators]

def generate_random_score_for_item(item: Dict[str, Any], evaluator_bias: float = 0.0) -> Dict[str, Any]:
    """평가 항목별 랜덤 점수 생성"""
    max_score = item.get('max_score', 10)
    weight = item.get('weight', 1.0)
    
    # 평가자별 편향 적용 (평가자마다 다른 기준)
    base_score = random.uniform(6.0, 9.5)  # 기본 6-9.5점
    adjusted_score = min(max_score, max(0, base_score + evaluator_bias))
    
    # 소수점 1자리까지 반올림
    final_score = round(adjusted_score, 1)
    
    return {
        "item_name": item.get('item_name', ''),
        "score": final_score,
        "max_score": max_score,
        "weight": weight,
        "weighted_score": round(final_score * weight, 2),
        "comment": generate_random_comment(final_score, item.get('item_name', ''))
    }

def generate_random_comment(score: float, item_name: str) -> str:
    """점수에 따른 랜덤 코멘트 생성"""
    if score >= 9.0:
        comments = [
            f"{item_name}에 대해 매우 뛰어난 역량을 보여줍니다.",
            f"{item_name} 분야에서 탁월한 실력을 갖추고 있습니다.",
            f"{item_name}에 대한 깊은 이해와 실무 경험이 인상적입니다."
        ]
    elif score >= 7.5:
        comments = [
            f"{item_name}에 대해 충분한 역량을 보여줍니다.",
            f"{item_name} 분야에서 적절한 수준의 실력을 갖추고 있습니다.",
            f"{item_name}에 대한 기본적인 이해가 잘 되어 있습니다."
        ]
    elif score >= 6.0:
        comments = [
            f"{item_name}에 대해 보통 수준의 역량을 보여줍니다.",
            f"{item_name} 분야에서 개선의 여지가 있습니다.",
            f"{item_name}에 대한 이해가 다소 부족합니다."
        ]
    else:
        comments = [
            f"{item_name}에 대해 부족한 역량을 보여줍니다.",
            f"{item_name} 분야에서 많은 개선이 필요합니다.",
            f"{item_name}에 대한 이해가 매우 부족합니다."
        ]
    
    return random.choice(comments)

def create_evaluation_data(application: Application, criteria: EvaluationCriteria, evaluator_id: int) -> Dict[str, Any]:
    """평가 데이터 생성"""
    evaluation_items = criteria.evaluation_items or []
    
    if not evaluation_items:
        print(f"⚠️ {criteria.evaluation_type} ({criteria.interview_stage}) - 평가 항목이 없습니다.")
        return None
    
    # 평가자별 편향 설정 (평가자마다 다른 기준)
    evaluator_biases = {
        3001: 0.2,   # 실무진 1 - 약간 관대
        3002: -0.1,  # 실무진 2 - 약간 엄격
        3003: 0.0,   # 실무진 3 - 중간
        3004: 0.3,   # 임원진 1 - 관대
        3005: -0.2,  # 임원진 2 - 엄격
        3006: 0.1    # 임원진 3 - 약간 관대
    }
    
    evaluator_bias = evaluator_biases.get(evaluator_id, 0.0)
    
    # 각 평가 항목별 점수 생성
    item_scores = []
    total_weighted_score = 0.0
    total_weight = 0.0
    
    for item in evaluation_items:
        score_data = generate_random_score_for_item(item, evaluator_bias)
        item_scores.append(score_data)
        total_weighted_score += score_data['weighted_score']
        total_weight += item.get('weight', 1.0)
    
    # 총점 계산
    if total_weight > 0:
        total_score = round(total_weighted_score / total_weight, 2)
    else:
        total_score = round(sum(score['score'] for score in item_scores) / len(item_scores), 2)
    
    # 종합 평가 생성
    overall_summary = generate_overall_summary(total_score, criteria.interview_stage)
    
    return {
        "application_id": application.id,
        "evaluator_id": evaluator_id,
        "evaluation_type": criteria.interview_stage.upper(),
        "total_score": total_score,
        "evaluation_items": item_scores,
        "summary": overall_summary,
        "status": "completed"
    }

def generate_overall_summary(total_score: float, interview_stage: str) -> str:
    """종합 평가 요약 생성"""
    stage_name = "실무진" if interview_stage == "practical" else "임원진"
    
    if total_score >= 9.0:
        return f"{stage_name} 면접에서 매우 우수한 성과를 보였습니다. 모든 평가 항목에서 뛰어난 역량을 보여주었으며, 해당 직무에 매우 적합한 인재로 판단됩니다."
    elif total_score >= 7.5:
        return f"{stage_name} 면접에서 양호한 성과를 보였습니다. 대부분의 평가 항목에서 충분한 역량을 보여주었으며, 해당 직무에 적합한 인재로 판단됩니다."
    elif total_score >= 6.0:
        return f"{stage_name} 면접에서 보통 수준의 성과를 보였습니다. 일부 평가 항목에서 개선의 여지가 있으나, 전반적으로 적절한 수준입니다."
    else:
        return f"{stage_name} 면접에서 부족한 성과를 보였습니다. 대부분의 평가 항목에서 개선이 필요하며, 해당 직무에 대한 추가적인 역량 개발이 필요합니다."

def save_evaluation_to_db(evaluation_data: Dict[str, Any]) -> bool:
    """평가 데이터를 데이터베이스에 저장"""
    try:
        db = next(get_db())
        
        # 기존 평가 데이터 확인
        existing = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.application_id == evaluation_data['application_id'],
            InterviewEvaluation.evaluator_id == evaluation_data['evaluator_id'],
            InterviewEvaluation.evaluation_type == evaluation_data['evaluation_type']
        ).first()
        
        if existing:
            print(f"  ⏭️ 이미 평가 데이터가 존재합니다. 스킵합니다.")
            return False
        
        # 새로운 평가 데이터 생성
        new_evaluation = InterviewEvaluation(
            application_id=evaluation_data['application_id'],
            evaluator_id=evaluation_data['evaluator_id'],
            is_ai=False,
            evaluation_type=evaluation_data['evaluation_type'],
            total_score=evaluation_data['total_score'],
            score=evaluation_data['total_score'],  # 호환성을 위해
            summary=evaluation_data['summary'],
            status=evaluation_data['status']
        )
        
        db.add(new_evaluation)
        db.commit()
        
        print(f"  ✅ 평가자 {evaluation_data['evaluator_id']}: {evaluation_data['total_score']}점")
        return True
        
    except Exception as e:
        print(f"  ❌ 평가 데이터 저장 실패: {str(e)}")
        db.rollback()
        return False

def generate_evaluation_scores_for_job_post(job_post_id: int):
    """특정 공고의 모든 지원자에 대해 평가 점수 생성"""
    print(f"🎯 Job Post {job_post_id}의 평가 점수 생성 시작")
    
    # 평가 기준 조회
    criteria_list = get_evaluation_criteria_for_job_post(job_post_id)
    if not criteria_list:
        print(f"❌ Job Post {job_post_id}에 대한 평가 기준이 없습니다.")
        return
    
    # 지원자 목록 조회
    applications = get_applications_for_job_post(job_post_id)
    if not applications:
        print(f"❌ Job Post {job_post_id}에 대한 지원자가 없습니다.")
        return
    
    print(f"📊 평가 기준: {len(criteria_list)}개, 지원자: {len(applications)}명")
    
    # 평가 기준별로 처리
    for criteria in criteria_list:
        print(f"\n🔍 {criteria.evaluation_type} ({criteria.interview_stage}) 평가 기준 처리 중...")
        
        # 평가자 목록 조회
        evaluators = get_evaluators_by_type(criteria.interview_stage)
        if not evaluators:
            print(f"  ⚠️ {criteria.interview_stage} 평가자가 없습니다.")
            continue
        
        print(f"  👥 평가자: {evaluators}")
        
        # 각 지원자에 대해 평가 데이터 생성
        for application in applications:
            print(f"\n  👤 지원자 {application.id} ({application.applicant_user.name if application.applicant_user else 'Unknown'})")
            
            # 각 평가자별로 평가 데이터 생성
            for evaluator_id in evaluators:
                evaluation_data = create_evaluation_data(application, criteria, evaluator_id)
                
                if evaluation_data:
                    save_evaluation_to_db(evaluation_data)
    
    print(f"\n✅ Job Post {job_post_id}의 평가 점수 생성 완료!")

def main():
    """메인 함수"""
    if len(sys.argv) != 2:
        print("사용법: python generate_evaluation_scores_from_criteria.py <job_post_id>")
        print("예시: python generate_evaluation_scores_from_criteria.py 17")
        return
    
    try:
        job_post_id = int(sys.argv[1])
        generate_evaluation_scores_for_job_post(job_post_id)
        
    except ValueError:
        print("❌ job_post_id는 숫자여야 합니다.")
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")

if __name__ == "__main__":
    main() 