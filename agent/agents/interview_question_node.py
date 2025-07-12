from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
from typing import Optional
from langchain.tools.tavily_search import TavilySearchResults
from langchain.chains.summarize import load_summarize_chain
from langchain_core.documents import Document

load_dotenv()
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

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

# Tavily 검색 도구 초기화
search_tool = TavilySearchResults()
summarize_chain = load_summarize_chain(llm, chain_type="stuff")

# 자기소개서 요약 프롬프트
resume_summary_prompt = PromptTemplate.from_template(
    """
    다음은 지원자의 자기소개서 또는 이력서입니다:
    ---
    {resume_text}
    ---
    
    위 내용을 바탕으로 지원자의 프로젝트 경험을 요약해 주세요.
    다음 항목들을 포함해서 작성해 주세요:
    1. 주요 프로젝트 3-4개
    2. 각 프로젝트에서의 역할과 기여도
    3. 사용한 기술 스택
    4. 프로젝트 규모 (팀 인원, 기간 등)
    5. 주요 성과나 결과
    
    요약은 300자 이내로 간결하게 작성해 주세요.
    """
)

# 프로젝트 기반 질문 생성 프롬프트 (개선)
project_prompt = PromptTemplate.from_template(
    """
    다음은 지원자의 프로젝트 경험 요약입니다:
    ---
    {resume_summary}
    ---
    
    포트폴리오 정보 (있는 경우):
    ---
    {portfolio_info}
    ---
    
    위 내용을 바탕으로 프로젝트 기반 면접 질문 5개를 생성해 주세요.
    각 질문은 다음 중 하나 이상의 요소를 포함해야 합니다:
    
    1. **역할과 기여**: 프로젝트에서 맡은 역할과 구체적인 기여도
    2. **기술적 도전**: 기술적 어려움과 해결 방법
    3. **팀워크와 갈등**: 팀 내 협업 과정과 갈등 해결
    4. **성과와 결과**: 프로젝트 성과와 측정 가능한 결과
    5. **배운 점**: 프로젝트를 통해 얻은 인사이트나 성장
    
    질문은 구체적이고 실제 면접에서 사용할 수 있는 수준으로 작성해 주세요.
    각 질문은 한 줄로 명확하게 작성해 주세요.
    """
)

# 인재상 기반 질문 생성 프롬프트
values_prompt = PromptTemplate.from_template(
    """
    다음은 "{company_name}"의 인재상, 핵심가치, 기업문화에 대한 정보입니다:
    ---
    {company_values}
    ---
    이 내용을 바탕으로, 면접에서 사용할 수 있는 인재상/가치관 관련 질문을 4개 생성해 주세요.
    회사의 핵심가치와 인재상에 부합하는 지원자인지 확인하는 질문으로 만들어 주세요.
    각 질문은 한 줄로 명확하게 작성해 주세요.
    """
)

# 뉴스/기술 기반 질문 생성 프롬프트
news_prompt = PromptTemplate.from_template(
    """
    다음은 "{company_name}"의 최근 뉴스, 기술 동향, 산업 동향에 대한 정보입니다:
    ---
    {company_news}
    ---
    이 내용을 바탕으로, 면접에서 사용할 수 있는 최신 동향 관련 질문을 3개 생성해 주세요.
    회사의 최신 기술, 뉴스, 업계 트렌드에 대한 인식을 묻는 질문을 포함해 주세요.
    각 질문은 한 줄로 명확하게 작성해 주세요.
    """
)

# 직무 기반 질문 생성 프롬프트
job_prompt = PromptTemplate.from_template(
    """
    다음은 공고 정보입니다:
    ---
    {job_info}
    ---
    
    지원자의 이력서 정보:
    ---
    {resume_text}
    ---
    
    직무 매칭 정보:
    ---
    {job_matching_info}
    ---
    
    위 정보를 바탕으로 직무 맞춤형 면접 질문을 생성해 주세요.
    다음 카테고리별로 질문을 생성해 주세요:
    
    1. **직무 적합성** (3개): 지원자의 경험과 공고 요구사항의 매칭도
    2. **기술 스택** (3개): 공고에서 요구하는 기술에 대한 질문
    3. **업무 이해도** (2개): 직무 내용에 대한 이해도 확인
    4. **경력 활용** (2개): 과거 경험을 새 직무에 적용하는 방법
    5. **상황 대처** (2개): 직무 관련 문제 해결 능력
    
    각 질문은 구체적이고 실제 면접에서 사용할 수 있는 수준으로 작성해 주세요.
    지원자의 경험과 공고 요구사항을 연결하는 질문을 만들어 주세요.
    """
)

# LLM 체인 초기화
generate_resume_summary = LLMChain(llm=llm, prompt=resume_summary_prompt)
generate_project_questions = LLMChain(llm=llm, prompt=project_prompt)
generate_values_questions = LLMChain(llm=llm, prompt=values_prompt)
generate_news_questions = LLMChain(llm=llm, prompt=news_prompt)
generate_job_questions = LLMChain(llm=llm, prompt=job_prompt)

# 3. 전체 질문 통합 함수
def generate_common_question_bundle(resume_text: str, company_name: Optional[str] = None, portfolio_info: str = ""):
    personality_questions = FIXED_QUESTIONS["personality"]

    # 자기소개서 요약
    resume_summary_result = generate_resume_summary.invoke({"resume_text": resume_text})
    resume_summary = resume_summary_result.get("text", "")

    # 프로젝트 질문 생성 (포트폴리오 정보 포함)
    project_result = generate_project_questions.invoke({
        "resume_summary": resume_summary,
        "portfolio_info": portfolio_info or "포트폴리오 정보가 없습니다."
    })
    project_questions = [q.strip() for q in project_result.get("text", "").split("\n") if q.strip()]

    # 회사 관련 질문 (인재상 + 뉴스 기반)
    company_questions = []
    if company_name:
        company_questions = generate_company_questions(company_name)
    
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
        "상황 대처": scenario_questions,
        "자기소개서 요약": resume_summary
    }

def generate_company_questions(company_name: str):
    """회사명을 기반으로 인재상과 뉴스를 모두 고려한 질문 생성"""
    try:
        # 1. 인재상/가치관 검색
        values_search_results = search_tool.invoke({
            "query": f"{company_name} 인재상 OR 핵심가치 OR 기업문화 OR 기업이념"
        })
        
        # 검색 결과 처리 개선
        values_docs = []
        if isinstance(values_search_results, list):
            for item in values_search_results:
                if isinstance(item, dict):
                    content = item.get("content") or item.get("snippet", "")
                    if content:
                        values_docs.append(Document(page_content=content))
        
        values_summary = ""
        if values_docs:
            values_summary = summarize_chain.run(values_docs)
        else:
            values_summary = f"{company_name}의 인재상과 기업문화에 대한 정보를 찾을 수 없습니다."

        # 2. 뉴스/기술 동향 검색
        news_search_results = search_tool.invoke({
            "query": f"{company_name} 최신뉴스 OR 기술동향 OR 산업동향"
        })
        
        # 검색 결과 처리 개선
        news_docs = []
        if isinstance(news_search_results, list):
            for item in news_search_results:
                if isinstance(item, dict):
                    content = item.get("content") or item.get("snippet", "")
                    if content:
                        news_docs.append(Document(page_content=content))
        
        news_summary = ""
        if news_docs:
            news_summary = summarize_chain.run(news_docs)
        else:
            news_summary = f"{company_name}의 최신 뉴스와 기술 동향에 대한 정보를 찾을 수 없습니다."

        # 3. 인재상 기반 질문 생성
        values_result = generate_values_questions.invoke({
            "company_name": company_name,
            "company_values": values_summary
        })
        values_text = values_result.get("text", "")
        values_questions = [q.strip() for q in values_text.split("\n") if q.strip()]

        # 4. 뉴스 기반 질문 생성
        news_result = generate_news_questions.invoke({
            "company_name": company_name,
            "company_news": news_summary
        })
        news_text = news_result.get("text", "")
        news_questions = [q.strip() for q in news_text.split("\n") if q.strip()]

        # 5. 결과 통합
        all_company_questions = []
        all_company_questions.extend(values_questions)
        all_company_questions.extend(news_questions)

        # 질문이 없으면 기본 질문 추가
        if not all_company_questions:
            all_company_questions = [
                f"{company_name}에 지원한 이유는 무엇인가요?",
                f"{company_name}의 미래 비전에 대해 어떻게 생각하시나요?",
                f"{company_name}에서 일하고 싶은 이유는 무엇인가요?"
            ]

        return all_company_questions

    except Exception as e:
        print(f"회사 질문 생성 중 오류: {str(e)}")
        # 오류 시 기본 질문 반환
        return [
            f"{company_name}에 지원한 이유는 무엇인가요?",
            f"{company_name}의 미래 비전에 대해 어떻게 생각하시나요?",
            f"{company_name}에서 일하고 싶은 이유는 무엇인가요?"
        ]

def company_info_scraping_tool(company_name):
    # 실제로는 requests/BeautifulSoup 등으로 스크래핑
    # 예시: 네이버 뉴스, 공식 홈페이지 등
    # 여기서는 더미 데이터
    return {
        "company_info": f"{company_name}는 IT 서비스와 반도체 분야에서 선도적인 기업입니다.",
        "company_news": "2024년 7월, AI 반도체 신제품 출시 및 글로벌 시장 진출 발표"
    }

def generate_job_question_bundle(resume_text: str, job_info: str, company_name: str = "", job_matching_info: str = ""):
    """직무 기반 면접 질문 생성"""
    
    # 직무 맞춤형 질문 생성
    job_result = generate_job_questions.invoke({
        "job_info": job_info,
        "resume_text": resume_text,
        "job_matching_info": job_matching_info
    })
    
    job_questions_text = job_result.get("text", "")
    
    # 질문을 카테고리별로 분류
    questions_by_category = {
        "직무 적합성": [],
        "기술 스택": [],
        "업무 이해도": [],
        "경력 활용": [],
        "상황 대처": []
    }
    
    # 텍스트를 줄별로 분리하여 카테고리별로 분류
    lines = job_questions_text.split("\n")
    current_category = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # 카테고리 헤더 확인
        if "직무 적합성" in line:
            current_category = "직무 적합성"
        elif "기술 스택" in line:
            current_category = "기술 스택"
        elif "업무 이해도" in line:
            current_category = "업무 이해도"
        elif "경력 활용" in line:
            current_category = "경력 활용"
        elif "상황 대처" in line:
            current_category = "상황 대처"
        elif line.startswith(("1.", "2.", "3.", "4.", "5.")) and current_category:
            # 번호가 있는 질문
            question = line.split(".", 1)[1].strip() if "." in line else line
            if question and current_category in questions_by_category:
                questions_by_category[current_category].append(question)
        elif current_category and line and not line.startswith(("-", "•", "*")):
            # 일반 질문
            if current_category in questions_by_category:
                questions_by_category[current_category].append(line)
    
    # 각 카테고리에 기본 질문 추가 (AI가 생성하지 못한 경우)
    if not questions_by_category["직무 적합성"]:
        questions_by_category["직무 적합성"] = [
            "이 직무에 지원한 구체적인 이유는 무엇인가요?",
            "본인의 경험이 이 직무에 어떻게 도움이 될 것 같나요?",
            "이 직무에서 가장 중요한 역량은 무엇이라고 생각하시나요?"
        ]
    
    if not questions_by_category["기술 스택"]:
        questions_by_category["기술 스택"] = [
            "공고에서 요구하는 기술 중 가장 자신 있는 것은 무엇인가요?",
            "새로운 기술을 배우는 데 얼마나 시간이 걸리시나요?",
            "기술 트렌드를 어떻게 파악하고 계시나요?"
        ]
    
    if not questions_by_category["업무 이해도"]:
        questions_by_category["업무 이해도"] = [
            "이 직무에서 가장 어려운 부분은 무엇이라고 생각하시나요?",
            "업무 성과를 어떻게 측정할 수 있을까요?"
        ]
    
    if not questions_by_category["경력 활용"]:
        questions_by_category["경력 활용"] = [
            "과거 경험 중 이 직무에 가장 도움이 될 것 같은 경험은 무엇인가요?",
            "새로운 환경에서 어떻게 적응하시나요?"
        ]
    
    if not questions_by_category["상황 대처"]:
        questions_by_category["상황 대처"] = [
            "업무 중 예상치 못한 문제가 발생했을 때 어떻게 대처하시나요?",
            "일정이 지연될 것 같을 때 어떻게 해결하시나요?"
        ]
    
    return questions_by_category