#!/usr/bin/env python3
"""
OpenAI GPT 모델 기반 정교한 NLP 분석 도구
면접 답변의 품질을 정교하게 평가
"""
import os
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class OpenAINLPAnalyzer:
    def __init__(self):
        """OpenAI NLP 분석기 초기화"""
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o"  # 최신 GPT-4o 모델 사용
        
    def analyze_answer_quality(self, question: str, answer: str, context: str = "") -> Dict[str, Any]:
        """답변 품질을 정교하게 분석
        
        Args:
            question: 면접관 질문
            answer: 지원자 답변
            context: 추가 컨텍스트 (선택사항)
            
        Returns:
            분석 결과
        """
        try:
            prompt = self._create_analysis_prompt(question, answer, context)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 면접 전문가입니다. 지원자의 답변을 정교하게 분석하여 점수를 매기고 피드백을 제공합니다."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # 일관된 평가를 위해 낮은 temperature
                max_tokens=1000
            )
            
            result_text = response.choices[0].message.content
            return self._parse_analysis_result(result_text)
            
        except Exception as e:
            logging.error(f"OpenAI 분석 오류: {str(e)}")
            return self._fallback_analysis(question, answer)
    
    def analyze_interview_context(self, transcription: str, speakers: List[Dict]) -> Dict[str, Any]:
        """전체 면접 문맥을 정교하게 분석 (감정분석 포함)
        
        Args:
            transcription: 전체 음성 인식 결과
            speakers: 화자별 세그먼트 정보
            
        Returns:
            문맥 분석 결과
        """
        try:
            prompt = self._create_context_analysis_prompt(transcription, speakers)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 면접 분석 전문가입니다. 면접 내용을 분석하여 지원자의 전반적인 역량과 감정 상태를 평가합니다."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=2000
            )
            
            result_text = response.choices[0].message.content
            return self._parse_context_analysis_result(result_text)
            
        except Exception as e:
            logging.error(f"OpenAI 문맥 분석 오류: {str(e)}")
            return self._fallback_context_analysis(transcription)
    
    def analyze_emotion_from_text(self, transcription: str) -> Dict[str, Any]:
        """텍스트 기반 감정분석
        
        Args:
            transcription: 음성 인식 결과 텍스트
            
        Returns:
            감정분석 결과
        """
        try:
            prompt = f"""
다음 면접 답변에서 지원자의 감정 상태를 분석해주세요.

**면접 답변:**
{transcription}

다음 JSON 형식으로 응답해주세요:
{{
    "primary_emotion": "자신감",
    "emotion_breakdown": {{
        "confidence": 85,
        "enthusiasm": 78,
        "nervousness": 25,
        "frustration": 15,
        "satisfaction": 82
    }},
    "emotional_tone": "긍정적이고 자신감 있는 톤",
    "stress_level": "낮음",
    "engagement_level": "높음",
    "emotional_insights": [
        "자신감 있는 답변으로 긍정적인 감정이 드러남",
        "열정적이고 적극적인 태도",
        "면접 상황에 대한 적절한 긴장감"
    ],
    "recommendations": [
        "현재의 자신감 있는 태도를 유지하세요",
        "긍정적인 감정을 더욱 효과적으로 표현하세요"
    ]
}}

감정 점수는 0-100 사이로 매겨주세요.
"""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 감정분석 전문가입니다. 텍스트에서 감정 상태를 정확하게 분석합니다."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=1000
            )
            
            result_text = response.choices[0].message.content
            return self._parse_emotion_analysis_result(result_text)
            
        except Exception as e:
            logging.error(f"감정분석 오류: {str(e)}")
            return self._fallback_emotion_analysis()
    
    def _create_analysis_prompt(self, question: str, answer: str, context: str = "") -> str:
        """답변 품질 분석을 위한 프롬프트 생성 (상세한 피드백 포함)"""
        return f"""
다음 면접 질문과 답변을 분석하여 점수를 매기고 상세한 피드백을 제공해주세요.

**면접관 질문:**
{question}

**지원자 답변:**
{answer}

**추가 컨텍스트:**
{context if context else "없음"}

다음 JSON 형식으로 응답해주세요:
{{
    "score": 85,
    "score_breakdown": {{
        "relevance": 90,
        "clarity": 85,
        "specificity": 80,
        "confidence": 85,
        "pronunciation": 88,
        "attitude": 82,
        "logic": 87
    }},
    "strengths": ["구체적인 경험 언급", "명확한 설명"],
    "weaknesses": ["더 구체적인 수치 필요"],
    "suggestions": ["STAR 방법론 활용 권장"],
    "detailed_feedback": {{
        "pronunciation": "발음이 대체로 명확하고 이해하기 쉽습니다. 전문 용어 사용이 적절합니다.",
        "attitude": "긍정적이고 자신감 있는 태도로 답변했습니다. 면접관과의 소통이 원활합니다.",
        "answer_quality": "구체적인 경험을 바탕으로 한 답변이며, 문제 해결 과정을 잘 설명했습니다.",
        "improvement_areas": "더 구체적인 수치와 결과를 포함하면 더욱 설득력 있는 답변이 될 것입니다."
    }},
    "overall_feedback": "전반적으로 좋은 답변이지만 더 구체적인 수치와 결과를 포함하면 더욱 좋을 것 같습니다."
}}

점수는 0-100 사이로 매겨주세요.
"""
    
    def _create_context_analysis_prompt(self, transcription: str, speakers: List[Dict]) -> str:
        """문맥 분석을 위한 프롬프트 생성"""
        return f"""
다음 면접 내용을 분석하여 지원자의 전반적인 역량을 평가해주세요.

**면접 내용:**
{transcription}

**화자 정보:**
{json.dumps(speakers, ensure_ascii=False, indent=2)}

다음 JSON 형식으로 응답해주세요:
{{
    "communication_skills": 85,
    "technical_knowledge": 80,
    "problem_solving": 75,
    "leadership": 70,
    "teamwork": 85,
    "overall_assessment": "전반적으로 좋은 면접이었습니다.",
    "key_insights": ["기술적 지식이 우수함", "의사소통 능력이 뛰어남"],
    "improvement_areas": ["더 구체적인 경험 사례 제시 필요"],
    "recommendations": ["추가 기술 면접 권장"]
}}

점수는 0-100 사이로 매겨주세요.
"""
    
    def _parse_analysis_result(self, result_text: str) -> Dict[str, Any]:
        """분석 결과 파싱"""
        try:
            # JSON 부분 추출
            start_idx = result_text.find('{')
            end_idx = result_text.rfind('}') + 1
            json_str = result_text[start_idx:end_idx]
            
            result = json.loads(json_str)
            result["analysis_method"] = "openai_gpt4o"
            result["timestamp"] = datetime.now().isoformat()
            
            return result
            
        except Exception as e:
            logging.error(f"결과 파싱 오류: {str(e)}")
            return self._fallback_analysis("", "")
    
    def _parse_context_analysis_result(self, result_text: str) -> Dict[str, Any]:
        """문맥 분석 결과 파싱"""
        try:
            # JSON 부분 추출
            start_idx = result_text.find('{')
            end_idx = result_text.rfind('}') + 1
            json_str = result_text[start_idx:end_idx]
            
            result = json.loads(json_str)
            result["analysis_method"] = "openai_gpt4o"
            result["timestamp"] = datetime.now().isoformat()
            
            return result
            
        except Exception as e:
            logging.error(f"문맥 분석 결과 파싱 오류: {str(e)}")
            return self._fallback_context_analysis("")
    
    def _parse_emotion_analysis_result(self, result_text: str) -> Dict[str, Any]:
        """감정분석 결과 파싱"""
        try:
            # JSON 부분 추출
            start_idx = result_text.find('{')
            end_idx = result_text.rfind('}') + 1
            json_str = result_text[start_idx:end_idx]
            
            result = json.loads(json_str)
            result["analysis_method"] = "openai_gpt4o"
            result["timestamp"] = datetime.now().isoformat()
            
            return result
            
        except Exception as e:
            logging.error(f"감정분석 결과 파싱 오류: {str(e)}")
            return self._fallback_emotion_analysis()
    
    def _fallback_analysis(self, question: str, answer: str) -> Dict[str, Any]:
        """OpenAI 실패시 fallback 분석"""
        return {
            "score": 50,
            "score_breakdown": {
                "relevance": 50,
                "clarity": 50,
                "specificity": 50,
                "confidence": 50
            },
            "strengths": ["분석 불가"],
            "weaknesses": ["분석 불가"],
            "suggestions": ["OpenAI API 확인 필요"],
            "overall_feedback": "OpenAI 분석에 실패했습니다.",
            "analysis_method": "fallback",
            "timestamp": datetime.now().isoformat()
        }
    
    def _fallback_context_analysis(self, transcription: str) -> Dict[str, Any]:
        """OpenAI 실패시 fallback 문맥 분석"""
        return {
            "communication_skills": 50,
            "technical_knowledge": 50,
            "problem_solving": 50,
            "leadership": 50,
            "teamwork": 50,
            "overall_assessment": "OpenAI 분석에 실패했습니다.",
            "key_insights": ["분석 불가"],
            "improvement_areas": ["분석 불가"],
            "recommendations": ["OpenAI API 확인 필요"],
            "analysis_method": "fallback",
            "timestamp": datetime.now().isoformat()
        }
    
    def _fallback_emotion_analysis(self) -> Dict[str, Any]:
        """OpenAI 실패시 fallback 감정분석"""
        return {
            "primary_emotion": "분석 불가",
            "emotion_breakdown": {
                "confidence": 50,
                "enthusiasm": 50,
                "nervousness": 50,
                "frustration": 50,
                "satisfaction": 50
            },
            "emotional_tone": "분석 불가",
            "stress_level": "분석 불가",
            "engagement_level": "분석 불가",
            "emotional_insights": ["분석 불가"],
            "recommendations": ["OpenAI API 확인 필요"],
            "analysis_method": "fallback",
            "timestamp": datetime.now().isoformat()
        }

# 전역 인스턴스
openai_nlp_analyzer = OpenAINLPAnalyzer()
