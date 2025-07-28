from typing import Dict, Any, Optional
import asyncio
import time
from agent.utils.llm_cache import redis_cache

# 각 툴들 import
from agent.tools.highlight_tool import highlight_resume_content
from agent.tools.comprehensive_analysis_tool import generate_comprehensive_analysis_report
from agent.tools.detailed_analysis_tool import generate_detailed_analysis
from agent.tools.competitiveness_comparison_tool import generate_competitiveness_comparison
from agent.tools.impact_points_tool import ImpactPointsTool

class ResumeOrchestrator:
    """
    이력서 분석 오케스트레이터
    
    형광펜 툴과 각 분석 툴들을 독립적으로 호출하여
    통합된 이력서 분석 결과를 제공합니다.
    """
    
    def __init__(self):
        self.tools = {
            'highlight': highlight_resume_content,
            'comprehensive': generate_comprehensive_analysis_report,
            'detailed': generate_detailed_analysis,
            'competitiveness': generate_competitiveness_comparison,
            'impact_points': ImpactPointsTool().analyze_impact_points
        }
    
    @redis_cache()
    def analyze_resume_complete(
        self,
        resume_text: str,
        job_info: str = "",
        portfolio_info: str = "",
        job_matching_info: str = "",
        application_id: Optional[int] = None,
        jobpost_id: Optional[int] = None,
        company_id: Optional[int] = None,
        enable_tools: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        완전한 이력서 분석 수행
        
        Args:
            resume_text: 이력서 텍스트
            job_info: 직무 정보
            portfolio_info: 포트폴리오 정보
            job_matching_info: 직무 매칭 정보
            application_id: 지원서 ID
            jobpost_id: 채용공고 ID
            company_id: 회사 ID
            enable_tools: 활성화할 툴 목록 (None이면 모든 툴 실행)
            
        Returns:
            통합된 분석 결과
        """
        
        if enable_tools is None:
            enable_tools = ['highlight', 'comprehensive', 'detailed', 'competitiveness', 'impact_points']
        
        print(f"🚀 이력서 종합 분석 시작 - 활성화된 툴: {enable_tools}")
        start_time = time.time()
        
        results = {
            'metadata': {
                'analysis_timestamp': time.time(),
                'enabled_tools': enable_tools,
                'application_id': application_id,
                'jobpost_id': jobpost_id,
                'company_id': company_id
            },
            'results': {},
            'errors': {},
            'summary': {}
        }
        
        # 각 툴을 독립적으로 실행
        for tool_name in enable_tools:
            if tool_name not in self.tools:
                results['errors'][tool_name] = f"알 수 없는 툴: {tool_name}"
                continue
                
            try:
                print(f"📊 {tool_name} 분석 시작...")
                tool_start = time.time()
                
                # 각 툴별로 적절한 파라미터 전달
                if tool_name == 'highlight':
                    result = self.tools[tool_name](
                        resume_content=resume_text,
                        jobpost_id=jobpost_id,
                        company_id=company_id
                    )
                elif tool_name == 'comprehensive':
                    result = self.tools[tool_name](
                        resume_text=resume_text,
                        job_info=job_info,
                        portfolio_info=portfolio_info,
                        job_matching_info=job_matching_info
                    )
                elif tool_name == 'detailed':
                    result = self.tools[tool_name](
                        resume_text=resume_text,
                        job_info=job_info
                    )
                elif tool_name == 'competitiveness':
                    result = self.tools[tool_name](
                        resume_text=resume_text,
                        job_info=job_info,
                        comparison_context="시장 평균 대비 경쟁력 분석"
                    )
                elif tool_name == 'impact_points':
                    result = self.tools[tool_name](
                        resume_text=resume_text,
                        job_info=job_info
                    )
                else:
                    result = self.tools[tool_name](resume_text, job_info)
                
                results['results'][tool_name] = result
                tool_time = time.time() - tool_start
                print(f"✅ {tool_name} 분석 완료 (소요시간: {tool_time:.2f}초)")
                
            except Exception as e:
                error_msg = f"{tool_name} 분석 오류: {str(e)}"
                results['errors'][tool_name] = error_msg
                print(f"❌ {error_msg}")
        
        # 분석 요약 생성
        results['summary'] = self._generate_analysis_summary(results['results'])
        
        total_time = time.time() - start_time
        results['metadata']['total_processing_time'] = total_time
        print(f"🎯 이력서 종합 분석 완료 (총 소요시간: {total_time:.2f}초)")
        
        return results
    
    def analyze_resume_selective(
        self,
        resume_text: str,
        tools_to_run: list,
        job_info: str = "",
        **kwargs
    ) -> Dict[str, Any]:
        """
        선택적 이력서 분석 수행
        
        Args:
            resume_text: 이력서 텍스트
            tools_to_run: 실행할 툴 목록
            job_info: 직무 정보
            **kwargs: 추가 파라미터
            
        Returns:
            선택된 툴들의 분석 결과
        """
        return self.analyze_resume_complete(
            resume_text=resume_text,
            job_info=job_info,
            enable_tools=tools_to_run,
            **kwargs
        )
    
    def _generate_analysis_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """분석 결과 요약 생성"""
        summary = {
            'completed_analyses': list(results.keys()),
            'analysis_count': len(results),
            'key_insights': [],
            'overall_scores': {},
            'recommendations': []
        }
        
        try:
            # 종합 분석 결과에서 핵심 정보 추출
            if 'comprehensive' in results:
                comp_result = results['comprehensive']
                if 'job_matching_score' in comp_result:
                    summary['overall_scores']['comprehensive_score'] = comp_result['job_matching_score']
                if 'resume_summary' in comp_result:
                    summary['key_insights'].append(f"요약: {comp_result['resume_summary'][:100]}...")
            
            # 상세 분석 결과에서 점수 추출
            if 'detailed' in results:
                detailed_result = results['detailed']
                if 'overall_assessment' in detailed_result:
                    assessment = detailed_result['overall_assessment']
                    if isinstance(assessment, dict) and 'job_fit_score' in assessment:
                        summary['overall_scores']['detailed_score'] = assessment['job_fit_score']
            
            # 경쟁력 비교 결과에서 점수 추출
            if 'competitiveness' in results:
                comp_result = results['competitiveness']
                if 'market_competitiveness' in comp_result:
                    market_comp = comp_result['market_competitiveness']
                    if isinstance(market_comp, dict) and 'competitiveness_score' in market_comp:
                        summary['overall_scores']['competitiveness_score'] = market_comp['competitiveness_score']
            
            # 키워드 매칭 결과에서 점수 추출
            if 'keyword_matching' in results:
                keyword_result = results['keyword_matching']
                if 'matching_summary' in keyword_result:
                    matching_summary = keyword_result['matching_summary']
                    if isinstance(matching_summary, dict) and 'overall_match_score' in matching_summary:
                        summary['overall_scores']['keyword_match_score'] = matching_summary['overall_match_score']
            
            # 형광펜 결과에서 하이라이트 정보 추출
            if 'highlight' in results:
                highlight_result = results['highlight']
                if 'metadata' in highlight_result:
                    metadata = highlight_result['metadata']
                    if 'total_highlights' in metadata:
                        summary['key_insights'].append(f"하이라이트: {metadata['total_highlights']}개 발견")
            
            # 전체 평균 점수 계산
            scores = [score for score in summary['overall_scores'].values() if isinstance(score, (int, float))]
            if scores:
                summary['overall_scores']['average_score'] = sum(scores) / len(scores)
            
            # 추천사항 생성
            avg_score = summary['overall_scores'].get('average_score', 50)
            if avg_score >= 80:
                summary['recommendations'].append("강력 추천 - 우수한 후보자")
            elif avg_score >= 70:
                summary['recommendations'].append("추천 - 적합한 후보자")
            elif avg_score >= 60:
                summary['recommendations'].append("조건부 추천 - 추가 검토 필요")
            else:
                summary['recommendations'].append("신중 검토 - 보완 필요 영역 존재")
                
        except Exception as e:
            summary['summary_error'] = f"요약 생성 중 오류: {str(e)}"
        
        return summary

# 오케스트레이터 인스턴스 생성
resume_orchestrator = ResumeOrchestrator()

def analyze_resume_with_orchestrator(
    resume_text: str,
    job_info: str = "",
    portfolio_info: str = "",
    job_matching_info: str = "",
    application_id: Optional[int] = None,
    jobpost_id: Optional[int] = None,
    company_id: Optional[int] = None,
    enable_tools: Optional[list] = None
) -> Dict[str, Any]:
    """
    오케스트레이터를 통한 이력서 분석 (외부 호출용 함수)
    """
    return resume_orchestrator.analyze_resume_complete(
        resume_text=resume_text,
        job_info=job_info,
        portfolio_info=portfolio_info,
        job_matching_info=job_matching_info,
        application_id=application_id,
        jobpost_id=jobpost_id,
        company_id=company_id,
        enable_tools=enable_tools
    )

def analyze_resume_selective(
    resume_text: str,
    tools_to_run: list,
    job_info: str = "",
    **kwargs
) -> Dict[str, Any]:
    """
    선택적 이력서 분석 (외부 호출용 함수)
    """
    return resume_orchestrator.analyze_resume_selective(
        resume_text=resume_text,
        tools_to_run=tools_to_run,
        job_info=job_info,
        **kwargs
    ) 