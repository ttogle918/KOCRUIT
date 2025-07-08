from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o")

template = """
다음 이력서를 기반으로 서류 합격 사유를 작성해 주세요. 핵심 기술, 경험, 자격증, 자기소개서 등을 기준으로 구체적인 이유를 작성해주세요.

[이력서 정보]
{resume}
"""

prompt = PromptTemplate.from_template(template)

def generate_pass_reason(resume: dict) -> str:
    resume_text = f"""
이름: {resume.get("name", "")}
학력: {resume.get("education", "")}
경력: {resume.get("experience", "")}
자격증: {resume.get("certifications", "")}
기술스택: {resume.get("skills", "")}
자기소개서: {resume.get("content", "")}
"""
    return llm.invoke(prompt.format(resume=resume_text)).content.strip()
