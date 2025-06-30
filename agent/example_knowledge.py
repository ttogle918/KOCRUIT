# 지식 베이스에 추가할 수 있는 예제 데이터

EXAMPLE_DOCUMENTS = [
    # 기술 관련 문서
    "Python은 1991년 프로그래머인 귀도 반 로섬이 발표한 고급 프로그래밍 언어입니다. 파이썬의 특징은 플랫폼 독립적이며 인터프리터식, 객체지향적, 동적 타이핑 대화형 언어입니다.",
    
    "JavaScript는 웹 브라우저에서 주로 사용되는 프로그래밍 언어입니다. HTML과 CSS와 함께 웹의 핵심 기술 중 하나로, 웹 페이지의 동적 기능을 구현하는 데 사용됩니다.",
    
    "React는 Facebook에서 개발한 JavaScript 라이브러리입니다. 사용자 인터페이스를 구축하기 위한 컴포넌트 기반 라이브러리로, 단방향 데이터 플로우를 사용합니다.",
    
    # 회사 관련 문서
    "우리 회사는 2020년에 설립된 IT 스타트업입니다. 주요 사업 분야는 인공지능과 머신러닝 솔루션 개발이며, 현재 50명의 직원이 근무하고 있습니다.",
    
    "회사의 핵심 가치는 혁신, 협력, 고객 중심입니다. 우리는 최신 기술을 활용하여 고객의 문제를 해결하고, 지속적인 성장을 추구합니다.",
    
    "연봉은 경력과 기술 수준에 따라 3,000만원부터 8,000만원까지 협의 가능합니다. 복리후생으로는 건강보험, 국민연금, 4대보험, 점심식대, 교통비 지원이 있습니다.",
    
    # 업무 관련 문서
    "개발팀은 프론트엔드, 백엔드, AI/ML, DevOps 팀으로 구성되어 있습니다. 각 팀은 8-12명의 개발자로 구성되어 있으며, 애자일 방법론을 사용합니다.",
    
    "주요 기술 스택은 프론트엔드에서 React, TypeScript, 백엔드에서 Python, Django, 데이터베이스에서 PostgreSQL, 클라우드에서 AWS를 사용합니다.",
    
    "업무 시간은 오전 9시부터 오후 6시까지이며, 유연근무제를 운영합니다. 원격 근무도 가능하며, 주 2일까지 재택근무가 허용됩니다."
]

EXAMPLE_METADATA = [
    {"source": "tech_docs", "topic": "programming", "category": "python"},
    {"source": "tech_docs", "topic": "programming", "category": "javascript"},
    {"source": "tech_docs", "topic": "frontend", "category": "react"},
    {"source": "company_docs", "topic": "company_info", "category": "general"},
    {"source": "company_docs", "topic": "company_values", "category": "culture"},
    {"source": "company_docs", "topic": "compensation", "category": "hr"},
    {"source": "work_docs", "topic": "team_structure", "category": "organization"},
    {"source": "work_docs", "topic": "tech_stack", "category": "technology"},
    {"source": "work_docs", "topic": "work_schedule", "category": "hr"}
]

def get_example_knowledge():
    """예제 지식 데이터 반환"""
    return {
        "documents": EXAMPLE_DOCUMENTS,
        "metadata": EXAMPLE_METADATA
    }

if __name__ == "__main__":
    # 예제 데이터 출력
    knowledge = get_example_knowledge()
    print("예제 문서 수:", len(knowledge["documents"]))
    print("예제 메타데이터 수:", len(knowledge["metadata"]))
    
    for i, (doc, meta) in enumerate(zip(knowledge["documents"], knowledge["metadata"])):
        print(f"\n문서 {i+1}:")
        print(f"내용: {doc[:100]}...")
        print(f"메타데이터: {meta}")