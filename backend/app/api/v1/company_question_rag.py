
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List
import os
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain.tools.tavily_search import TavilySearchResults
from langchain.chains.summarize import load_summarize_chain
from langchain_core.documents import Document

router = APIRouter()
llm = ChatOpenAI(model="gpt-4o")
load_dotenv()
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

# 1. Tavily로 검색
search_tool = TavilySearchResults()  # <-- 반드시 본인 API Key 입력

# 2. 요약 체인 (검색 결과 요약)
summarize_chain = load_summarize_chain(llm, chain_type="stuff")

# 3. 질문 생성 프롬프트
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
generate_questions = LLMChain(llm=llm, prompt=tech_prompt)

# 4. 응답 모델
class CompanyQuestionRagResponse(BaseModel):
    summary: str
    questions: List[str]

# 5. API 라우터
@router.get("/company/questions/rag", response_model=CompanyQuestionRagResponse)
async def generate_company_questions_rag(company_name: str = Query(...)):
    try:
        # 1) 검색
        search_results = search_tool.invoke({"query": f"{company_name} 기술 블로그 OR 뉴스"})
        docs = [Document(page_content=item["content"] or item["snippet"]) for item in search_results]

        # 2) 요약
        summary = summarize_chain.run(docs)

        # 3) 질문 생성
        result = generate_questions.invoke({
            "company_name": company_name,
            "company_context": summary
        })
        questions = result.get("text", "").strip().split("\n")

        return {"summary": summary, "questions": questions}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
