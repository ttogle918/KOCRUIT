from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List
import os
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain.chains.summarize import load_summarize_chain
from langchain_core.documents import Document

router = APIRouter()
load_dotenv()
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
llm = ChatOpenAI(model="gpt-4o-mini")


# 1. Tavily로 검색
search_tool = TavilySearchResults()  # <-- 반드시 본인 API Key 입력

# 2. 요약 체인 (검색 결과 요약)
summarize_chain = load_summarize_chain(llm, chain_type="stuff")

# 3. 인재상 기반 질문 생성 프롬프트
values_prompt = PromptTemplate.from_template(
    """
    다음은 "{company_name}"의 인재상, 핵심가치, 기업문화에 대한 정보입니다:
    ---
    {company_values}
    ---
    이 내용을 바탕으로, 면접에서 사용할 수 있는 인재상/가치관 관련 질문을 3개 생성해 주세요.
    회사의 핵심가치와 인재상에 부합하는 지원자인지 확인하는 질문으로 만들어 주세요.
    """
)

# 4. 기술/뉴스 기반 질문 생성 프롬프트
tech_prompt = PromptTemplate.from_template(
    """
    다음은 "{company_name}"의 최근 기술 동향과 뉴스 요약입니다:
    ---
    {company_context}
    ---
    이 내용을 바탕으로, 면접에서 사용할 수 있는 기술/산업 관련 질문을 3개 생성해 주세요.
    구체적이고 현실적인 질문으로 만들어 주세요.
    """
)

generate_values_questions = LLMChain(llm=llm, prompt=values_prompt)
generate_tech_questions = LLMChain(llm=llm, prompt=tech_prompt)

# 5. 응답 모델
class CompanyQuestionRagResponse(BaseModel):
    values_summary: str
    news_summary: str
    values_questions: List[str]
    tech_questions: List[str]

# 6. API 라우터
@router.get("/company/questions/rag", response_model=CompanyQuestionRagResponse)
async def generate_company_questions_rag(company_name: str = Query(...)):
    try:
        # 1) 인재상/가치관 검색
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

        # 2) 기술/뉴스 검색
        news_search_results = search_tool.invoke({
            "query": f"{company_name} 기술 블로그 OR 뉴스 OR 최신동향"
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

        # 3) 인재상 기반 질문 생성
        values_result = generate_values_questions.invoke({
            "company_name": company_name,
            "company_values": values_summary
        })
        values_text = values_result.get("text", "")
        values_questions = [q.strip() for q in values_text.split("\n") if q.strip()]

        # 4) 기술/뉴스 기반 질문 생성
        tech_result = generate_tech_questions.invoke({
            "company_name": company_name,
            "company_context": news_summary
        })
        tech_text = tech_result.get("text", "")
        tech_questions = [q.strip() for q in tech_text.split("\n") if q.strip()]

        return {
            "values_summary": values_summary,
            "news_summary": news_summary,
            "values_questions": values_questions,
            "tech_questions": tech_questions
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 7. LangGraph 노드용 함수
def generate_questions(company_name: str, company_context: str = ""):
    """LangGraph 노드에서 사용할 통합 질문 생성 함수"""
    try:
        # 인재상 검색
        values_search_results = search_tool.invoke({
            "query": f"{company_name} 인재상 OR 핵심가치 OR 기업문화"
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

        # 기술/뉴스 검색 (기존 context가 있으면 활용)
        if company_context and company_context != "회사에 대한 정보가 없습니다.":
            news_summary = company_context
        else:
            news_search_results = search_tool.invoke({
                "query": f"{company_name} 기술 블로그 OR 뉴스"
            })
            
            # 검색 결과 처리 개선
            news_docs = []
            if isinstance(news_search_results, list):
                for item in news_search_results:
                    if isinstance(item, dict):
                        content = item.get("content") or item.get("snippet", "")
                        if content:
                            news_docs.append(Document(page_content=content))
            
            if news_docs:
                news_summary = summarize_chain.run(news_docs)
            else:
                news_summary = f"{company_name}의 최신 뉴스와 기술 동향에 대한 정보를 찾을 수 없습니다."

        # 질문 생성
        values_result = generate_values_questions.invoke({
            "company_name": company_name,
            "company_values": values_summary
        })
        tech_result = generate_tech_questions.invoke({
            "company_name": company_name,
            "company_context": news_summary
        })

        # 결과 통합
        all_questions = []
        values_text = values_result.get("text", "")
        tech_text = tech_result.get("text", "")
        
        values_questions = [q.strip() for q in values_text.split("\n") if q.strip()]
        tech_questions = [q.strip() for q in tech_text.split("\n") if q.strip()]
        
        all_questions.extend(values_questions)
        all_questions.extend(tech_questions)

        # 질문이 없으면 기본 질문 추가
        if not all_questions:
            all_questions = [
                f"{company_name}에 지원한 이유는 무엇인가요?",
                f"{company_name}의 미래 비전에 대해 어떻게 생각하시나요?",
                f"{company_name}에서 일하고 싶은 이유는 무엇인가요?"
            ]

        return {"text": all_questions}

    except Exception as e:
        return {"text": [f"질문 생성 중 오류가 발생했습니다: {str(e)}"]}
