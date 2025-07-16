from langchain_community.tools.tavily_search.tool import TavilySearchResults
from langchain.chains.summarize import load_summarize_chain
from langchain_openai import ChatOpenAI
from langchain_core.documents import Document
from typing import List, Dict
import re
import redis
import json

redis_client = redis.Redis(host='redis', port=6379, db=0)

class PortfolioLinkTool:
    """포트폴리오 링크 수집 및 분석 도구"""
    
    def __init__(self):
        self.search_tool = TavilySearchResults()
        self.llm = ChatOpenAI(model="gpt-4o-mini")
        self.summarize_chain = load_summarize_chain(self.llm, chain_type="stuff")
    
    def extract_portfolio_links(self, resume_text: str, name: str = "") -> Dict:
        """이력서/자기소개서에서 포트폴리오 링크 추출"""
        try:
            # 1. 이력서에서 직접 링크 추출
            direct_links = self._extract_direct_links(resume_text)
            
            # 2. 이름 기반 포트폴리오 검색
            search_links = self._search_portfolio_links(name, resume_text)
            
            # 3. 결과 통합
            all_links = {
                "github": direct_links.get("github", []) + search_links.get("github", []),
                "notion": direct_links.get("notion", []) + search_links.get("notion", []),
                "portfolio": direct_links.get("portfolio", []) + search_links.get("portfolio", [])
            }
            
            # 중복 제거
            for key in all_links:
                all_links[key] = list(set(all_links[key]))
            
            return all_links
            
        except Exception as e:
            print(f"포트폴리오 링크 추출 중 오류: {str(e)}")
            return {"github": [], "notion": [], "portfolio": []}
    
    def _extract_direct_links(self, text: str) -> Dict:
        """텍스트에서 직접 링크 추출"""
        links = {"github": [], "notion": [], "portfolio": []}
        
        # GitHub 링크 패턴
        github_pattern = r'https?://github\.com/[a-zA-Z0-9_-]+/?'
        github_links = re.findall(github_pattern, text)
        links["github"] = github_links
        
        # Notion 링크 패턴
        notion_pattern = r'https?://[a-zA-Z0-9_-]+\.notion\.site/[a-zA-Z0-9_-]+'
        notion_links = re.findall(notion_pattern, text)
        links["notion"] = notion_links
        
        # 포트폴리오 링크 패턴
        portfolio_pattern = r'https?://[a-zA-Z0-9_-]+\.(com|net|org|io)/portfolio'
        portfolio_links = re.findall(portfolio_pattern, text)
        links["portfolio"] = portfolio_links
        
        return links
    
    def _search_portfolio_links(self, name: str, resume_text: str) -> Dict:
        """이름과 이력서 내용 기반으로 포트폴리오 검색"""
        links = {"github": [], "notion": [], "portfolio": []}
        
        if not name:
            return links
        
        try:
            # GitHub 검색
            github_query = f'"{name}" github portfolio'
            github_results = self.search_tool.invoke({"query": github_query})
            for result in github_results:
                if "github.com" in result.get("url", ""):
                    links["github"].append(result["url"])
            
            # Notion 검색
            notion_query = f'"{name}" notion portfolio'
            notion_results = self.search_tool.invoke({"query": notion_query})
            for result in notion_results:
                if "notion.site" in result.get("url", ""):
                    links["notion"].append(result["url"])
            
            # 포트폴리오 사이트 검색
            portfolio_query = f'"{name}" portfolio developer'
            portfolio_results = self.search_tool.invoke({"query": portfolio_query})
            for result in portfolio_results:
                url = result.get("url", "")
                if any(keyword in url.lower() for keyword in ["portfolio", "projects", "works"]):
                    links["portfolio"].append(url)
                    
        except Exception as e:
            print(f"포트폴리오 검색 중 오류: {str(e)}")
        
        return links
    
    def analyze_portfolio_content(self, links: Dict) -> str:
        """포트폴리오 내용 분석 및 요약 (Redis 캐시 적용)"""
        try:
            # 캐시 키 생성 (링크 조합)
            key_str = json.dumps(links, sort_keys=True)
            cache_key = f"portfolio_analysis:{key_str}"
            cached = redis_client.get(cache_key)
            if isinstance(cached, bytes):
                return cached.decode('utf-8')
            all_content = []
            
            # GitHub 분석
            for github_link in links.get("github", [])[:2]:  # 상위 2개만
                try:
                    github_results = self.search_tool.invoke({"query": f"site:{github_link} README projects"})
                    for result in github_results:
                        content = result.get("content", "")
                        if content:
                            all_content.append(f"GitHub 프로젝트: {content[:500]}...")
                except:
                    continue
            
            # Notion 분석
            for notion_link in links.get("notion", [])[:2]:  # 상위 2개만
                try:
                    notion_results = self.search_tool.invoke({"query": f"site:{notion_link} portfolio projects"})
                    for result in notion_results:
                        content = result.get("content", "")
                        if content:
                            all_content.append(f"Notion 포트폴리오: {content[:500]}...")
                except:
                    continue
            
            if all_content:
                docs = [Document(page_content=content) for content in all_content]
                summary = self.summarize_chain.run(docs)
                redis_client.set(cache_key, summary, ex=60*60*24)
                return summary
            else:
                return "포트폴리오 내용을 찾을 수 없습니다."
                
        except Exception as e:
            print(f"포트폴리오 분석 중 오류: {str(e)}")
            return "포트폴리오 분석 중 오류가 발생했습니다."

# 사용 예시
portfolio_tool = PortfolioLinkTool() 