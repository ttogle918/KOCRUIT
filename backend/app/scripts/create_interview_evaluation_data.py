#!/usr/bin/env python3
"""
면접 평가 더미 데이터 생성 스크립트
면접관이 실제로 평가한 것처럼 interview_evaluation 테이블에 데이터를 생성합니다.
"""

import sys
import os
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import get_db, engine
from app.models.application import Application
from app.models.interview_evaluation import InterviewEvaluation
from app.models.interview import Interview
from app.models.company_user import CompanyUser

def create_interview_evaluation_data(job_post_id: int = None):
    """면접 평가 더미 데이터 생성"""
    db = next(get_db())
    
    try:
        # 평가자 ID 목록 (실무진: 3001-3003, 임원진: 3004-3006)
        practical_evaluators = [3001, 3002, 3003]  # 실무진 평가자
        executive_evaluators = [3004, 3005, 3006]  # 임원진 평가자
        
        # 지원자 조회
        query = db.query(Application)
        if job_post_id:
            query = query.filter(Application.job_post_id == job_post_id)
        
        applications = query.all()
        
        if not applications:
            print(f"❌ 지원자를 찾을 수 없습니다. (job_post_id: {job_post_id})")
            return
        
        print(f"🎯 총 {len(applications)}명의 지원자에 대해 평가 데이터를 생성합니다.")
        
        created_count = 0
        
        for application in applications:
            print(f"\n📋 지원자 ID: {application.id} (이력서 ID: {application.resume_id})")
            
            # 기존 평가 데이터 확인
            existing_evaluations = db.query(InterviewEvaluation).filter(
                InterviewEvaluation.interview_id.in_(
                    db.query(Interview.id).filter(Interview.application_id == application.id)
                )
            ).all()
            
            if existing_evaluations:
                print(f"⚠️ 지원자 {application.id}는 이미 평가 데이터가 있습니다. 건너뜁니다.")
                continue
            
            # 면접 데이터 조회
            interviews = db.query(Interview).filter(Interview.application_id == application.id).all()
            
            if not interviews:
                print(f"⚠️ 지원자 {application.id}의 면접 데이터가 없습니다. 건너뜁니다.")
                continue
            
            for interview in interviews:
                print(f"  📝 면접 ID: {interview.id} ({interview.interview_type})")
                
                # 면접 타입에 따른 평가자 선택
                if interview.interview_type == 'practical':
                    evaluators = practical_evaluators
                    evaluation_type = 'practical'
                elif interview.interview_type == 'executive':
                    evaluators = executive_evaluators
                    evaluation_type = 'executive'
                else:
                    # AI 면접은 건너뛰기
                    print(f"    ⚠️ AI 면접은 건너뜁니다.")
                    continue
                
                # 각 평가자별로 평가 데이터 생성
                for evaluator_id in evaluators:
                    # 평가 점수 생성 (현실적인 분포)
                    scores = generate_realistic_scores(evaluation_type)
                    
                    # 평가 데이터 생성
                    evaluation = InterviewEvaluation(
                        interview_id=interview.id,
                        evaluator_id=evaluator_id,
                        is_ai=False,  # 사람이 평가
                        evaluation_type=evaluation_type.upper(),
                        total_score=scores['total_score'],
                        score=scores['total_score'],  # 동일한 값 사용
                        summary=generate_evaluation_summary(scores, evaluation_type),
                        status='completed',
                        created_at=datetime.now() - timedelta(days=random.randint(1, 30)),
                        updated_at=datetime.now()
                    )
                    
                    db.add(evaluation)
                    created_count += 1
                    
                    print(f"    ✅ 평가자 {evaluator_id}: {scores['total_score']}점")
        
        # DB 커밋
        db.commit()
        print(f"\n🎉 총 {created_count}개의 평가 데이터가 생성되었습니다!")
        
        # 생성된 데이터 요약
        print_summary(db, job_post_id)
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

def generate_realistic_scores(evaluation_type: str) -> dict:
    """현실적인 평가 점수 생성"""
    if evaluation_type == 'practical':
        # 실무진 면접: 기술적 역량 중심, 점수 분포가 더 높음
        base_score = random.choices(
            [7, 8, 9, 10],  # 높은 점수 비중이 더 많음
            weights=[0.1, 0.3, 0.4, 0.2]  # 가중치
        )[0]
        
        # 세부 점수들 (기술적 역량, 실무 경험, 커뮤니케이션 등)
        technical_score = random.randint(base_score - 1, min(10, base_score + 1))
        experience_score = random.randint(base_score - 2, min(10, base_score + 1))
        communication_score = random.randint(base_score - 2, min(10, base_score + 1))
        problem_solving_score = random.randint(base_score - 1, min(10, base_score + 1))
        
        total_score = round((technical_score + experience_score + communication_score + problem_solving_score) / 4, 1)
        
    else:  # executive
        # 임원진 면접: 리더십/인성 중심, 점수 분포가 더 엄격함
        base_score = random.choices(
            [6, 7, 8, 9, 10],  # 더 넓은 분포
            weights=[0.2, 0.3, 0.3, 0.15, 0.05]  # 가중치
        )[0]
        
        # 세부 점수들 (리더십, 전략적 사고, 인성, 성장 잠재력 등)
        leadership_score = random.randint(base_score - 2, min(10, base_score + 1))
        strategic_thinking_score = random.randint(base_score - 2, min(10, base_score + 1))
        personality_score = random.randint(base_score - 1, min(10, base_score + 1))
        potential_score = random.randint(base_score - 2, min(10, base_score + 1))
        
        total_score = round((leadership_score + strategic_thinking_score + personality_score + potential_score) / 4, 1)
    
    return {
        'total_score': total_score,
        'technical_score': technical_score if evaluation_type == 'practical' else None,
        'leadership_score': leadership_score if evaluation_type == 'executive' else None
    }

def generate_evaluation_summary(scores: dict, evaluation_type: str) -> str:
    """평가 요약 생성"""
    total_score = scores['total_score']
    
    if evaluation_type == 'practical':
        if total_score >= 9.0:
            return "뛰어난 기술적 역량과 실무 경험을 보유하고 있습니다. 즉시 투입 가능한 수준이며, 팀에 큰 기여를 할 것으로 예상됩니다."
        elif total_score >= 8.0:
            return "양호한 기술적 역량을 보유하고 있으며, 충분한 실무 경험이 있습니다. 적절한 온보딩 후 성과를 낼 것으로 예상됩니다."
        elif total_score >= 7.0:
            return "기본적인 기술적 역량은 갖추고 있으나, 일부 영역에서 추가 학습이 필요합니다. 지도하에 성과를 낼 수 있을 것으로 예상됩니다."
        else:
            return "기술적 역량이 부족하며, 상당한 교육과 지도가 필요합니다. 장기적 관점에서 고려해볼 만합니다."
    
    else:  # executive
        if total_score >= 9.0:
            return "뛰어난 리더십과 전략적 사고를 보유하고 있습니다. 조직의 핵심 인재로 성장할 잠재력이 높습니다."
        elif total_score >= 8.0:
            return "양호한 리더십 역량을 보유하고 있으며, 조직 문화에 잘 적응할 것으로 예상됩니다. 관리자로 성장 가능성이 있습니다."
        elif total_score >= 7.0:
            return "기본적인 리더십 역량은 갖추고 있으나, 일부 영역에서 추가 개발이 필요합니다. 지속적인 멘토링이 필요합니다."
        else:
            return "리더십 역량이 부족하며, 개인 contributor로서의 역할이 더 적합할 것으로 판단됩니다."

def print_summary(db: Session, job_post_id: int = None):
    """생성된 데이터 요약 출력"""
    print(f"\n📊 생성된 평가 데이터 요약:")
    
    # 전체 평가 데이터 통계
    total_evaluations = db.query(InterviewEvaluation).count()
    practical_evaluations = db.query(InterviewEvaluation).filter(
        InterviewEvaluation.evaluation_type == 'PRACTICAL'
    ).count()
    executive_evaluations = db.query(InterviewEvaluation).filter(
        InterviewEvaluation.evaluation_type == 'EXECUTIVE'
    ).count()
    
    print(f"  📈 총 평가 수: {total_evaluations}")
    print(f"  🔧 실무진 평가: {practical_evaluations}")
    print(f"  👔 임원진 평가: {executive_evaluations}")
    
    # 평균 점수
    avg_score = db.query(func.avg(InterviewEvaluation.total_score)).scalar()
    if avg_score:
        print(f"  📊 평균 점수: {avg_score:.2f}")
    
    # 점수 분포
    score_ranges = [
        (9.0, 10.0, "우수 (9-10점)"),
        (8.0, 8.9, "양호 (8-8.9점)"),
        (7.0, 7.9, "보통 (7-7.9점)"),
        (0.0, 6.9, "미흡 (0-6.9점)")
    ]
    
    print(f"  📋 점수 분포:")
    for min_score, max_score, label in score_ranges:
        count = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.total_score >= min_score,
            InterviewEvaluation.total_score <= max_score
        ).count()
        percentage = (count / total_evaluations * 100) if total_evaluations > 0 else 0
        print(f"    {label}: {count}개 ({percentage:.1f}%)")

def main():
    """메인 함수"""
    if len(sys.argv) > 1:
        job_post_id = int(sys.argv[1])
        print(f"🎯 공고 ID {job_post_id}에 대한 평가 데이터를 생성합니다.")
    else:
        job_post_id = None
        print("🎯 모든 공고에 대한 평가 데이터를 생성합니다.")
    
    create_interview_evaluation_data(job_post_id)

if __name__ == "__main__":
    main() 