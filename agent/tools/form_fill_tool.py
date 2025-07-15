from langchain_openai import ChatOpenAI
import json
from datetime import datetime, timedelta

def form_fill_tool(state):
    """
    사용자 설명을 바탕으로 채용공고 폼을 자동으로 채우는 도구
    """
    description = state.get("description", "")
    current_form_data = state.get("current_form_data", {})
    
    print(f"form_fill_tool 호출됨: description={description}")
    print(f"current_form_data: {current_form_data}")
    
    if not description:
        print("설명이 제공되지 않음")
        return {**state, "form_data": current_form_data, "message": "설명이 제공되지 않았습니다."}
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
    
    # 현재 날짜 기준으로 모집 기간과 면접 일정 설정
    current_date = datetime.now()
    base_date = datetime(2025, 8, 1)  # 2025년 8월 1일 기준점
    
    # 더 늦은 날짜를 기준으로 사용
    reference_date = max(current_date, base_date)
    
    # 모집 시작일: 기준일 + 1일
    start_date = reference_date + timedelta(days=1)
    # 모집 종료일: 시작일 + 14일 (2주간 모집)
    end_date = start_date + timedelta(days=14)
    # 면접일: 종료일 + 3일
    interview_date = end_date + timedelta(days=3)
    
    prompt = f"""
    사용자의 설명을 바탕으로 채용공고 폼을 자동으로 작성해주세요.
    
    사용자 설명: {description}
    
    현재 폼 데이터: {json.dumps(current_form_data, ensure_ascii=False, indent=2)}
    
    요구사항:
    1. 사용자 설명에서 직무, 인원, 지역 등을 추출
    2. 적절한 제목, 부서, 지원자격, 모집분야, 근무조건, 전형절차 작성
    3. JSON 형식으로 응답
    4. 한글로 작성
    5. 구체적이고 실용적인 내용으로 작성
    6. 가중치는 빈 배열로 설정 (별도로 설정하도록)
    7. 날짜는 반드시 미래 날짜로 설정 (현재 기준: {current_date.strftime('%Y-%m-%d')})
    
    응답 형식 (JSON):
    {{
        "title": "채용공고 제목",
        "department": "부서명",
        "qualifications": "지원자격 (구체적인 기술, 경력, 학력 등)",
        "conditions": "근무조건 (근무시간, 급여, 복리후생 등)",
        "job_details": "모집분야 및 자격요건 (담당업무, 필요한 역량 등)",
        "procedures": "전형절차",
        "headcount": "모집인원 (숫자)",
        "location": "근무지역",
        "employment_type": "고용형태 (정규직/계약직/인턴/프리랜서)",
        "start_date": "{start_date.strftime('%Y-%m-%d %H:%M')}",
        "end_date": "{end_date.strftime('%Y-%m-%d %H:%M')}",
        "schedules": [
            {{
                "date": "{interview_date.strftime('%Y-%m-%d')}",
                "time": "14:00",
                "place": "회사 3층 회의실"
            }}
        ],
        "weights": []  # 가중치는 별도로 설정하도록 비워둠
    }}
    
    예시:
    - "프론트엔드 개발자 2명" → React, Vue.js 등 프론트엔드 기술 포함
    - "백엔드 개발자" → Java, Python, Node.js 등 백엔드 기술 포함
    - "UI/UX 디자이너" → Figma, Sketch 등 디자인 도구 포함
    - "마케팅 매니저" → 디지털 마케팅, SNS 마케팅 등 포함
    
    중요: 모든 날짜는 반드시 {current_date.strftime('%Y-%m-%d')} 이후로 설정해야 합니다.
    """
    
    try:
        response = llm.invoke(prompt)
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
        
        # JSON 파싱
        form_data = json.loads(response_text)
        
        # 날짜 형식 처리
        current_date = datetime.now()
        base_date = datetime(2025, 8, 1)
        reference_date = max(current_date, base_date)
        
        # 모집 기간 날짜 처리
        if "start_date" in form_data and isinstance(form_data["start_date"], str):
            try:
                start_date_obj = datetime.strptime(form_data["start_date"], "%Y-%m-%d %H:%M")
                if start_date_obj < reference_date:
                    start_date_obj = reference_date + timedelta(days=1)
                form_data["start_date"] = start_date_obj.strftime("%Y-%m-%d %H:%M")
            except:
                start_date_obj = reference_date + timedelta(days=1)
                form_data["start_date"] = start_date_obj.strftime("%Y-%m-%d %H:%M")
        
        if "end_date" in form_data and isinstance(form_data["end_date"], str):
            try:
                end_date_obj = datetime.strptime(form_data["end_date"], "%Y-%m-%d %H:%M")
                if end_date_obj < reference_date:
                    end_date_obj = reference_date + timedelta(days=15)
                form_data["end_date"] = end_date_obj.strftime("%Y-%m-%d %H:%M")
            except:
                end_date_obj = reference_date + timedelta(days=15)
                form_data["end_date"] = end_date_obj.strftime("%Y-%m-%d %H:%M")
        
        # 면접 일정 날짜 처리
        if "schedules" in form_data:
            for schedule in form_data["schedules"]:
                if isinstance(schedule.get("date"), str):
                    try:
                        # 문자열 날짜를 ISO 형식으로 변환
                        date_obj = datetime.strptime(schedule["date"], "%Y-%m-%d")
                        if date_obj < reference_date:
                            date_obj = reference_date + timedelta(days=18)  # 모집 종료 후 3일
                        schedule["date"] = date_obj.isoformat()
                    except:
                        # 기본값: 모집 종료 후 3일
                        default_date = reference_date + timedelta(days=18)
                        schedule["date"] = default_date.isoformat()
                elif schedule.get("date") is None:
                    # 날짜가 없으면 기본값 설정
                    default_date = reference_date + timedelta(days=18)
                    schedule["date"] = default_date.isoformat()
        
        # 점수 형식 처리
        if "weights" in form_data:
            for weight in form_data["weights"]:
                if isinstance(weight.get("score"), str):
                    try:
                        weight["score"] = float(weight["score"])
                    except:
                        weight["score"] = 0.5
        
        return {
            **state, 
            "form_data": form_data,
            "message": "AI가 폼을 자동으로 작성했습니다."
        }
        
    except Exception as e:
        print(f"폼 채우기 중 오류 발생: {e}")
        # 기본 폼 데이터 반환
        current_date = datetime.now()
        base_date = datetime(2025, 8, 1)
        reference_date = max(current_date, base_date)
        
        default_form_data = {
            "title": "신입/경력 채용",
            "department": "일반",
            "qualifications": "• 관련 분야 학사 이상\n• 관련 업무 경험 우대\n• 적극적이고 책임감 있는 자세\n• 팀워크 능력",
            "conditions": "• 근무시간: 09:00 ~ 18:00 (주 5일)\n• 급여: 협의\n• 복리후생: 4대보험, 퇴직연금, 점심식대, 교통비\n• 연차: 법정연차, 반차, 반반차",
            "job_details": "• 업무 수행 및 프로젝트 참여\n• 팀 협업 및 커뮤니케이션\n• 지속적인 학습 및 자기계발",
            "procedures": "1차 서류전형 → 2차 면접 → 최종합격",
            "headcount": "1",
            "location": "서울시 강남구",
            "employment_type": "정규직",
            "start_date": (reference_date + timedelta(days=1)).strftime("%Y-%m-%d %H:%M"),
            "end_date": (reference_date + timedelta(days=15)).strftime("%Y-%m-%d %H:%M"),
            "schedules": [
                {
                    "date": (reference_date + timedelta(days=18)).isoformat(),
                    "time": "14:00",
                    "place": "회사 3층 회의실"
                }
            ],
            "weights": []  # 가중치는 별도로 설정하도록 비워둠
        }
        
        return {
            **state, 
            "form_data": default_form_data,
            "message": f"폼 채우기 중 오류가 발생했습니다: {str(e)}"
        }

def form_improve_tool(state):
    """
    현재 폼 데이터를 분석하여 개선 제안을 제공하는 도구
    """
    current_form_data = state.get("current_form_data", {})
    message = state.get("message", "")
    
    if not current_form_data:
        return {**state, "suggestions": ["폼 데이터가 없습니다."]}
    
    # 특정 필드 개선 요청인지 확인
    field_names = {
        "제목": "title",
        "부서": "department", 
        "부서명": "department",
        "지원자격": "qualifications",
        "근무조건": "conditions",
        "모집분야": "job_details",
        "전형절차": "procedures",
        "모집인원": "headcount",
        "근무지역": "location",
        "고용형태": "employment_type"
    }
    
    # 메시지에서 특정 필드가 언급되었는지 확인
    target_field = None
    for korean_name, english_name in field_names.items():
        if korean_name in message:
            target_field = english_name
            break
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
    
    # 특정 필드 개선 요청인 경우
    if target_field:
        current_content = current_form_data.get(target_field, "")
        field_korean_name = [k for k, v in field_names.items() if v == target_field][0]
        
        prompt = f"""
        사용자의 요청에 따라 특정 필드를 개선해주세요.
        
        사용자 요청: {message}
        개선할 필드: {field_korean_name}
        현재 내용: {current_content}
        
        요구사항:
        1. 사용자 요청에 맞게 해당 필드를 개선
        2. 기존 내용을 참고하되 더 상세하고 구체적으로 작성
        3. 채용공고에 적합한 전문적인 내용으로 작성
        4. JSON 형식으로 응답
        
        응답 형식:
        {{
            "improved_content": "개선된 내용",
            "message": "개선 완료 메시지"
        }}
        """
        
        try:
            response = llm.invoke(prompt)
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
            
            # JSON 파싱
            result = json.loads(response_text)
            improved_content = result.get("improved_content", current_content)
            
            # 폼 데이터 업데이트
            updated_form_data = {**current_form_data}
            updated_form_data[target_field] = improved_content
            
            return {
                **state,
                "form_data": updated_form_data,
                "message": f"{field_korean_name}을 개선했습니다.",
                "suggestions": [f"{field_korean_name}: {improved_content}"]
            }
            
        except Exception as e:
            print(f"특정 필드 개선 중 오류 발생: {e}")
            return {
                **state,
                "suggestions": [f"특정 필드 개선 중 오류가 발생했습니다: {str(e)}"]
            }
    
    # 전체 폼 개선 제안 (기존 로직)
    prompt = f"""
    아래의 채용공고 폼 데이터를 분석하여 개선 제안을 해주세요.
    
    현재 폼 데이터:
    {json.dumps(current_form_data, ensure_ascii=False, indent=2)}
    
    분석 기준:
    1. 필수 항목 누락 여부
    2. 내용의 구체성과 상세도
    3. 지원자에게 매력적인 요소
    4. 명확성과 이해도
    5. 실무적 관점에서의 완성도
    
    응답 형식:
    - 구체적이고 실용적인 개선 제안을 리스트로 제공
    - 각 제안은 한 문장으로 작성
    - 긍정적인 피드백도 포함
    - 우선순위를 고려하여 정렬
    
    예시:
    [
        "채용공고 제목을 더 구체적으로 작성해보세요. (예: 'React 프론트엔드 개발자 채용')",
        "지원자격에 구체적인 기술 스택을 명시하면 좋겠습니다.",
        "근무조건에 복리후생 정보를 추가해보세요.",
        "전반적으로 잘 작성되었습니다! 회사 문화 소개를 추가하면 더 매력적일 것 같습니다."
    ]
    """
    
    try:
        response = llm.invoke(prompt)
        response_text = response.content.strip()
        
        # 리스트 형태로 파싱
        suggestions = []
        lines = response_text.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('-') or line.startswith('•') or line.startswith('*'):
                line = line[1:].strip()
            if line and not line.startswith('[') and not line.startswith(']'):
                suggestions.append(line)
        
        if not suggestions:
            suggestions = ["폼 데이터를 분석할 수 없습니다."]
        
        return {
            **state, 
            "suggestions": suggestions,
            "message": "폼 개선 제안을 생성했습니다."
        }
        
    except Exception as e:
        print(f"폼 개선 제안 중 오류 발생: {e}")
        return {
            **state, 
            "suggestions": [f"폼 개선 제안 중 오류가 발생했습니다: {str(e)}"]
        } 