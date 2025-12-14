from typing import List, Dict, Any
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain.chains.summarize import load_summarize_chain
from langchain_core.documents import Document
import os
import json
import logging

logger = logging.getLogger(__name__)

class CompanyRagTool:
    """기업 정보 RAG 기반 질문 생성 도구"""
    
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4o-mini")
        self.search_tool = TavilySearchResults()
        self.summarize_chain = load_summarize_chain(self.llm, chain_type="stuff")
        
        # 인재상 기반 질문 생성 프롬프트
        self.values_prompt = PromptTemplate.from_template(
            """
            다음은 "{company_name}"의 인재상, 핵심가치, 기업문화에 대한 정보입니다:
            ---
            {company_values}
            ---
            이 내용을 바탕으로, 면접에서 사용할 수 있는 인재상/가치관 관련 질문을 3개 생성해 주세요.
            회사의 핵심가치와 인재상에 부합하는 지원자인지 확인하는 질문으로 만들어 주세요.
            """
        )
        
        # 기술/뉴스 기반 질문 생성 프롬프트
        self.tech_prompt = PromptTemplate.from_template(
            """
            다음은 "{company_name}"의 최근 기술 동향과 뉴스 요약입니다:
            ---
            {company_context}
            ---
            이 내용을 바탕으로, 면접에서 사용할 수 있는 기술/산업 관련 질문을 3개 생성해 주세요.
            구체적이고 현실적인 질문으로 만들어 주세요.
            """
        )
        
        self.generate_values_questions = LLMChain(llm=self.llm, prompt=self.values_prompt)
        self.generate_tech_questions = LLMChain(llm=self.llm, prompt=self.tech_prompt)

    async def generate_questions(self, company_name: str, company_context: str = "") -> Dict[str, Any]:
        try:
            # 1. 인재상/가치관 검색
            values_summary = await self._search_and_summarize(
                f"{company_name} 인재상 OR 핵심가치 OR 기업문화 OR 기업이념",
                f"{company_name}의 인재상과 기업문화에 대한 정보를 찾을 수 없습니다."
            )

            # 2. 기술/뉴스 검색
            if company_context and company_context != "회사에 대한 정보가 없습니다.":
                news_summary = company_context
            else:
                news_summary = await self._search_and_summarize(
                    f"{company_name} 기술 블로그 OR 뉴스 OR 최신동향",
                    f"{company_name}의 최신 뉴스와 기술 동향에 대한 정보를 찾을 수 없습니다."
                )

            # 3. 질문 생성
            values_result = await self.generate_values_questions.ainvoke({
                "company_name": company_name,
                "company_values": values_summary
            })
            values_questions = self._parse_questions(values_result.get("text", ""))

            tech_result = await self.generate_tech_questions.ainvoke({
                "company_name": company_name,
                "company_context": news_summary
            })
            tech_questions = self._parse_questions(tech_result.get("text", ""))

            return {
                "values_summary": values_summary,
                "news_summary": news_summary,
                "values_questions": values_questions,
                "tech_questions": tech_questions
            }

        except Exception as e:
            logger.error(f"기업 RAG 질문 생성 오류: {e}")
            return {"error": str(e)}

    async def _search_and_summarize(self, query: str, fallback_msg: str) -> str:
        try:
            # 비동기 실행이 아니라면 sync invoke 사용
            search_results = self.search_tool.invoke({"query": query})
            
            docs = []
            if isinstance(search_results, list):
                for item in search_results:
                    if isinstance(item, dict):
                        content = item.get("content") or item.get("snippet", "")
                        if content:
                            docs.append(Document(page_content=content))
            
            if docs:
                # summarize_chain.run은 sync 함수일 수 있음
                return self.summarize_chain.run(docs)
            return fallback_msg
        except Exception as e:
            logger.error(f"검색/요약 실패 ({query}): {e}")
            return fallback_msg

    def _parse_questions(self, text: str) -> List[str]:
        return [q.strip() for q in text.split("\n") if q.strip()]

# 싱글톤 인스턴스
company_rag_tool = CompanyRagTool()

