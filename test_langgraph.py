#!/usr/bin/env python3
"""
LangGraph 워크플로우 테스트 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'agent'))

def test_langgraph_workflow():
    try:
        print("=== LangGraph 워크플로우 테스트 시작 ===")
        
        # LangGraph 워크플로우 임포트
        from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
        
        # 테스트 데이터
        resume_text = """
        [개인정보]
        이름: 홍길동
        생년월일: 1990-01-01
        
        [학력사항]
        - 서울대학교 컴퓨터공학과 졸업 (2014)
        
        [경력사항]
        - ABC기업 개발팀 (2014-2016)
          * Java, Spring 기반 웹 애플리케이션 개발
          * 팀 프로젝트 관리 및 코드 리뷰
        
        - XYZ기업 SI팀 (2016-2020)
          * 공공기관 정보시스템 구축 프로젝트 참여
          * PM/PL 역할 수행
        
        [기술스택]
        - 언어: Java, JavaScript, Python
        - 프레임워크: Spring, React, Django
        - 데이터베이스: MySQL, PostgreSQL
        - 기타: Docker, AWS, Git
        
        [자격증]
        - 정보처리기사
        - SQLD
        """
        
        job_info = """
        공고 제목: 공공기관 IT사업 PM/PL 모집
        부서: IT사업팀
        
        자격요건:
        - IT 관련 학과 졸업자
        - 3년 이상의 SI 프로젝트 경험
        - Java, Spring 기술 스택 보유자
        - 정보처리기사 자격증 보유자 우대
        
        직무 내용:
        - 공공기관 정보시스템 구축 프로젝트 관리
        - 요구사항 분석 및 설계
        - 개발팀 리드 및 코드 리뷰
        - 고객과의 커뮤니케이션
        
        근무 조건:
        - 근무지: 서울 강남구
        - 고용형태: 정규직
        - 모집인원: 2명
        """
        
        print("테스트 데이터 준비 완료")
        
        # LangGraph 워크플로우 실행
        print("LangGraph 워크플로우 실행 중...")
        result = generate_comprehensive_interview_questions(
            resume_text=resume_text,
            job_info=job_info,
            company_name="KOSA공공",
            applicant_name="홍길동",
            interview_type="ai"
        )
        
        print("=== 워크플로우 실행 결과 ===")
        print(f"결과 타입: {type(result)}")
        print(f"결과 키: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
        
        if isinstance(result, dict):
            if "questions" in result:
                print(f"생성된 질문 수: {len(result['questions'])}")
                for i, q in enumerate(result['questions'][:3], 1):
                    print(f"  {i}. {q}")
            
            if "question_bundle" in result:
                print(f"질문 번들 키: {list(result['question_bundle'].keys())}")
        
        print("=== LangGraph 워크플로우 테스트 완료 ===")
        return True
        
    except Exception as e:
        print(f"LangGraph 워크플로우 테스트 실패: {str(e)}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    test_langgraph_workflow() 