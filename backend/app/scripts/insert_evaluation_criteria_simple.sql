-- 평가 기준 테이블에 기본 평가 항목 삽입 (단순 버전)
-- 프로시저 없이 직접 INSERT 문 사용

-- 1. 실무진 면접용 평가 항목 (개별 삽입)
INSERT INTO evaluation_criteria (
    resume_id,
    application_id,
    evaluation_type,
    interview_stage,
    company_name,
    suggested_criteria,
    weight_recommendations,
    evaluation_questions,
    scoring_guidelines,
    evaluation_items,
    total_weight,
    max_total_score,
    created_at,
    updated_at
) VALUES (
    1, -- resume_id (실제 값으로 변경 필요)
    1, -- application_id (실제 값으로 변경 필요)
    'resume_based',
    'practical',
    'KOSA공공',
    JSON_ARRAY(
        JSON_OBJECT('criterion', '기술 역량', 'description', '기술적 능력과 실무 적용 가능성', 'max_score', 5),
        JSON_OBJECT('criterion', '경험 및 성과', 'description', '프로젝트 경험과 성과', 'max_score', 5),
        JSON_OBJECT('criterion', '문제해결 능력', 'description', '문제 인식 및 해결 능력', 'max_score', 5),
        JSON_OBJECT('criterion', '의사소통 및 협업', 'description', '팀워크와 의사소통 능력', 'max_score', 5),
        JSON_OBJECT('criterion', '성장 의지', 'description', '학습 의지와 성장 가능성', 'max_score', 5)
    ),
    JSON_ARRAY(
        JSON_OBJECT('criterion', '기술 역량', 'weight', 0.30, 'reason', '직무 수행의 핵심 요소'),
        JSON_OBJECT('criterion', '경험 및 성과', 'weight', 0.25, 'reason', '업무 적응력과 성과 예측'),
        JSON_OBJECT('criterion', '문제해결 능력', 'weight', 0.20, 'reason', '실무에서의 문제 대응 능력'),
        JSON_OBJECT('criterion', '의사소통 및 협업', 'weight', 0.15, 'reason', '팀워크와 소통 능력'),
        JSON_OBJECT('criterion', '성장 의지', 'weight', 0.10, 'reason', '장기적 성장 가능성')
    ),
    JSON_ARRAY(
        '주요 기술 스택에 대한 깊이 있는 이해도를 보여주세요.',
        '가장 성공적이었던 프로젝트 경험을 구체적으로 설명해주세요.',
        '팀 프로젝트에서 갈등 상황을 어떻게 해결했는지 예시를 들어주세요.',
        '새로운 기술을 학습한 경험과 적용 방법을 설명해주세요.',
        '우리 회사의 가치관과 본인의 가치관이 어떻게 일치하는지 설명해주세요.'
    ),
    JSON_OBJECT(
        'excellent', '9-10점: 모든 기준을 충족하고 뛰어난 역량 보유',
        'good', '7-8점: 대부분의 기준을 충족하고 양호한 역량 보유',
        'average', '5-6점: 기본적인 기준은 충족하나 개선 필요',
        'poor', '3-4점: 기준 미달로 추가 개발 필요'
    ),
    JSON_ARRAY(
        JSON_OBJECT(
            'item_name', '기술 역량',
            'description', '지원자의 기술적 능력과 실무 적용 가능성',
            'max_score', 5,
            'scoring_criteria', JSON_OBJECT(
                '5점', '우수 - 해당 분야 전문가 수준',
                '4점', '양호 - 실무 가능한 수준',
                '3점', '보통 - 기본적인 수준',
                '2점', '미흡 - 개선 필요',
                '1점', '부족 - 학습 필요'
            ),
            'evaluation_questions', JSON_ARRAY(
                '주요 기술 스택에 대한 이해도를 설명해주세요',
                '실무에서 해당 기술을 어떻게 활용하시겠습니까?'
            ),
            'weight', 0.30
        ),
        JSON_OBJECT(
            'item_name', '경험 및 성과',
            'description', '지원자의 프로젝트 경험과 성과',
            'max_score', 5,
            'scoring_criteria', JSON_OBJECT(
                '5점', '우수 - 뛰어난 성과와 경험',
                '4점', '양호 - 충분한 경험과 성과',
                '3점', '보통 - 기본적인 경험',
                '2점', '미흡 - 경험 부족',
                '1점', '부족 - 경험 없음'
            ),
            'evaluation_questions', JSON_ARRAY(
                '가장 성공적이었던 프로젝트 경험을 설명해주세요',
                '본인의 기여도와 성과를 구체적으로 설명해주세요'
            ),
            'weight', 0.25
        ),
        JSON_OBJECT(
            'item_name', '문제해결 능력',
            'description', '지원자의 문제 인식 및 해결 능력',
            'max_score', 5,
            'scoring_criteria', JSON_OBJECT(
                '5점', '우수 - 창의적이고 효과적인 해결',
                '4점', '양호 - 논리적이고 체계적인 해결',
                '3점', '보통 - 기본적인 해결 능력',
                '2점', '미흡 - 해결 능력 부족',
                '1점', '부족 - 문제 인식 어려움'
            ),
            'evaluation_questions', JSON_ARRAY(
                '어려운 문제를 해결한 경험을 설명해주세요',
                '예상치 못한 상황에 어떻게 대응하시겠습니까?'
            ),
            'weight', 0.20
        ),
        JSON_OBJECT(
            'item_name', '의사소통 및 협업',
            'description', '지원자의 팀워크와 의사소통 능력',
            'max_score', 5,
            'scoring_criteria', JSON_OBJECT(
                '5점', '우수 - 뛰어난 소통과 리더십',
                '4점', '양호 - 원활한 소통과 협업',
                '3점', '보통 - 기본적인 소통 능력',
                '2점', '미흡 - 소통 능력 부족',
                '1점', '부족 - 소통 어려움'
            ),
            'evaluation_questions', JSON_ARRAY(
                '팀 프로젝트에서의 역할과 기여도를 설명해주세요',
                '갈등 상황을 어떻게 해결하시겠습니까?'
            ),
            'weight', 0.15
        ),
        JSON_OBJECT(
            'item_name', '성장 의지',
            'description', '지원자의 학습 의지와 성장 가능성',
            'max_score', 5,
            'scoring_criteria', JSON_OBJECT(
                '5점', '우수 - 뛰어난 학습 의지와 계획',
                '4점', '양호 - 적극적인 학습 의지',
                '3점', '보통 - 기본적인 학습 의지',
                '2점', '미흡 - 학습 의지 부족',
                '1점', '부족 - 학습 의지 없음'
            ),
            'evaluation_questions', JSON_ARRAY(
                '새로운 기술을 학습한 경험을 설명해주세요',
                '앞으로의 성장 계획을 구체적으로 제시해주세요'
            ),
            'weight', 0.10
        )
    ),
    1.0,
    25,
    NOW(),
    NOW()
);

-- 2. 임원진 면접용 평가 항목 (개별 삽입)
INSERT INTO evaluation_criteria (
    resume_id,
    application_id,
    evaluation_type,
    interview_stage,
    company_name,
    suggested_criteria,
    weight_recommendations,
    evaluation_questions,
    scoring_guidelines,
    evaluation_items,
    total_weight,
    max_total_score,
    created_at,
    updated_at
) VALUES (
    1, -- resume_id (실제 값으로 변경 필요)
    1, -- application_id (실제 값으로 변경 필요)
    'resume_based',
    'executive',
    'KOSA공공',
    JSON_ARRAY(
        JSON_OBJECT('criterion', '리더십', 'description', '팀 리딩과 의사결정 능력', 'max_score', 5),
        JSON_OBJECT('criterion', '전략적 사고', 'description', '비전 제시와 전략 수립 능력', 'max_score', 5),
        JSON_OBJECT('criterion', '인성과 가치관', 'description', '윤리의식과 조직 문화 적합성', 'max_score', 5),
        JSON_OBJECT('criterion', '성장 잠재력', 'description', '미래 성장 가능성과 동기부여', 'max_score', 5)
    ),
    JSON_ARRAY(
        JSON_OBJECT('criterion', '리더십', 'weight', 0.30, 'reason', '임원진의 핵심 역량'),
        JSON_OBJECT('criterion', '전략적 사고', 'weight', 0.25, 'reason', '조직의 미래 방향성 설정'),
        JSON_OBJECT('criterion', '인성과 가치관', 'weight', 0.25, 'reason', '조직 문화와의 적합성'),
        JSON_OBJECT('criterion', '성장 잠재력', 'weight', 0.20, 'reason', '장기적 성장 가능성')
    ),
    JSON_ARRAY(
        '팀을 이끌어본 경험을 설명해주세요.',
        '조직의 미래 비전을 어떻게 설정하시겠습니까?',
        '윤리적 딜레마 상황을 어떻게 해결하시겠습니까?',
        '앞으로의 성장 계획을 설명해주세요.'
    ),
    JSON_OBJECT(
        'excellent', '9-10점: 모든 기준을 충족하고 뛰어난 역량 보유',
        'good', '7-8점: 대부분의 기준을 충족하고 양호한 역량 보유',
        'average', '5-6점: 기본적인 기준은 충족하나 개선 필요',
        'poor', '3-4점: 기준 미달로 추가 개발 필요'
    ),
    JSON_ARRAY(
        JSON_OBJECT(
            'item_name', '리더십',
            'description', '팀 리딩과 의사결정 능력',
            'max_score', 5,
            'scoring_criteria', JSON_OBJECT(
                '5점', '우수 - 뛰어난 리더십과 의사결정 능력',
                '4점', '양호 - 양호한 리더십과 의사결정 능력',
                '3점', '보통 - 일반적인 리더십과 의사결정 능력',
                '2점', '미흡 - 제한적인 리더십과 의사결정 능력',
                '1점', '부족 - 리더십과 의사결정 능력 부족'
            ),
            'evaluation_questions', JSON_ARRAY(
                '팀을 이끌어본 경험을 설명해주세요',
                '어려운 의사결정을 내린 경험을 설명해주세요'
            ),
            'weight', 0.30
        ),
        JSON_OBJECT(
            'item_name', '전략적 사고',
            'description', '비전 제시와 전략 수립 능력',
            'max_score', 5,
            'scoring_criteria', JSON_OBJECT(
                '5점', '우수 - 뛰어난 전략적 사고와 비전 제시 능력',
                '4점', '양호 - 양호한 전략적 사고와 비전 제시 능력',
                '3점', '보통 - 일반적인 전략적 사고와 비전 제시 능력',
                '2점', '미흡 - 제한적인 전략적 사고와 비전 제시 능력',
                '1점', '부족 - 전략적 사고와 비전 제시 능력 부족'
            ),
            'evaluation_questions', JSON_ARRAY(
                '조직의 미래 비전을 어떻게 설정하시겠습니까?',
                '시장 변화에 대응하는 전략을 설명해주세요'
            ),
            'weight', 0.25
        ),
        JSON_OBJECT(
            'item_name', '인성과 가치관',
            'description', '윤리의식과 조직 문화 적합성',
            'max_score', 5,
            'scoring_criteria', JSON_OBJECT(
                '5점', '우수 - 뛰어난 윤리의식과 조직 문화 적합성',
                '4점', '양호 - 양호한 윤리의식과 조직 문화 적합성',
                '3점', '보통 - 일반적인 윤리의식과 조직 문화 적합성',
                '2점', '미흡 - 제한적인 윤리의식과 조직 문화 적합성',
                '1점', '부족 - 윤리의식과 조직 문화 적합성 부족'
            ),
            'evaluation_questions', JSON_ARRAY(
                '윤리적 딜레마 상황을 어떻게 해결하시겠습니까?',
                '조직의 가치관과 본인의 가치관이 일치하는지 설명해주세요'
            ),
            'weight', 0.25
        ),
        JSON_OBJECT(
            'item_name', '성장 잠재력',
            'description', '미래 성장 가능성과 동기부여',
            'max_score', 5,
            'scoring_criteria', JSON_OBJECT(
                '5점', '우수 - 뛰어난 성장 잠재력과 강한 동기부여',
                '4점', '양호 - 양호한 성장 잠재력과 동기부여',
                '3점', '보통 - 일반적인 성장 잠재력과 동기부여',
                '2점', '미흡 - 제한적인 성장 잠재력과 동기부여',
                '1점', '부족 - 성장 잠재력과 동기부여 부족'
            ),
            'evaluation_questions', JSON_ARRAY(
                '앞으로의 성장 계획을 설명해주세요',
                '이 직무에 지원한 동기를 설명해주세요'
            ),
            'weight', 0.20
        )
    ),
    1.0,
    20,
    NOW(),
    NOW()
);

-- 사용법:
-- 1. resume_id와 application_id를 실제 값으로 변경
-- 2. company_name을 실제 회사명으로 변경
-- 3. 필요에 따라 여러 개의 INSERT 문을 추가 