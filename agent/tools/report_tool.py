from typing import List, Dict, Any
from langchain_openai import ChatOpenAI
import logging
import json
import re

logger = logging.getLogger(__name__)

class ReportTool:
    """리포트 생성 관련 AI 도구"""
    
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.9, timeout=30)
        self.summary_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7, timeout=30)
        self.analysis_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)

    def extract_top3_rejection_reasons(self, fail_reasons: List[str]) -> List[str]:
        if not fail_reasons:
            return []
        prompt = f"""
        아래는 한 채용 공고에 지원한 불합격자들의 불합격 사유입니다.
        {chr(10).join(fail_reasons)}
        가장 많이 언급된 탈락 사유 TOP3를 한글 키워드로 추출해줘.
        JSON 배열 형식: ["사유1", "사유2", "사유3"]
        """
        try:
            response = self.llm.invoke(prompt)
            content = response.content.strip()
            match = re.search(r'\[.*\]', content, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return [line.strip('-•123. ').strip() for line in content.split('\n') if line.strip()][:3]
        except Exception as e:
            logger.error(f"TOP3 탈락사유 추출 실패: {e}")
            return []

    def extract_passed_summary(self, pass_reasons: List[str]) -> str:
        if not pass_reasons:
            return ""
        prompt = f"""
        아래는 합격자들의 합격 사유입니다.
        {chr(10).join(pass_reasons)}
        어떤 유형의 인재가 합격했는지 2~3문장으로 요약해줘.
        """
        try:
            response = self.summary_llm.invoke(prompt)
            return response.content.strip()
        except Exception as e:
            logger.error(f"합격자 요약 실패: {e}")
            return ""

    def analyze_statistics(self, chart_data: List[Dict[str, Any]], chart_type: str, job_title: str) -> Dict[str, Any]:
        """통계 데이터 분석"""
        try:
            prompt = f"""
            다음은 '{job_title}' 직무 채용의 {chart_type} 통계 데이터입니다:
            {json.dumps(chart_data, ensure_ascii=False, indent=2)}
            
            이 데이터를 분석하여 다음 내용을 JSON으로 제공해주세요:
            1. summary: 전체적인 경향 요약 (2-3문장)
            2. insights: 주요 인사이트 3가지 (리스트)
            3. recommendation: 채용 담당자를 위한 제언 (1문장)
            """
            response = self.analysis_llm.invoke(prompt)
            content = response.content.strip()
            
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            return json.loads(content)
        except Exception as e:
            logger.error(f"통계 분석 실패: {e}")
            return {"error": str(e)}

report_tool = ReportTool()
