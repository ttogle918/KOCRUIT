from langchain_openai import ChatOpenAI
import json
import re

def spell_check_tool(state):
    """
    한국어 텍스트의 맞춤법을 검사하고 오류만 간단명료하게 리스트로 반환하는 도구
    """
    text = state.get("text", "")
    field_name = state.get("field_name", "")
    current_form_data = state.get("current_form_data", {})
    
    if not text:
        # 폼 데이터에서 텍스트 추출
        if current_form_data:
            text_fields = {
                "title": current_form_data.get("title", ""),
                "department": current_form_data.get("department", ""),
                "qualifications": current_form_data.get("qualifications", ""),
                "conditions": current_form_data.get("conditions", ""),
                "job_details": current_form_data.get("job_details", ""),
                "procedures": current_form_data.get("procedures", ""),
                "location": current_form_data.get("location", "")
            }
            texts_to_check = {k: v for k, v in text_fields.items() if v.strip()}
            if not texts_to_check:
                return {
                    "response": "검사할 텍스트가 없습니다. 폼에 내용을 입력한 후 다시 시도해주세요.",
                    "errors": []
                }
            all_text = "\n\n".join([f"[{field}]\n{text}" for field, text in texts_to_check.items()])
            text = all_text
        else:
            return {
                "response": "검사할 텍스트가 없습니다.",
                "errors": []
            }
    try:
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)
        prompt = f"""
        아래의 한국어 텍스트에서 맞춤법상 명백한 오류(띄어쓰기, 철자, 조사, 어미, 오타 등)만 간단명료하게 짚어주세요.
        - 오류가 있는 부분만 원본과 수정안을 한 줄씩 나란히 보여주세요.
        - 오류가 여러 개면 각각 따로 보여주세요.
        - 오류가 없으면 '모든 문장이 맞춤법에 맞습니다.'라고만 답하세요.
        - 개선 제안, 문장 전체 수정, 명령어 추천 등은 하지 마세요.
        - 예시: '원본: ... / 수정: ...' 형식으로만 간단히 나열
        
        검사할 텍스트:
        {text}
        """
        response = llm.invoke(prompt)
        response_text = response.content.strip()
        # 오류만 추출
        return {
            "response": response_text
        }
    except Exception as e:
        print(f"맞춤법 검사 중 오류 발생: {e}")
        return {
            "response": "맞춤법 검사 중 오류가 발생했습니다. 다시 시도해주세요.",
            "errors": []
        }

def apply_spell_corrections(state):
    """
    맞춤법 검사 결과를 바탕으로 폼 데이터를 수정하는 도구
    """
    current_form_data = state.get("current_form_data", {})
    corrections = state.get("corrections", {})
    
    if not corrections:
        return {
            "response": "적용할 수정사항이 없습니다.",
            "form_data": current_form_data
        }
    
    try:
        # 폼 데이터 복사
        updated_form_data = current_form_data.copy()
        
        # 수정사항 적용
        for field_name, corrected_text in corrections.items():
            field_mapping = {
                "제목": "title",
                "부서명": "department", 
                "지원자격": "qualifications",
                "근무조건": "conditions",
                "모집분야": "job_details",
                "전형절차": "procedures",
                "근무지역": "location"
            }
            
            field_key = field_mapping.get(field_name)
            if field_key:
                updated_form_data[field_key] = corrected_text
        
        response_message = "✅ 맞춤법 수정사항이 적용되었습니다:\n\n"
        for field_name, corrected_text in corrections.items():
            response_message += f"• **{field_name}**: {corrected_text}\n"
        
        return {
            "response": response_message,
            "form_data": updated_form_data
        }
        
    except Exception as e:
        print(f"맞춤법 수정 적용 중 오류 발생: {e}")
        return {
            "response": "맞춤법 수정 적용 중 오류가 발생했습니다.",
            "form_data": current_form_data
        } 