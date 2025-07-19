#!/usr/bin/env python3
"""
LangGraph 면접 질문 생성 워크플로우 테스트 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'agent'))

from agent.agents.interview_question_workflow import (
    generate_comprehensive_interview_questions,
    interview_workflow,
    executive_workflow,
    technical_workflow
)

def test_general_interview_workflow():
    """일반 면접 워크플로우 테스트"""
    print("=== 일반 면접 워크플로우 테스트 ===")
    
    # 테스트 데이터
    resume_text = """
    홍길동
    서울대학교 컴퓨터공학과 졸업 (2020-2024)
    GPA: 4.2/4.5
    
    경력:
    - 네이버 클로바팀 인턴 (2023.06-2023.12)
      * 대화형 AI 모델 개발 및 최적화
      * Python, TensorFlow, PyTorch 사용
      * 팀 프로젝트에서 3명과 협업하여 성능 15% 향상
    
    - 스타트업 프론트엔드 개발 (2022.03-2022.12)
      * React, TypeScript를 사용한 웹 애플리케이션 개발
      * 사용자 경험 개선으로 전환율 20% 증가
    
    기술 스택:
    - 언어: Python, JavaScript, TypeScript, Java
    - 프레임워크: React, Node.js, Django, Spring Boot
    - 데이터베이스: PostgreSQL, MongoDB, Redis
    - 클라우드: AWS, Docker, Kubernetes
    
    프로젝트:
    1. AI 기반 채용 매칭 시스템 (2023.09-2023.12)
       - LangChain과 OpenAI API를 활용한 이력서 분석 시스템
       - 지원자-직무 매칭 정확도 85% 달성
       - 팀 리더로서 5명과 협업
    
    2. 실시간 채팅 애플리케이션 (2022.06-2022.09)
       - WebSocket을 활용한 실시간 메시징 시스템
       - React와 Node.js로 풀스택 개발
       - 1000명 동시 접속자 처리 가능
    """
    
    job_info = """
    백엔드 개발자 (신입/경력)
    
    주요 업무:
    - 대규모 웹 서비스 백엔드 개발 및 운영
    - API 설계 및 구현
    - 데이터베이스 설계 및 최적화
    - 마이크로서비스 아키텍처 구축
    
    자격 요건:
    - 컴퓨터공학 또는 관련 전공
    - Python, Java, Node.js 중 하나 이상 숙련
    - 데이터베이스 설계 및 SQL 능숙
    - Git을 활용한 협업 경험
    
    우대사항:
    - 클라우드 서비스(AWS, GCP, Azure) 경험
    - Docker, Kubernetes 경험
    - 마이크로서비스 아키텍처 경험
    - AI/ML 관련 프로젝트 경험
    """
    
    company_name = "네이버"
    applicant_name = "홍길동"
    
    try:
        result = generate_comprehensive_interview_questions(
            resume_text=resume_text,
            job_info=job_info,
            company_name=company_name,
            applicant_name=applicant_name,
            interview_type="general"
        )
        
        print(f"면접 유형: {result.get('interview_type')}")
        print(f"생성된 질문 수: {result.get('total_questions')}")
        print(f"생성 시간: {result.get('generated_at')}")
        
        print("\n=== 생성된 질문들 ===")
        questions = result.get('questions', [])
        for i, question in enumerate(questions[:10], 1):  # 처음 10개만 출력
            print(f"{i}. {question}")
        
        if len(questions) > 10:
            print(f"... 외 {len(questions) - 10}개 질문")
        
        print("\n=== 질문 번들 ===")
        question_bundle = result.get('question_bundle', {})
        for category, content in question_bundle.items():
            if isinstance(content, dict):
                print(f"\n{category}:")
                for subcategory, subcontent in content.items():
                    if isinstance(subcontent, list):
                        print(f"  - {subcategory}: {len(subcontent)}개 질문")
                    else:
                        print(f"  - {subcategory}: {subcontent}")
            elif isinstance(content, list):
                print(f"\n{category}: {len(content)}개 질문")
            else:
                print(f"\n{category}: {content}")
        
        print("\n=== 평가 도구 ===")
        evaluation_tools = result.get('evaluation_tools', {})
        for tool_name, tool_content in evaluation_tools.items():
            if isinstance(tool_content, dict):
                print(f"\n{tool_name}:")
                for key, value in tool_content.items():
                    if isinstance(value, list):
                        print(f"  - {key}: {len(value)}개 항목")
                    else:
                        print(f"  - {key}: {value}")
            else:
                print(f"\n{tool_name}: {tool_content}")
        
        return True
        
    except Exception as e:
        print(f"워크플로우 실행 중 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_executive_interview_workflow():
    """임원면접 워크플로우 테스트"""
    print("\n=== 임원면접 워크플로우 테스트 ===")
    
    resume_text = """
    김대표
    서울대학교 경영학과 졸업 (2010-2014)
    하버드 경영대학원 MBA (2016-2018)
    
    경력:
    - 구글 한국 지사 Product Manager (2018-2023)
      * AI 기반 제품 전략 수립 및 실행
      * 연간 매출 500억원 규모 제품 담당
      * 50명 규모의 크로스펑셔널 팀 리드
    
    - 스타트업 CTO (2014-2016)
      * 기술팀 30명 관리
      * 제품 개발 및 기술 전략 수립
      * 시리즈 A 투자 유치 성공
    
    주요 성과:
    - 구글에서 AI 제품 매출 200% 성장 주도
    - 스타트업에서 1000만 사용자 확보
    - 기술 특허 5건 출원
    """
    
    job_info = """
    CTO (Chief Technology Officer)
    
    주요 업무:
    - 회사 전체 기술 전략 수립 및 실행
    - 기술팀 조직 관리 및 리더십
    - 제품 개발 로드맵 수립
    - 기술적 의사결정 및 아키텍처 설계
    
    자격 요건:
    - 10년 이상의 기술 경력
    - 대규모 조직 관리 경험
    - 제품 개발 및 기술 전략 수립 경험
    - MBA 또는 관련 경영 경험
    
    우대사항:
    - AI/ML 분야 전문성
    - 스타트업 경험
    - 투자 유치 경험
    - 글로벌 시장 경험
    """
    
    try:
        result = generate_comprehensive_interview_questions(
            resume_text=resume_text,
            job_info=job_info,
            company_name="테크스타트업",
            applicant_name="김대표",
            interview_type="executive"
        )
        
        print(f"면접 유형: {result.get('interview_type')}")
        print(f"생성된 질문 수: {result.get('total_questions')}")
        
        print("\n=== 임원면접 질문들 ===")
        questions = result.get('questions', [])
        for i, question in enumerate(questions[:5], 1):  # 처음 5개만 출력
            print(f"{i}. {question}")
        
        return True
        
    except Exception as e:
        print(f"임원면접 워크플로우 실행 중 오류: {str(e)}")
        return False

def test_technical_interview_workflow():
    """기술면접 워크플로우 테스트"""
    print("\n=== 기술면접 워크플로우 테스트 ===")
    
    resume_text = """
    박기술
    카이스트 전산학과 졸업 (2019-2023)
    GPA: 4.3/4.5
    
    경력:
    - 카카오 AI팀 연구개발 (2023.03-현재)
      * 대규모 언어 모델 연구 및 개발
      * PyTorch, TensorFlow를 활용한 모델 최적화
      * 논문 3편 발표 (ICLR, NeurIPS, ACL)
    
    기술 스택:
    - 언어: Python, C++, CUDA
    - 프레임워크: PyTorch, TensorFlow, JAX
    - 클라우드: AWS, GCP
    - 도구: Docker, Kubernetes, Git
    
    프로젝트:
    1. 한국어 특화 언어 모델 개발 (2023.06-2023.12)
       - 10B 파라미터 규모 모델 학습
       - 한국어 성능 SOTA 달성
       - 팀 리더로서 8명과 협업
    
    2. 실시간 추천 시스템 (2022.09-2023.02)
       - TensorFlow Serving을 활용한 실시간 추천
       - 응답 시간 10ms 이하 달성
       - 정확도 95% 달성
    """
    
    job_info = """
    AI/ML 엔지니어 (경력)
    
    주요 업무:
    - 대규모 AI 모델 개발 및 최적화
    - 머신러닝 파이프라인 구축
    - 연구 결과를 제품에 적용
    - AI 인프라 설계 및 운영
    
    자격 요건:
    - 컴퓨터공학 또는 관련 전공
    - Python, PyTorch/TensorFlow 숙련
    - 머신러닝 알고리즘 이해
    - 논문 발표 또는 연구 경험
    
    우대사항:
    - 대규모 모델 학습 경험
    - 논문 발표 경험
    - 클라우드 인프라 경험
    - 오픈소스 기여 경험
    """
    
    try:
        result = generate_comprehensive_interview_questions(
            resume_text=resume_text,
            job_info=job_info,
            company_name="AI스타트업",
            applicant_name="박기술",
            interview_type="second"  # 기술면접은 2차 면접으로 설정
        )
        
        print(f"면접 유형: {result.get('interview_type')}")
        print(f"생성된 질문 수: {result.get('total_questions')}")
        
        print("\n=== 기술면접 질문들 ===")
        questions = result.get('questions', [])
        for i, question in enumerate(questions[:5], 1):  # 처음 5개만 출력
            print(f"{i}. {question}")
        
        return True
        
    except Exception as e:
        print(f"기술면접 워크플로우 실행 중 오류: {str(e)}")
        return False

def main():
    """메인 테스트 함수"""
    print("LangGraph 면접 질문 생성 워크플로우 테스트 시작")
    print("=" * 60)
    
    # 각 워크플로우 테스트 실행
    tests = [
        ("일반 면접", test_general_interview_workflow),
        ("임원면접", test_executive_interview_workflow),
        ("기술면접", test_technical_interview_workflow)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"{test_name} 테스트 중 예외 발생: {str(e)}")
            results.append((test_name, False))
    
    # 결과 요약
    print("\n" + "=" * 60)
    print("테스트 결과 요약:")
    print("=" * 60)
    
    for test_name, success in results:
        status = "✅ 성공" if success else "❌ 실패"
        print(f"{test_name}: {status}")
    
    success_count = sum(1 for _, success in results if success)
    total_count = len(results)
    
    print(f"\n전체 결과: {success_count}/{total_count} 성공")
    
    if success_count == total_count:
        print("🎉 모든 테스트가 성공했습니다!")
    else:
        print("⚠️ 일부 테스트가 실패했습니다.")

if __name__ == "__main__":
    main() 