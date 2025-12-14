from typing import Dict, Any, List
from langchain_openai import ChatOpenAI
import logging
import json

logger = logging.getLogger(__name__)

def spell_check_text(text: str) -> Dict[str, Any]:
    """
    한국어 텍스트의 맞춤법을 검사하고 수정 제안을 제공
    """
    try:
        if not text:
            return {"errors": [], "summary": "텍스트가 없습니다."}
            
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)
        
        prompt = f"""
        아래의 한국어 텍스트에서 맞춤법 오류, 띄어쓰기 오류, 문맥상 어색한 표현을 찾아 수정 제안을 해주세요.
        결과는 반드시 JSON 형식으로만 출력하세요.
        
        [검사할 텍스트]
        {text}
        
        [출력 형식]
        {{
            "original_text": "원문...",
            "corrected_text": "수정된 전체 텍스트...",
            "errors": [
                {{ "original": "틀린단어", "corrected": "수정단어", "reason": "이유" }},
                ...
            ],
            "summary": "총평"
        }}
        """
        
        response = llm.invoke(prompt)
        content = response.content.strip()
        
        # JSON 파싱 처리
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        return json.loads(content)
        
    except Exception as e:
        logger.error(f"맞춤법 검사 실패: {e}")
        return {"error": str(e)}

def spell_check_tool(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    LangGraph용 맞춤법 검사 도구
    state에서 'message' 또는 'resume_text'를 가져와 검사
    """
    text = state.get("message") or state.get("resume_text", "")
    if not text:
        return {"spell_check_result": {"error": "No text to check"}}
        
    result = spell_check_text(text)
    return {"spell_check_result": result}

def apply_spell_corrections(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    맞춤법 교정 적용 도구
    """
    result = state.get("spell_check_result", {})
    corrected_text = result.get("corrected_text", "")
    
    if corrected_text:
        # message나 resume_text 업데이트
        if state.get("message"):
            return {"message": corrected_text, "original_message": state.get("message")}
        elif state.get("resume_text"):
            return {"resume_text": corrected_text, "original_resume_text": state.get("resume_text")}
            
    return {}
