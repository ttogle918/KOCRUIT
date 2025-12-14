import logging
from typing import Dict, Any, List
from langchain_openai import ChatOpenAI
import json

logger = logging.getLogger(__name__)

class ApplicantGrowthScoringService:
    """지원자 성장 예측 서비스 (Agent 측 구현)"""
    
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
        self.analysis_llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.3) # 기존 로직 유지
    
    def predict_growth(self, resume_data: Dict[str, Any], job_description: str) -> Dict[str, Any]:
        """기존 성장 예측 로직"""
        try:
            prompt = f"""
            다음 지원자의 이력서와 직무 기술서를 분석하여, 이 지원자가 입사 후 얼마나 성장할 수 있을지 예측해 주세요.
            
            [직무 기술서]
            {job_description}
            
            [이력서 정보]
            {json.dumps(resume_data, ensure_ascii=False, indent=2)}
            
            다음 항목에 대해 0~100점 점수와 근거를 제시하세요:
            1. 학습 민첩성 (Learning Agility)
            2. 직무 적합성 발전 가능성 (Role Fit Potential)
            3. 리더십 잠재력 (Leadership Potential)
            4. 종합 성장 예측 점수
            
            결과는 반드시 JSON 형식으로만 출력하세요.
            """
            
            response = self.llm.invoke(prompt)
            content = response.content.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            return json.loads(content)
        except Exception as e:
            logger.error(f"성장 예측 분석 실패: {e}")
            return {"error": str(e)}

    def generate_growth_reasons(self, comparison_data: str) -> List[str]:
        """성장 가능성 점수 산출 근거 생성"""
        try:
            prompt = f"""
            지원자와 고성과자 평균을 비교해 성장 가능성 점수를 산출했습니다.
            {comparison_data}
            이 점수가 나온 주요 이유 3가지를 요약해주세요.
            JSON 배열 형식으로 반환하세요. 예: ["이유1", "이유2", "이유3"]
            """
            response = self.analysis_llm.invoke(prompt)
            content = response.content.strip()
            # JSON 파싱 시도
            try:
                if "[" in content and "]" in content:
                    start = content.find("[")
                    end = content.rfind("]") + 1
                    return json.loads(content[start:end])
                return [content]
            except:
                return [content]
        except Exception as e:
            logger.error(f"성장 근거 생성 실패: {e}")
            return []

    def generate_score_narrative(self, table_str: str) -> str:
        """점수 구조 설명 생성"""
        try:
            prompt = f"""
            다음은 지원자의 성장 점수표입니다.
            {table_str}
            이 점수 분포가 의미하는 바를 2문장으로 요약 설명해주세요.
            """
            response = self.analysis_llm.invoke(prompt)
            return response.content.strip()
        except Exception as e:
            logger.error(f"점수 설명 생성 실패: {e}")
            return ""

