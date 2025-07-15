from langchain_openai import ChatOpenAI

def form_field_improve_tool(state):
    """
    특정 폼 필드를 AI가 개선하는 도구
    """
    field_name = state.get("field_name", "")
    current_content = state.get("current_content", "")
    user_request = state.get("user_request", "")
    form_context = state.get("form_context", {})
    
    if not field_name:
        return {**state, "improved_content": current_content, "message": "필드명이 필요합니다."}
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
    
    # 필드별 개선 프롬프트
    field_prompts = {
        "title": f"""
        채용공고 제목을 개선해주세요.
        
        현재 제목: {current_content}
        사용자 요청: {user_request}
        
        개선 기준:
        1. 직무와 회사가 명확히 드러나도록
        2. 모집 인원이 포함되도록
        3. 간결하면서도 매력적으로
        4. 검색 최적화를 고려
        
        예시:
        - "개발자 채용" → "React 프론트엔드 개발자 2명 채용"
        - "디자이너 모집" → "UI/UX 디자이너 1명 모집"
        
        개선된 제목만 응답해주세요.
        """,
        
        "department": f"""
        부서명을 개선해주세요.
        
        현재 부서명: {current_content}
        사용자 요청: {user_request}
        
        개선 기준:
        1. 회사 내에서 일반적으로 사용되는 부서명
        2. 직무와 연관된 명확한 부서명
        3. 간결하고 이해하기 쉽게
        
        예시:
        - "개발팀" → "IT개발팀" 또는 "소프트웨어개발팀"
        - "디자인팀" → "UX디자인팀" 또는 "크리에이티브팀"
        
        개선된 부서명만 응답해주세요.
        """,
        
        "qualifications": f"""
        지원자격을 개선해주세요.
        
        현재 지원자격: {current_content}
        사용자 요청: {user_request}
        
        개선 기준:
        1. 구체적이고 명확한 요건 제시
        2. 필수 요건과 우대 요건 구분
        3. 기술 스택, 경력, 학력 등 체계적으로 정리
        4. 불릿 포인트로 가독성 향상
        
        예시:
        • 관련 분야 학사 이상
        • 프론트엔드 개발 경력 2년 이상
        • HTML, CSS, JavaScript 숙련자
        • React 또는 Vue.js 경험 필수
        • Git 버전 관리 시스템 경험
        • 팀워크 및 커뮤니케이션 능력
        
        개선된 지원자격만 응답해주세요.
        """,
        
        "conditions": f"""
        근무조건을 개선해주세요.
        
        현재 근무조건: {current_content}
        사용자 요청: {user_request}
        
        개선 기준:
        1. 근무시간, 급여, 복리후생 등 구체적으로 명시
        2. 지원자에게 매력적인 요소 강조
        3. 불릿 포인트로 가독성 향상
        4. 법적 요구사항 포함
        
        예시:
        • 근무시간: 09:00 ~ 18:00 (주 5일)
        • 급여: 연봉 3,500만원 ~ 5,000만원 (경력에 따라 협의)
        • 복리후생: 4대보험, 퇴직연금, 점심식대, 교통비
        • 연차: 법정연차, 반차, 반반차
        • 교육비 지원, 자기계발 지원
        
        개선된 근무조건만 응답해주세요.
        """,
        
        "job_details": f"""
        모집분야 및 자격요건을 개선해주세요.
        
        현재 내용: {current_content}
        사용자 요청: {user_request}
        
        개선 기준:
        1. 담당업무를 구체적으로 설명
        2. 필요한 역량과 기술을 명시
        3. 프로젝트나 업무 환경 언급
        4. 성장 기회나 비전 제시
        
        예시:
        • 프론트엔드 애플리케이션 개발 및 유지보수
        • UI/UX 개선 및 사용자 경험 최적화
        • API 연동 및 백엔드와의 협업
        • 최신 웹 기술 트렌드 반영
        • 팀과의 협업을 통한 프로젝트 진행
        
        개선된 내용만 응답해주세요.
        """,
        
        "procedures": f"""
        전형절차를 개선해주세요.
        
        현재 전형절차: {current_content}
        사용자 요청: {user_request}
        
        개선 기준:
        1. 단계별로 명확하게 구분
        2. 각 단계별 소요 시간이나 기간 명시
        3. 면접 형태나 평가 기준 언급
        4. 결과 통보 방법 포함
        
        예시:
        1차 서류전형 → 2차 1차면접(온라인) → 3차 2차면접(대면) → 최종합격
        
        또는:
        • 서류전형: 지원서 접수 후 1주일 내 결과 통보
        • 1차면접: 온라인 화상면접 (30분)
        • 2차면접: 대면면접 (1시간)
        • 최종합격: 2차면접 후 1주일 내 개별 통보
        
        개선된 전형절차만 응답해주세요.
        """
    }
    
    prompt = field_prompts.get(field_name, f"""
    {field_name} 필드를 개선해주세요.
    
    현재 내용: {current_content}
    사용자 요청: {user_request}
    
    더 구체적이고 명확하게 개선해주세요.
    """)
    
    try:
        response = llm.invoke(prompt)
        improved_content = response.content.strip()
        
        return {
            **state,
            "improved_content": improved_content,
            "message": f"{field_name} 필드를 AI가 개선했습니다."
        }
        
    except Exception as e:
        print(f"필드 개선 중 오류 발생: {e}")
        return {
            **state,
            "improved_content": current_content,
            "message": f"필드 개선 중 오류가 발생했습니다: {str(e)}"
        } 