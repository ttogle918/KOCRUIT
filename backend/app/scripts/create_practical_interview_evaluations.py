#!/usr/bin/env python3
"""
실무진 면접 평가 더미데이터 생성 스크립트
기존 실무진 면접 질문-답변 로그에 평가 점수와 피드백을 추가합니다.
"""

import sys
import os
import random
from datetime import datetime, timedelta

# 프로젝트 루트 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import get_db
from app.models.interview_question_log import InterviewQuestionLog
from app.models.interview_evaluation import InterviewEvaluation
from app.models.application import Application
from app.models.job import JobPost
from sqlalchemy.orm import Session
from sqlalchemy import and_

def create_practical_interview_evaluations():
    """실무진 면접 평가 더미데이터 생성"""
    
    db = next(get_db())
    
    try:
        # 실무진 면접 질문-답변 로그 조회 (평가가 없는 것들)
        practical_logs = db.query(InterviewQuestionLog).filter(
            and_(
                InterviewQuestionLog.interview_type == "PRACTICAL",
                InterviewQuestionLog.score.is_(None)
            )
        ).all()
        
        print(f"평가할 실무진 면접 로그 수: {len(practical_logs)}")
        
        if not practical_logs:
            print("평가할 실무진 면접 로그가 없습니다.")
            return
        
        # 평가 기준별 점수 범위
        evaluation_criteria = {
            "전문성": {"min": 60, "max": 95},
            "문제해결능력": {"min": 65, "max": 90},
            "의사소통능력": {"min": 70, "max": 95},
            "팀워크": {"min": 60, "max": 90},
            "적응력": {"min": 65, "max": 85}
        }
        
        # 피드백 템플릿
        feedback_templates = {
            "전문성": [
                "해당 분야에 대한 깊은 이해도를 보여줍니다.",
                "기술적 지식이 충분히 갖춰져 있습니다.",
                "실무 경험이 부족한 부분이 있습니다.",
                "기본적인 지식은 있으나 심화 학습이 필요합니다."
            ],
            "문제해결능력": [
                "논리적이고 체계적인 문제 해결 방식을 보여줍니다.",
                "창의적인 해결책을 제시합니다.",
                "문제 상황을 정확히 파악하고 해결합니다.",
                "문제 해결 과정에서 개선의 여지가 있습니다."
            ],
            "의사소통능력": [
                "명확하고 이해하기 쉬운 설명을 제공합니다.",
                "적극적으로 의견을 표현하고 소통합니다.",
                "상대방의 의견을 경청하고 적절히 반응합니다.",
                "의사소통에서 개선이 필요한 부분이 있습니다."
            ],
            "팀워크": [
                "협력적이고 팀 중심의 사고를 보여줍니다.",
                "다른 구성원과의 원활한 협업이 가능합니다.",
                "팀 내 역할과 책임을 이해하고 수행합니다.",
                "개인보다는 팀의 성과를 우선시합니다."
            ],
            "적응력": [
                "새로운 환경과 상황에 빠르게 적응합니다.",
                "변화에 유연하게 대응하는 능력을 보여줍니다.",
                "학습 의지가 강하고 새로운 것을 받아들입니다.",
                "안정적인 환경에서 더 잘 수행할 수 있습니다."
            ]
        }
        
        for log in practical_logs:
            # 각 평가 기준별로 점수 생성
            total_score = 0
            evaluation_details = {}
            
            for criteria, score_range in evaluation_criteria.items():
                score = random.randint(score_range["min"], score_range["max"])
                total_score += score
                
                # 피드백 생성
                feedback = random.choice(feedback_templates[criteria])
                
                evaluation_details[criteria] = {
                    "score": score,
                    "feedback": feedback
                }
            
            # 평균 점수 계산
            average_score = total_score / len(evaluation_criteria)
            
            # 전체 피드백 생성
            overall_feedback = f"실무진 면접에서 {average_score:.1f}점을 획득했습니다. "
            if average_score >= 85:
                overall_feedback += "전반적으로 우수한 평가를 받았으며, 실무 적합성이 높습니다."
            elif average_score >= 75:
                overall_feedback += "양호한 평가를 받았으며, 일부 영역에서 개선의 여지가 있습니다."
            elif average_score >= 65:
                overall_feedback += "보통 수준의 평가를 받았으며, 여러 영역에서 개선이 필요합니다."
            else:
                overall_feedback += "개선이 필요한 평가를 받았으며, 추가적인 학습과 경험이 필요합니다."
            
            # 로그 업데이트
            log.score = round(average_score, 1)
            log.feedback = overall_feedback
            log.evaluation_details = evaluation_details
            log.evaluated_at = datetime.now()
            
            print(f"지원자 {log.application_id} - 실무진 면접 평가 완료: {average_score:.1f}점")
        
        # 데이터베이스에 저장
        db.commit()
        print(f"총 {len(practical_logs)}개의 실무진 면접 평가가 완료되었습니다.")
        
    except Exception as e:
        print(f"오류 발생: {e}")
        db.rollback()
    finally:
        db.close()

def create_executive_interview_questions():
    """임원진 면접 질문 생성"""
    
    db = next(get_db())
    
    try:
        # 실무진 면접을 통과한 지원자들 조회
        passed_applications = db.query(Application).filter(
            and_(
                Application.status == "PRACTICAL_PASSED",
                Application.job_post_id.isnot(None)
            )
        ).all()
        
        print(f"임원진 면접 대상 지원자 수: {len(passed_applications)}")
        
        if not passed_applications:
            print("임원진 면접 대상 지원자가 없습니다.")
            return
        
        # 임원진 면접 질문들
        executive_questions = [
            "본사에서의 경험과 지식을 바탕으로 우리 회사에 어떤 가치를 창출할 수 있을까요?",
            "앞으로 5년간의 커리어 계획과 우리 회사에서의 역할에 대해 말씀해 주세요.",
            "회사의 비전과 미션에 대해 어떻게 생각하시나요?",
            "리더십 경험이 있다면 어떤 방식으로 팀을 이끌었는지 구체적으로 설명해 주세요.",
            "어려운 상황에서 어떻게 의사결정을 하시나요?",
            "회사의 성장과 발전을 위해 어떤 제안을 하고 싶으신가요?",
            "다른 지원자들과 차별화되는 본인만의 강점은 무엇인가요?",
            "회사 문화와 본인의 가치관이 일치하는지 어떻게 생각하시나요?",
            "앞으로의 산업 트렌드와 우리 회사의 방향성에 대해 어떻게 생각하시나요?",
            "마지막으로 우리 회사에 꼭 합류하고 싶은 이유는 무엇인가요?"
        ]
        
        for application in passed_applications:
            # 각 지원자별로 3-5개의 질문 선택
            selected_questions = random.sample(executive_questions, random.randint(3, 5))
            
            for i, question in enumerate(selected_questions):
                # 임원진 면접 질문 로그 생성
                executive_log = InterviewQuestionLog(
                    application_id=application.id,
                    job_post_id=application.job_post_id,
                    question=question,
                    answer="",  # 아직 답변 없음
                    interview_type="EXECUTIVE",
                    question_order=i + 1,
                    created_at=datetime.now()
                )
                
                db.add(executive_log)
            
            # 지원자 상태를 임원진 면접 대기로 변경
            application.status = "EXECUTIVE_WAITING"
            application.updated_at = datetime.now()
            
            print(f"지원자 {application.id} - 임원진 면접 질문 {len(selected_questions)}개 생성 완료")
        
        # 데이터베이스에 저장
        db.commit()
        print(f"총 {len(passed_applications)}명의 임원진 면접 질문이 생성되었습니다.")
        
    except Exception as e:
        print(f"오류 발생: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=== 실무진 면접 평가 더미데이터 생성 시작 ===")
    create_practical_interview_evaluations()
    
    print("\n=== 임원진 면접 질문 생성 시작 ===")
    create_executive_interview_questions()
    
    print("\n=== 모든 작업 완료 ===") 