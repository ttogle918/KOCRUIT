import os
import openai
from openai import OpenAI

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

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
    except Exception as e:
        raise RuntimeError(f"합격 사유 요약 중 오류: {e}") 