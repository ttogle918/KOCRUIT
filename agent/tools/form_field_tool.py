from langchain_openai import ChatOpenAI
import json

def form_field_update_tool(state):
    """
    특정 폼 필드를 수정하는 도구
    """
    message = state.get("message", "")
    field_name = state.get("field_name", "")
    new_value = state.get("new_value", "")
    current_form_data = state.get("current_form_data", {})
    
    # field_name과 new_value가 없으면 메시지에서 추출
    if not field_name or not new_value:
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)
        
        extract_prompt = f"""
        사용자의 메시지에서 수정하려는 필드명과 새로운 값을 추출해주세요.
        
        사용자 메시지: {message}
        
        필드명 매핑:
        - 제목, title
        - 부서, 부서명, department
        - 지원자격, qualifications
        - 근무조건, conditions
        - 모집분야, job_details
        - 전형절차, procedures
        - 모집인원, headcount
        - 근무지역, location
        - 고용형태, employment_type
        - 면접일정, schedules
        
        응답은 정확히 다음 JSON 형식으로만 반환하세요:
        {{
            "field_name": "추출된 필드명 (한글)",
            "new_value": "추출된 새로운 값"
        }}
        
        예시:
        - "부서명 개발팀으로 바꿔달라" → {{"field_name": "부서명", "new_value": "개발팀"}}
        - "제목을 백엔드 개발자로 변경" → {{"field_name": "제목", "new_value": "백엔드 개발자"}}
        - "면접 일정 하나 지워줘" → {{"field_name": "면접일정", "new_value": "삭제"}}
        """
        
        try:
            response = llm.invoke(extract_prompt)
            response_text = response.content.strip()
            
            # JSON 부분만 추출
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                response_text = response_text[start:end].strip()
            elif "```" in response_text:
                start = response_text.find("```") + 3
                end = response_text.find("```", start)
                response_text = response_text[start:end].strip()
            
            extracted_data = json.loads(response_text)
            field_name = extracted_data.get("field_name", field_name)
            new_value = extracted_data.get("new_value", new_value)
            
        except Exception as e:
            print(f"필드 추출 중 오류: {e}")
            return {**state, "message": "필드명과 새로운 값을 추출할 수 없습니다. 더 명확하게 말씀해주세요."}
    
    if not field_name or not new_value:
        return {**state, "message": "필드명과 새로운 값이 필요합니다."}
    
    # 필드명 매핑 (한글 → 영문)
    field_mapping = {
        "제목": "title",
        "title": "title",
        "부서": "department",
        "부서명": "department",
        "department": "department",
        "지원자격": "qualifications",
        "qualifications": "qualifications",
        "근무조건": "conditions",
        "conditions": "conditions",
        "모집분야": "job_details",
        "job_details": "job_details",
        "전형절차": "procedures",
        "procedures": "procedures",
        "모집인원": "headcount",
        "headcount": "headcount",
        "근무지역": "location",
        "location": "location",
        "고용형태": "employment_type",
        "employment_type": "employment_type",
        "면접일정": "schedules",
        "schedules": "schedules"
    }
    
    # 필드명 변환
    actual_field = field_mapping.get(field_name, field_name)
    
    # 삭제/제거 명령 처리
    delete_keywords = ["삭제", "지워", "제거"]
    if any(k in str(new_value) for k in delete_keywords):
        updated_form_data = {**current_form_data}
        # 배열형 필드만 삭제 허용
        if actual_field in ["schedules"] and isinstance(updated_form_data.get(actual_field), list):
            if updated_form_data[actual_field]:
                updated_form_data[actual_field] = updated_form_data[actual_field][:-1]
                return {
                    **state,
                    "form_data": updated_form_data,
                    "message": f"{field_name} 항목 1개를 삭제했습니다."
                }
            else:
                return {**state, "message": f"{field_name}에 삭제할 항목이 없습니다."}
        else:
            return {**state, "message": f"{field_name}은(는) 삭제 명령을 지원하지 않습니다."}
    
    # 폼 데이터 업데이트 (일반 값 변경)
    updated_form_data = {**current_form_data}
    updated_form_data[actual_field] = new_value
    
    return {
        **state,
        "form_data": updated_form_data,
        "message": f"{field_name}을(를) '{new_value}'로 변경했습니다."
    }

def form_status_check_tool(state):
    """
    현재 폼 상태를 확인하고 요약하는 도구
    """
    current_form_data = state.get("current_form_data", {})
    
    if not current_form_data:
        return {**state, "status": "폼 데이터가 없습니다."}
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
    
    prompt = f"""
    아래의 채용공고 폼 데이터를 분석하여 현재 상태를 요약해주세요.
    
    폼 데이터:
    {json.dumps(current_form_data, ensure_ascii=False, indent=2)}
    
    요약 내용:
    1. 입력된 주요 정보 (제목, 부서, 모집인원, 근무지역 등)
    2. 완성도 (입력된 항목 수 / 전체 항목 수)
    3. 누락된 중요 항목
    4. 전체적인 평가
    
    응답 형식:
    - 간결하고 명확한 요약
    - 한글로 작성
    - 구체적인 수치와 정보 포함
    """
    
    try:
        response = llm.invoke(prompt)
        status_summary = response.content.strip()
        
        return {
            **state,
            "status": status_summary,
            "message": "폼 상태를 확인했습니다."
        }
        
    except Exception as e:
        print(f"폼 상태 확인 중 오류 발생: {e}")
        
        # 기본 상태 요약
        filled_fields = []
        total_fields = 0
        
        for field, value in current_form_data.items():
            total_fields += 1
            if value and str(value).strip():
                filled_fields.append(field)
        
        completion_rate = len(filled_fields) / total_fields if total_fields > 0 else 0
        
        status_summary = f"""
📋 **현재 폼 상태**

✅ 입력된 항목: {len(filled_fields)}개
📝 전체 항목: {total_fields}개
📊 완성도: {completion_rate:.1%}

입력된 주요 정보:
{', '.join(filled_fields[:5])}{'...' if len(filled_fields) > 5 else ''}

누락된 중요 항목:
{', '.join([field for field in ['title', 'department', 'qualifications', 'job_details', 'headcount'] if not current_form_data.get(field)])}
        """.strip()
        
        return {
            **state,
            "status": status_summary,
            "message": "폼 상태를 확인했습니다."
        } 