from langchain.tools import tool
import os
import re
from openai import OpenAI

@tool("grade_written_test_answer", return_direct=True)
def grade_written_test_answer(question: str, answer: str) -> dict:
    """
    필기시험 문제와 지원자 답변을 입력받아, 0~5점(소수점 가능) 점수와 피드백(점수 이유)을 반환합니다.
    입력:
        question: 문제 텍스트
        answer: 지원자 답변 텍스트
    출력:
        {"score": float, "feedback": str}
    """
    prompt = f"""
    아래는 채용 필기시험 문제와 지원자의 답변입니다. 문제와 답변을 비교하여 0~5점(소수점 가능)으로 점수를 매기고, 점수가 나온 이유를 한글로 간단히 설명해 주세요.

    [문제]
    {question}

    [지원자 답변]
    {answer}

    [출력 형식 예시]
    점수: 3.5
    이유: 답변이 일부 맞으나 구체성이 부족함
    """
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        ai_response = response.choices[0].message.content
        score_match = re.search(r"점수\s*[:：]\s*([0-9]+(\.[0-9]+)?)", ai_response)
        feedback_match = re.search(r"이유\s*[:：]\s*(.*)", ai_response)
        score = float(score_match.group(1)) if score_match else None
        feedback = feedback_match.group(1).strip() if feedback_match else ai_response.strip()
        return {"score": score, "feedback": feedback}
    except Exception as e:
        return {"score": None, "feedback": f"AI 채점 실패: {str(e)}"} 