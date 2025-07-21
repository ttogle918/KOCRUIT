#!/usr/bin/env python3
"""
일반 면접 질문 데이터베이스
AI 면접에서 사용할 일반적인 질문들
"""

GENERAL_QUESTIONS = {
    "self_introduction": [
        {
            "id": "si_1",
            "question": "본인의 장단점은 무엇인가요?",
            "category": "self_introduction",
            "time_limit": 120,
            "difficulty": "easy",
            "evaluation_focus": ["self_awareness", "honesty", "communication"]
        },
        {
            "id": "si_2", 
            "question": "실패 경험을 말해주시고, 어떻게 극복했나요?",
            "category": "self_introduction",
            "time_limit": 120,
            "difficulty": "medium",
            "evaluation_focus": ["resilience", "problem_solving", "learning_ability"]
        },
        {
            "id": "si_3",
            "question": "인생에서 가장 의미 있었던 경험은 무엇인가요?",
            "category": "self_introduction", 
            "time_limit": 120,
            "difficulty": "medium",
            "evaluation_focus": ["values", "motivation", "communication"]
        },
        {
            "id": "si_4",
            "question": "우리 회사에 지원한 이유는 무엇인가요?",
            "category": "self_introduction",
            "time_limit": 120,
            "difficulty": "easy",
            "evaluation_focus": ["motivation", "company_research", "communication"]
        },
        {
            "id": "si_5",
            "question": "앞으로의 커리어 계획은 어떻게 되시나요?",
            "category": "self_introduction",
            "time_limit": 120,
            "difficulty": "medium",
            "evaluation_focus": ["career_planning", "motivation", "realistic_thinking"]
        }
    ],
    
    "situational_judgment": [
        {
            "id": "sj_1",
            "question": "동료와 갈등이 생겼을 때 어떻게 해결하나요?",
            "category": "situational_judgment",
            "time_limit": 120,
            "difficulty": "medium",
            "evaluation_focus": ["conflict_resolution", "teamwork", "communication"]
        },
        {
            "id": "sj_2",
            "question": "마감 기한이 촉박한 업무가 주어진다면 어떻게 대처하겠습니까?",
            "category": "situational_judgment",
            "time_limit": 120,
            "difficulty": "medium",
            "evaluation_focus": ["time_management", "stress_handling", "prioritization"]
        },
        {
            "id": "sj_3",
            "question": "고객이 불만을 제기할 때 당신의 대응 방식은?",
            "category": "situational_judgment",
            "time_limit": 120,
            "difficulty": "medium",
            "evaluation_focus": ["customer_service", "problem_solving", "emotional_intelligence"]
        },
        {
            "id": "sj_4",
            "question": "팀 프로젝트에서 의견이 맞지 않는 상황이 발생했다면 어떻게 대처하시겠습니까?",
            "category": "situational_judgment",
            "time_limit": 120,
            "difficulty": "medium",
            "evaluation_focus": ["teamwork", "communication", "problem_solving"]
        },
        {
            "id": "sj_5",
            "question": "업무 중 예상치 못한 문제가 발생했을 때 어떻게 해결하시겠습니까?",
            "category": "situational_judgment",
            "time_limit": 120,
            "difficulty": "hard",
            "evaluation_focus": ["problem_solving", "adaptability", "stress_handling"]
        },
        {
            "id": "sj_6",
            "question": "새로운 기술이나 방법을 배워야 할 때 어떻게 접근하시나요?",
            "category": "situational_judgment",
            "time_limit": 120,
            "difficulty": "medium",
            "evaluation_focus": ["learning_ability", "adaptability", "motivation"]
        },
        {
            "id": "sj_7",
            "question": "업무와 개인생활의 균형을 어떻게 맞추시겠습니까?",
            "category": "situational_judgment",
            "time_limit": 120,
            "difficulty": "easy",
            "evaluation_focus": ["work_life_balance", "time_management", "self_management"]
        },
        {
            "id": "sj_8",
            "question": "스트레스 상황에서 어떻게 스스로를 관리하시나요?",
            "category": "situational_judgment",
            "time_limit": 120,
            "difficulty": "medium",
            "evaluation_focus": ["stress_management", "self_awareness", "resilience"]
        }
    ],
    
    "values_and_ethics": [
        {
            "id": "ve_1",
            "question": "직장에서 가장 중요하다고 생각하는 가치는 무엇인가요?",
            "category": "values_and_ethics",
            "time_limit": 120,
            "difficulty": "medium",
            "evaluation_focus": ["values", "self_awareness", "communication"]
        },
        {
            "id": "ve_2",
            "question": "윤리적 딜레마 상황에서 어떻게 판단하시겠습니까?",
            "category": "values_and_ethics",
            "time_limit": 120,
            "difficulty": "hard",
            "evaluation_focus": ["ethics", "decision_making", "values"]
        },
        {
            "id": "ve_3",
            "question": "성공적인 직장생활을 위해 가장 중요한 것은 무엇이라고 생각하시나요?",
            "category": "values_and_ethics",
            "time_limit": 120,
            "difficulty": "medium",
            "evaluation_focus": ["career_philosophy", "values", "motivation"]
        }
    ]
}

# 게임 테스트 정의
GAME_TESTS = [
    {
        "id": "memory_test",
        "name": "숫자 기억력 테스트",
        "description": "화면에 나타나는 숫자를 순서대로 기억하세요",
        "type": "memory",
        "difficulty_levels": [4, 5, 6, 7, 8, 9],  # 숫자 개수
        "duration": 30,  # 초
        "evaluation_focus": ["memory", "concentration", "cognitive_ability"]
    },
    {
        "id": "pattern_test",
        "name": "패턴 찾기 테스트", 
        "description": "화면에 나타나는 도형이나 숫자의 규칙을 찾으세요",
        "type": "pattern",
        "difficulty_levels": ["easy", "medium", "hard"],
        "duration": 45,
        "evaluation_focus": ["pattern_recognition", "logical_thinking", "cognitive_ability"]
    },
    {
        "id": "reaction_test",
        "name": "반응 속도 테스트",
        "description": "특정 색이나 도형이 나타나면 빠르게 클릭하세요",
        "type": "reaction",
        "difficulty_levels": ["easy", "medium", "hard"],
        "duration": 30,
        "evaluation_focus": ["reaction_speed", "attention", "cognitive_ability"]
    },
    {
        "id": "attention_test",
        "name": "집중력 테스트",
        "description": "화면에 나타나는 특정 조건의 요소만 선택하세요",
        "type": "attention",
        "difficulty_levels": ["easy", "medium", "hard"],
        "duration": 40,
        "evaluation_focus": ["attention", "focus", "cognitive_ability"]
    }
]

def get_random_general_questions(count: int = 7) -> list:
    """일반 질문 중 랜덤으로 선택"""
    import random
    
    all_questions = []
    for category, questions in GENERAL_QUESTIONS.items():
        all_questions.extend(questions)
    
    # 중복 없이 랜덤 선택
    selected_questions = random.sample(all_questions, min(count, len(all_questions)))
    
    # ID 재정렬
    for i, question in enumerate(selected_questions, 1):
        question["display_id"] = i
    
    return selected_questions

def get_random_game_test() -> dict:
    """랜덤 게임 테스트 선택"""
    import random
    return random.choice(GAME_TESTS)

def get_question_by_category(category: str, count: int = 3) -> list:
    """특정 카테고리에서 질문 선택"""
    import random
    
    if category not in GENERAL_QUESTIONS:
        return []
    
    questions = GENERAL_QUESTIONS[category]
    selected_questions = random.sample(questions, min(count, len(questions)))
    
    # ID 재정렬
    for i, question in enumerate(selected_questions, 1):
        question["display_id"] = i
    
    return selected_questions 