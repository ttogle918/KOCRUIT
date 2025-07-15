from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from langchain.tools import tool
from typing import Dict, List

llm = ChatOpenAI(model="gpt-4o")

# 코딩테스트 문제 생성 프롬프트
coding_prompt = PromptTemplate.from_template(
    """
    아래는 채용공고 정보입니다:
    ---
    제목: {title}
    부서: {department}
    자격요건: {qualifications}
    직무상세: {job_details}
    ---
    이 공고는 개발자(프로그래머, 엔지니어, SW, IT 등) 직무입니다.
    해당 직무 지원자를 평가할 수 있는 코딩테스트(프로그래밍 문제) 2~3개를 생성하세요.
    각 문제는 실제 코딩테스트에서 출제될 만한 난이도와 현실적인 맥락을 반영해야 합니다.
    문제는 한글로, 각 문제는 한 줄로 명확하게 작성하세요.
    예시:
    1. 두 정수 N, M이 주어질 때 N부터 M까지의 합을 구하는 프로그램을 작성하세요.
    2. 주어진 문자열이 팰린드롬인지 판별하는 함수를 구현하세요.
    """
)

# 직무적합성 평가 문제 생성 프롬프트
aptitude_prompt = PromptTemplate.from_template(
    """
    아래는 채용공고 정보입니다:
    ---
    제목: {title}
    부서: {department}
    자격요건: {qualifications}
    직무상세: {job_details}
    ---
    이 공고는 비개발자 직무입니다.
    해당 직무 지원자를 평가할 수 있는 직무적합성(에세이, 상황, 경험 등) 문제 2~3개를 생성하세요.
    각 문제는 실제 실무 상황, 경험, 역량을 평가할 수 있도록 작성하세요.
    문제는 한글로, 각 문제는 한 줄로 명확하게 작성하세요.
    예시:
    1. 본인이 지원한 직무에서 가장 중요한 역량은 무엇이라고 생각하나요?
    2. 최근 경험한 문제 상황과 그 해결 과정을 서술하세요.
    """
)

coding_chain = LLMChain(llm=llm, prompt=coding_prompt)
aptitude_chain = LLMChain(llm=llm, prompt=aptitude_prompt)

DEV_KEYWORDS = ["개발", "엔지니어", "프로그래밍", "SW", "IT", "프로그래머"]

def is_developer_job(jobpost: Dict) -> bool:
    """공고 정보에서 개발자 직무 여부 판별"""
    text = f"{jobpost.get('title','')} {jobpost.get('department','')} {jobpost.get('job_details','')} {jobpost.get('qualifications','')}"
    return any(k in text for k in DEV_KEYWORDS)

@tool("generate_written_test_questions", return_direct=True)
def generate_written_test_questions(jobpost: Dict) -> List[str]:
    """
    jobpost(공고) dict를 입력받아, 개발자 직무면 코딩테스트, 그 외면 직무적합성 평가 문제를 2~3개 생성합니다.
    입력 예시: {"title": ..., "department": ..., "qualifications": ..., "job_details": ...}
    출력: 문제 리스트(List[str])
    """
    if not isinstance(jobpost, dict):
        raise ValueError("jobpost는 dict 타입이어야 합니다.")
    for key in ["title", "department", "qualifications", "job_details"]:
        if key not in jobpost:
            raise ValueError(f"jobpost에 '{key}' 필드가 필요합니다.")
    if is_developer_job(jobpost):
        result = coding_chain.invoke(jobpost)
    else:
        result = aptitude_chain.invoke(jobpost)
    # 결과에서 줄 단위로 문제 추출
    text = result.get("text", "")
    questions = [line.strip() for line in text.split("\n") if line.strip() and any(c.isdigit() for c in line)]
    return questions 