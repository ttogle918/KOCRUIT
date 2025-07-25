#!/usr/bin/env python3
"""
Docker 컨테이너 내부에서 임원진 면접 데이터를 직접 생성하는 스크립트
"""

import json
import os
from datetime import datetime
import random

def create_executive_data():
    """임원진 면접 데이터 생성"""
    
    # data 디렉토리 생성
    os.makedirs('/app/data', exist_ok=True)
    
    # 1. 임원진 평가 항목 및 질문 생성
    executive_questions = {
        "executive_evaluation_criteria": [
            {
                "criterion": "리더십",
                "weight": 0.25,
                "description": "팀을 이끌고 조직의 목표를 달성할 수 있는 리더십 역량",
                "questions": [
                    "이전에 팀을 이끌었던 경험이 있다면, 가장 어려웠던 상황과 어떻게 해결했는지 설명해주세요.",
                    "팀원 간 갈등이 발생했을 때 어떻게 중재하고 해결하시겠습니까?",
                    "조직의 비전을 팀원들에게 어떻게 전달하고 공감을 얻으시겠습니까?",
                    "성과가 좋지 않은 팀원을 어떻게 동기부여하고 성장시킬 수 있을까요?",
                    "새로운 변화를 조직에 도입할 때 저항을 어떻게 극복하시겠습니까?"
                ]
            },
            {
                "criterion": "전략적 사고",
                "weight": 0.20,
                "description": "장기적 관점에서 비즈니스 전략을 수립하고 실행할 수 있는 능력",
                "questions": [
                    "우리 회사의 5년 후 미래를 어떻게 그려보시나요?",
                    "시장 변화에 대응하는 전략적 방향성을 어떻게 설정하시겠습니까?",
                    "경쟁사와의 차별화 전략을 어떻게 수립하시겠습니까?",
                    "새로운 사업 기회를 발굴하고 평가하는 기준은 무엇인가요?",
                    "리스크 관리와 성장 기회의 균형을 어떻게 맞추시겠습니까?"
                ]
            },
            {
                "criterion": "조직 적응력",
                "weight": 0.15,
                "description": "조직 문화에 빠르게 적응하고 기여할 수 있는 능력",
                "questions": [
                    "새로운 조직에 합류했을 때 가장 먼저 하시는 일은 무엇인가요?",
                    "조직의 기존 문화와 본인의 가치관이 다를 때 어떻게 대처하시겠습니까?",
                    "다양한 부서와의 협업을 어떻게 원활하게 진행하시겠습니까?",
                    "조직의 변화 과정에서 본인의 역할을 어떻게 정의하시겠습니까?",
                    "기존 조직의 장점을 어떻게 파악하고 활용하시겠습니까?"
                ]
            },
            {
                "criterion": "비전 제시",
                "weight": 0.15,
                "description": "명확한 비전을 제시하고 조직을 이끌어갈 수 있는 능력",
                "questions": [
                    "본인이 생각하는 이상적인 조직의 모습은 무엇인가요?",
                    "팀원들이 따라올 수 있는 명확한 목표를 어떻게 설정하시겠습니까?",
                    "조직의 미래 방향성을 어떻게 제시하고 공감을 얻으시겠습니까?",
                    "변화하는 환경에서도 일관된 비전을 유지하는 방법은 무엇인가요?",
                    "팀원들의 개인적 성장과 조직의 성장을 어떻게 연결시키시겠습니까?"
                ]
            },
            {
                "criterion": "의사결정 능력",
                "weight": 0.15,
                "description": "복잡한 상황에서 신속하고 정확한 의사결정을 할 수 있는 능력",
                "questions": [
                    "제한된 정보로 중요한 의사결정을 해야 할 때 어떤 기준을 사용하시겠습니까?",
                    "여러 대안이 있을 때 최적의 선택을 어떻게 하시겠습니까?",
                    "의사결정의 결과가 좋지 않았을 때 어떻게 대처하시겠습니까?",
                    "팀원들의 의견이 분분할 때 어떻게 결론을 내리시겠습니까?",
                    "장기적 관점과 단기적 성과의 균형을 어떻게 맞추시겠습니까?"
                ]
            },
            {
                "criterion": "인성 및 가치관",
                "weight": 0.10,
                "description": "올바른 가치관과 윤리의식을 바탕으로 한 인성",
                "questions": [
                    "본인의 핵심 가치관은 무엇이며, 이것이 업무에 어떻게 반영되나요?",
                    "윤리적 딜레마 상황에서 어떻게 판단하시겠습니까?",
                    "조직의 이익과 사회적 책임의 균형을 어떻게 맞추시겠습니까?",
                    "실수를 했을 때 어떻게 대처하고 책임을 지시겠습니까?",
                    "팀원들에게 본인이 보여주고 싶은 롤모델은 누구인가요?"
                ]
            }
        ]
    }
    
    # 2. 임원진 면접 질답 로그 생성
    executive_question_logs = {
        "executive_interview_logs": [
            {
                "application_id": 43,
                "interview_type": "EXECUTIVE_INTERVIEW",
                "question_text": "이전에 팀을 이끌었던 경험이 있다면, 가장 어려웠던 상황과 어떻게 해결했는지 설명해주세요.",
                "answer_text": "이전 회사에서 신규 프로젝트를 진행할 때 팀원 8명을 이끌었습니다. 가장 어려웠던 상황은 프로젝트 중간에 주요 기술 스택이 변경되어야 했던 것입니다. 팀원들의 저항이 있었지만, 개별 면담을 통해 우려사항을 듣고, 새로운 기술의 장점과 학습 계획을 제시했습니다. 결국 팀 전체가 새로운 기술을 받아들여 프로젝트를 성공적으로 완료했습니다.",
                "created_at": "2024-01-15T10:00:00Z"
            },
            {
                "application_id": 43,
                "interview_type": "EXECUTIVE_INTERVIEW",
                "question_text": "우리 회사의 5년 후 미래를 어떻게 그려보시나요?",
                "answer_text": "AI 기술의 발전과 함께 자동화가 더욱 확산될 것으로 예상됩니다. 하지만 인간의 창의성과 판단력은 여전히 중요할 것입니다. 우리 회사는 AI를 활용한 효율성 증대와 함께, 인간 고유의 역량을 극대화하는 방향으로 발전해야 한다고 생각합니다. 특히 고객과의 직접적인 소통과 창의적 문제해결 능력에서 차별화된 가치를 제공할 수 있을 것입니다.",
                "created_at": "2024-01-15T10:15:00Z"
            },
            {
                "application_id": 47,
                "interview_type": "EXECUTIVE_INTERVIEW",
                "question_text": "팀원 간 갈등이 발생했을 때 어떻게 중재하고 해결하시겠습니까?",
                "answer_text": "갈등의 원인을 정확히 파악하는 것이 가장 중요합니다. 개별 면담을 통해 각자의 입장을 듣고, 객관적 사실과 주관적 감정을 구분합니다. 그 후 중립적 입장에서 양쪽의 관점을 조율하고, 공통의 목표를 상기시킵니다. 필요시 팀 전체 회의를 통해 투명하게 문제를 해결하고, 향후 유사한 갈등을 방지할 수 있는 시스템을 구축합니다.",
                "created_at": "2024-01-16T14:00:00Z"
            },
            {
                "application_id": 60,
                "interview_type": "EXECUTIVE_INTERVIEW",
                "question_text": "조직의 비전을 팀원들에게 어떻게 전달하고 공감을 얻으시겠습니까?",
                "answer_text": "비전을 단순히 전달하는 것이 아니라, 각 팀원의 개인적 목표와 연결시켜 공감을 얻습니다. 정기적인 1:1 면담을 통해 개인의 성장 목표를 파악하고, 조직의 비전이 개인의 성장에 어떻게 도움이 되는지 구체적으로 설명합니다. 또한 비전 달성 과정에서 각자의 역할과 기여도를 명확히 하여 소속감과 책임감을 느낄 수 있도록 합니다.",
                "created_at": "2024-01-17T09:00:00Z"
            },
            {
                "application_id": 62,
                "interview_type": "EXECUTIVE_INTERVIEW",
                "question_text": "성과가 좋지 않은 팀원을 어떻게 동기부여하고 성장시킬 수 있을까요?",
                "answer_text": "성과 부족의 원인을 정확히 파악하는 것이 중요합니다. 개별 코칭과 멘토링을 통해 구체적인 개선 방안을 제시하고, 단계적 목표 설정을 통해 성취감을 느낄 수 있도록 합니다. 또한 팀 전체의 지원 시스템을 구축하여 함께 성장할 수 있는 환경을 만듭니다.",
                "created_at": "2024-01-18T11:00:00Z"
            },
            {
                "application_id": 80,
                "interview_type": "EXECUTIVE_INTERVIEW",
                "question_text": "경쟁사와의 차별화 전략을 어떻게 수립하시겠습니까?",
                "answer_text": "시장 분석을 통해 경쟁사의 강점과 약점을 파악하고, 우리 조직의 고유한 역량을 식별합니다. 고객의 니즈를 깊이 이해하여 경쟁사가 제공하지 못하는 가치를 창출하고, 이를 지속적으로 발전시킵니다. 또한 조직의 핵심 역량을 강화하여 경쟁사가 쉽게 모방할 수 없는 차별화 요소를 구축합니다.",
                "created_at": "2024-01-19T15:00:00Z"
            }
        ]
    }
    
    # executive_question_logs 생성 후, job_post_id=17 할당
    for log in executive_question_logs["executive_interview_logs"]:
        log["job_post_id"] = 17
    
    # 3. 임원진 평가 결과 생성 (자동화)
    applicants = [43, 47, 60]
    evaluators = [3108, 3004, 3043]
    criteria = [
        "리더십", "전략적 사고", "조직 적응력", "비전 제시", "의사결정 능력", "인성 및 가치관"
    ]
    executive_evaluations = {"executive_evaluations": []}

    for interview_id in applicants:
        for evaluator_id in evaluators:
            executive_evaluations["executive_evaluations"].append({
                "interview_id": interview_id,
                "evaluator_id": evaluator_id,
                "is_ai": False,
                "evaluation_type": "EXECUTIVE",
                "total_score": round(random.uniform(80, 95), 1),
                "summary": f"지원자 {interview_id}에 대한 평가자 {evaluator_id}의 평가입니다.",
                "created_at": "2024-01-20T10:00:00Z",
                "updated_at": "2024-01-20T10:00:00Z",
                "status": "SUBMITTED",
                "evaluation_items": [
                    {
                        "evaluate_type": c,
                        "evaluate_score": round(random.uniform(75, 98), 1),
                        "grade": random.choice(["A+", "A", "B+"]),
                        "comment": f"{c}에 대한 평가 코멘트"
                    } for c in criteria
                ]
            })

    # 파일 저장
    with open('/app/data/executive_interview_questions.json', 'w', encoding='utf-8') as f:
        json.dump(executive_questions, f, ensure_ascii=False, indent=2)
    
    with open('/app/data/executive_interview_question_logs.json', 'w', encoding='utf-8') as f:
        json.dump(executive_question_logs, f, ensure_ascii=False, indent=2)
    
    with open('/app/data/executive_interview_evaluations.json', 'w', encoding='utf-8') as f:
        json.dump(executive_evaluations, f, ensure_ascii=False, indent=2)
    
    print("✅ 임원진 면접 데이터 파일들이 생성되었습니다!")
    print("📁 생성된 파일들:")
    print("  - /app/data/executive_interview_questions.json")
    print("  - /app/data/executive_interview_question_logs.json")
    print("  - /app/data/executive_interview_evaluations.json")

        # executive_question_logs 생성 후, job_post_id=17 할당
    for log in executive_question_logs["executive_interview_logs"]:
        log["job_post_id"] = 17
        
if __name__ == "__main__":
    create_executive_data() 