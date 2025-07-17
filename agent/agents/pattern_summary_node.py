import logging
from typing import Dict, Any, List
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

logger = logging.getLogger(__name__)

class PatternSummaryNode:
    """고성과자 패턴 요약 LangGraph 노드"""
    
    def __init__(self, llm_model: str = "gpt-3.5-turbo"):
        """
        Args:
            llm_model: 사용할 LLM 모델명
        """
        self.llm = ChatOpenAI(model=llm_model, temperature=0.3)
        self.pattern_summary_prompt = self._create_pattern_summary_prompt()
    
    def _create_pattern_summary_prompt(self) -> PromptTemplate:
        """패턴 요약 프롬프트 템플릿 생성"""
        template = """
당신은 고성과자들의 경력 패턴을 분석하여 공통적인 성장 경로를 요약하는 전문가입니다.

다음은 고성과자 그룹의 상세 정보입니다:

{cluster_info}

이 정보를 바탕으로 다음 형식으로 공통 성장 경로를 요약해주세요:

## 공통 성장 경로 요약

### 1. 학력/자격증 패턴
- [학력 요구사항] (보유율: XX%)
- [주요 자격증] (보유율: XX%)
- [전공 분야] (분포: XX%)

### 2. 경력 발전 경로
- [평균 경력 연차]: XX년
- [승진 속도]: 평균 XX년 만에 승진
- [주요 경력 단계]: [단계1] → [단계2] → [단계3]

### 3. 성과 지표
- [평균 KPI 점수]: XX점
- [주요 성과 영역]: [영역1, 영역2, 영역3]

### 4. 핵심 경험/프로젝트
- [공통적으로 경험한 프로젝트 유형]
- [성과를 높인 주요 경험]
- [권장 학습/경험]

### 5. 성장 가능성 예측 기준
이 패턴을 가진 지원자가 고성과자가 될 가능성을 판단하는 기준:
- [기준1]: [설명]
- [기준2]: [설명]
- [기준3]: [설명]

요약할 때 다음 사항을 고려해주세요:
1. 통계 데이터를 정확히 반영
2. 실제 경력 경로의 흐름을 명확히 제시
3. 구체적이고 실행 가능한 기준 제시
4. 한국 IT 업계의 현실을 반영

응답은 한국어로 작성해주세요.
"""
        
        return PromptTemplate(
            input_variables=["cluster_info"],
            template=template
        )
    
    def _format_cluster_info(self, cluster_patterns: List[Dict[str, Any]]) -> str:
        """클러스터 패턴 정보를 프롬프트용 텍스트로 포맷팅"""
        formatted_info = []
        
        for i, pattern in enumerate(cluster_patterns, 1):
            cluster_info = f"=== 클러스터 {i} ===\n"
            cluster_info += f"멤버 수: {pattern['member_count']}명\n"
            cluster_info += f"대표 경력: {pattern['representative_career_text']}\n\n"
            
            # 통계 정보
            stats = pattern['statistics']
            cluster_info += "통계 정보:\n"
            
            # 수치형 통계
            for field in ['total_experience_years', 'promotion_speed_years', 'kpi_score']:
                if f'{field}_mean' in stats:
                    cluster_info += f"- {field}: 평균 {stats[f'{field}_mean']:.1f}년/점"
                    if f'{field}_std' in stats:
                        cluster_info += f" (±{stats[f'{field}_std']:.1f})"
                    cluster_info += f", 범위: {stats[f'{field}_min']:.1f}~{stats[f'{field}_max']:.1f}\n"
            
            # 범주형 통계
            for field in ['education_level', 'current_position', 'major']:
                if f'{field}_distribution' in stats:
                    cluster_info += f"- {field} 분포: {stats[f'{field}_distribution']}\n"
            
            cluster_info += "\n멤버 상세 정보:\n"
            for j, member in enumerate(pattern['members'], 1):
                cluster_info += f"  {j}. {member['name']}: {member['current_position']}, "
                cluster_info += f"경력 {member.get('total_experience_years', 'N/A')}년, "
                cluster_info += f"KPI {member.get('kpi_score', 'N/A')}점\n"
            
            formatted_info.append(cluster_info)
        
        return "\n".join(formatted_info)
    
    def summarize_patterns(self, cluster_patterns: List[Dict[str, Any]]) -> str:
        """
        클러스터 패턴을 LLM으로 요약
        
        Args:
            cluster_patterns: 클러스터별 패턴 정보 리스트
            
        Returns:
            LLM이 생성한 패턴 요약 텍스트
        """
        try:
            # 클러스터 정보 포맷팅
            cluster_info = self._format_cluster_info(cluster_patterns)
            
            # LLM 호출
            chain = self.pattern_summary_prompt | self.llm
            response = chain.invoke({"cluster_info": cluster_info})
            
            summary = response.content
            logger.info(f"패턴 요약 완료: {len(summary)}자")
            
            return summary
            
        except Exception as e:
            logger.error(f"패턴 요약 실패: {e}")
            raise
    
    def create_pattern_summary_workflow(self) -> StateGraph:
        """패턴 요약 LangGraph 워크플로우 생성"""
        
        # 상태 정의
        class PatternSummaryState:
            cluster_patterns: List[Dict[str, Any]]
            pattern_summary: str = ""
            error: str = ""
        
        # 노드 함수들
        def summarize_patterns_node(state: PatternSummaryState) -> PatternSummaryState:
            """패턴 요약 노드"""
            try:
                if not state.cluster_patterns:
                    state.error = "클러스터 패턴 데이터가 없습니다."
                    return state
                
                summary = self.summarize_patterns(state.cluster_patterns)
                state.pattern_summary = summary
                
            except Exception as e:
                state.error = f"패턴 요약 중 오류 발생: {str(e)}"
                logger.error(f"패턴 요약 노드 오류: {e}")
            
            return state
        
        # 워크플로우 생성
        workflow = StateGraph(PatternSummaryState)
        
        # 노드 추가
        workflow.add_node("summarize_patterns", summarize_patterns_node)
        
        # 엣지 설정
        workflow.set_entry_point("summarize_patterns")
        workflow.add_edge("summarize_patterns", END)
        
        return workflow.compile()
    
    def run_pattern_summary(self, cluster_patterns: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        패턴 요약 워크플로우 실행
        
        Args:
            cluster_patterns: 클러스터별 패턴 정보
            
        Returns:
            워크플로우 실행 결과
        """
        try:
            # 워크플로우 생성
            workflow = self.create_pattern_summary_workflow()
            
            # 초기 상태 설정
            initial_state = {
                "cluster_patterns": cluster_patterns,
                "pattern_summary": "",
                "error": ""
            }
            
            # 워크플로우 실행
            result = workflow.invoke(initial_state)
            
            return {
                "success": not result.error,
                "pattern_summary": result.pattern_summary,
                "error": result.error
            }
            
        except Exception as e:
            logger.error(f"패턴 요약 워크플로우 실행 실패: {e}")
            return {
                "success": False,
                "pattern_summary": "",
                "error": str(e)
            }

def create_pattern_summary_node(llm_model: str = "gpt-3.5-turbo") -> PatternSummaryNode:
    """패턴 요약 노드 팩토리 함수"""
    return PatternSummaryNode(llm_model) 