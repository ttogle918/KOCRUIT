from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
from typing import Optional

load_dotenv()
TAVILY_API_KEY = os.getenv("OPENAI_API_KEY")

# 1. 인성질문 리스트 템플릿 (고정)
FIXED_QUESTIONS = {
    "personality": [
        "자기소개 해주세요.",
        "우리 회사에 지원한 이유는 무엇인가요?",
        "이 직무를 선택한 이유는 무엇인가요?",
        "본인의 강점과 약점은 무엇인가요?",
        "팀워크 경험을 말해보세요.",
        "갈등을 겪었을 때 어떻게 해결하시나요?",
        "스트레스를 어떻게 관리하나요?",
        "스스로를 어떻게 동기부여하나요?",
        "리더십을 발휘한 경험이 있나요?",
        "실패를 경험한 적이 있나요? 어떻게 극복하셨나요?"
    ]
}

llm = ChatOpenAI(model="gpt-4o")

project_prompt = PromptTemplate.from_template(
    """
    다음은 지원자의 자기소개서 또는 이력서 요약입니다:
    """
    "{resume_text}"
    """
    위 내용을 바탕으로 프로젝트 기반 면접 질문 5개를 생성해 주세요.
    경험, 역할, 갈등, 성과, 배운 점 등과 관련된 질문을 포함해 주세요.
    """
)

company_prompt = PromptTemplate.from_template(
    """
    "{company_name}"에 대한 회사 소개, 최근 뉴스, 산업 동향을 바탕으로 면접에서 사용할 수 있는 질문을 4개 생성해 주세요.
    - 회사 미션, 핵심 가치, 최근 보도, 업계 트렌드에 대한 인식을 묻는 질문을 포함해 주세요.
    - 각 질문은 한 줄로 명확하게 작성해 주세요.
    """
)

generate_project_questions = LLMChain(llm=llm, prompt=project_prompt)
generate_company_questions = LLMChain(llm=llm, prompt=company_prompt)

# 3. 전체 질문 통합 함수

def generate_common_question_bundle(resume_text: str, company_name: Optional[str] = None):
    personality_questions = FIXED_QUESTIONS["personality"]

    # 프로젝트 질문 생성
    project_qs = generate_project_questions.invoke({"resume_text": resume_text})
    project_questions = project_qs.get("text", "").strip().split("\n")

    # 회사 관련 질문 (임시 비우기 or 추후 연결)
    company_questions = []
    if company_name:
        company_qs = generate_company_questions.invoke({"company_name": company_name})
        company_questions = company_qs.get("text", "").strip().split("\n")
    
    # 상황 질문 템플릿
    scenario_questions = [
        "업무 중 예기치 못한 문제를 마주쳤을 때 어떻게 해결하셨나요?",
        "일정이 지연됐을 때 어떻게 대응하시나요?",
        "의사결정이 어려웠던 상황을 경험한 적이 있나요?",
        "실무 중 커뮤니케이션이 꼬였던 사례가 있나요? 어떻게 풀었나요?"
    ]

    return {
        "인성/동기": personality_questions,
        "프로젝트 경험": project_questions,
        "회사 관련": company_questions,
        "상황 대처": scenario_questions
    }

def company_info_scraping_tool(company_name):
    # 실제로는 requests/BeautifulSoup 등으로 스크래핑
    # 예시: 네이버 뉴스, 공식 홈페이지 등
    # 여기서는 더미 데이터
    return {
        "company_info": f"{company_name}는 IT 서비스와 반도체 분야에서 선도적인 기업입니다.",
        "company_news": "2024년 7월, AI 반도체 신제품 출시 및 글로벌 시장 진출 발표"
    }

def generate_company_questions(company_name):
    info = company_info_scraping_tool(company_name)
    prompt = PromptTemplate.from_template(
        """
        회사명: {company_name}
        회사 소개: {company_info}
        최근 뉴스: {company_news}

        위 정보를 참고하여, 아래와 같은 질문을 생성해 주세요:
        1. 지원자가 우리 회사에 대해 얼마나 알고 있는지 확인하는 질문
        2. 최근 회사 소식/신기술/뉴스에 대해 묻는 질문
        3. 회사의 미래/비전에 대해 의견을 묻는 질문
        """
    )
    llm_chain = LLMChain(llm=llm, prompt=prompt)
    result = llm_chain.invoke({
        "company_name": company_name,
        "company_info": info["company_info"],
        "company_news": info["company_news"]
    })