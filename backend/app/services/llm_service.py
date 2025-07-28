import os
import openai
from openai import OpenAI
import re

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

def create_simple_summary(pass_reason: str) -> str:
    """
    OpenAI API 사용 불가 시 간단한 텍스트 처리로 요약 생성
    """
    if not pass_reason:
        return "• 요약을 생성할 수 없습니다."
    
    # 문장 단위로 분리
    sentences = re.split(r'[.!?]', pass_reason)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    # 주요 키워드 추출
    keywords = ['전공', '자격증', '경험', '프로젝트', '성과', '리더십', '커뮤니케이션', '능력', '강점']
    summary_points = []
    
    for sentence in sentences[:5]:  # 최대 5개 문장
        for keyword in keywords:
            if keyword in sentence:
                # 문장을 간단하게 요약
                summary = sentence[:50] + "..." if len(sentence) > 50 else sentence
                summary_points.append(f"• {summary}")
                break
    
    if not summary_points:
        # 키워드가 없으면 첫 번째 문장 사용
        if sentences:
            summary_points.append(f"• {sentences[0][:50]}...")
        else:
            summary_points.append("• 요약을 생성할 수 없습니다.")
    
    return "\n".join(summary_points)

def summarize_pass_reason(pass_reason: str) -> str:
    """
    LLM을 이용해 pass_reason에서 주요 합격 이유만 뽑아 bullet point로 요약한다.
    """
    if not pass_reason or not pass_reason.strip():
        raise ValueError("pass_reason 값이 비어 있습니다.")
    if not OPENAI_API_KEY:
        raise EnvironmentError("OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다.")
    
    prompt = f"""
    아래는 지원자의 합격 사유입니다. 주요 합격 포인트(3~5개)를 간결한 bullet point로 요약해 주세요.\n\n---\n{pass_reason}\n---\n\n[요약 예시]\n• 전공 및 자격증 등 전문성\n• 실무 경험 및 프로젝트 성과\n• 리더십 및 커뮤니케이션 능력\n• 기타 강점\n\n[요약]\n• """
    
    try:
        if not client:
            raise EnvironmentError("OpenAI 클라이언트가 초기화되지 않았습니다.")
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=256,
            temperature=0.4,
        )
        summary = response.choices[0].message.content.strip()
        return summary
        
    except openai.RateLimitError as e:
        print(f"⚠️ OpenAI API 할당량 초과: {e}")
        return create_simple_summary(pass_reason)
        
    except openai.APIError as e:
        if "insufficient_quota" in str(e).lower():
            print(f"⚠️ OpenAI API 할당량 부족: {e}")
            return create_simple_summary(pass_reason)
        else:
            raise RuntimeError(f"OpenAI API 오류: {e}")
            
    except Exception as e:
        print(f"⚠️ 요약 처리 중 오류: {e}")
        return create_simple_summary(pass_reason) 