#!/usr/bin/env python3
"""
AI 서류 평가 시스템 사용 예시
"""

import json
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.application_evaluation_agent import evaluate_application

def example_high_score_candidate():
    """고득점 지원자 예시"""
    
    job_posting = """
    [백엔드 개발자 채용]
    
    회사: 테크스타트업
    직무: 백엔드 개발자 (신입/경력)
    
    요구사항:
    - 학력: 대학교 졸업 이상 (컴퓨터공학 관련학과 우대)
    - 경력: 신입 또는 3년 이하
    - 기술스택: Java, Spring Boot, MySQL, Redis
    - 자격증: 정보처리기사 우대
    - 프로젝트 경험 필수
    - 대용량 트래픽 처리 경험 우대
    """
    
    spec_data = {
        "education": {
            "university": "서울대학교",
            "major": "컴퓨터공학과",
            "degree": "학사",
            "gpa": 4.2
        },
        "experience": {
            "total_years": 2,
            "companies": ["네이버", "카카오"],
            "projects": ["대용량 트래픽 처리 시스템", "마이크로서비스 아키텍처 구축"]
        },
        "skills": {
            "programming_languages": ["Java", "Python", "JavaScript"],
            "frameworks": ["Spring Boot", "Django", "React"],
            "databases": ["MySQL", "PostgreSQL", "Redis"],
            "certifications": ["정보처리기사", "AWS 솔루션스 아키텍트"]
        },
        "portfolio": {
            "github": "https://github.com/senior_dev",
            "projects": ["E-commerce Platform", "Chat Application", "API Gateway"],
            "awards": ["대학생 소프트웨어 경진대회 금상", "해커톤 1등"]
        }
    }
    
    resume_data = {
        "personal_info": {
            "name": "김시니어",
            "email": "senior@example.com",
            "phone": "010-1234-5678"
        },
        "summary": "2년간의 백엔드 개발 경험을 바탕으로 대용량 트래픽 처리와 마이크로서비스 아키텍처 구축에 전문성을 가지고 있습니다. 특히 Spring Boot와 Java를 활용한 고성능 시스템 개발에 강점이 있습니다.",
        "work_experience": [
            {
                "company": "네이버",
                "position": "백엔드 개발자",
                "period": "2022-2024",
                "description": "대용량 트래픽 처리 시스템 개발 및 운영, 일일 사용자 100만명 처리"
            },
            {
                "company": "카카오",
                "position": "주니어 개발자",
                "period": "2021-2022",
                "description": "마이크로서비스 아키텍처 구축 및 API 개발, Redis 캐싱 시스템 구현"
            }
        ],
        "projects": [
            {
                "name": "E-commerce Platform",
                "description": "Spring Boot 기반의 전자상거래 플랫폼 개발, 월 매출 10억원 달성",
                "technologies": ["Java", "Spring Boot", "MySQL", "Redis", "Docker"]
            },
            {
                "name": "Chat Application",
                "description": "실시간 채팅 애플리케이션 개발, 동시 접속자 10만명 지원",
                "technologies": ["Node.js", "Socket.io", "MongoDB", "Redis"]
            },
            {
                "name": "API Gateway",
                "description": "마이크로서비스 API 게이트웨이 구축, 트래픽 제어 및 인증 시스템",
                "technologies": ["Spring Cloud Gateway", "Java", "Redis"]
            }
        ]
    }
    
    print("=== 고득점 지원자 평가 예시 ===")
    print(f"지원자: {spec_data['education']['university']} {spec_data['education']['major']}")
    print(f"경력: {spec_data['experience']['total_years']}년")
    print(f"기술스택: {', '.join(spec_data['skills']['programming_languages'])}")
    print()
    
    try:
        result = evaluate_application(job_posting, spec_data, resume_data)
        
        print("=== 평가 결과 ===")
        print(f"AI 점수: {result['ai_score']}점")
        print(f"합격 여부: {result['status']}")
        print(f"신뢰도: {result['confidence']:.2f}")
        print()
        
        if result['status'] == 'PASSED':
            print("✅ 합격 이유:")
            print(result['pass_reason'])
        else:
            print("❌ 불합격 이유:")
            print(result['fail_reason'])
        
        print()
        print("📊 평가 세부사항:")
        for category, details in result['scoring_details'].items():
            print(f"  {category}: {details['score']}/{details['max_score']} - {details['reason']}")
        
        return result
        
    except Exception as e:
        print(f"❌ 평가 중 오류 발생: {e}")
        return None

def example_low_score_candidate():
    """낮은 점수 지원자 예시"""
    
    job_posting = """
    [시니어 백엔드 개발자 채용]
    
    회사: 대기업 IT부서
    직무: 시니어 백엔드 개발자
    
    요구사항:
    - 학력: 대학교 졸업 이상
    - 경력: 5년 이상
    - 기술스택: Java, Spring Boot, MySQL, Redis, Docker, Kubernetes
    - 자격증: 정보처리기사 필수
    - 대용량 시스템 경험 필수
    - 팀 리딩 경험 우대
    """
    
    spec_data = {
        "education": {
            "university": "지방대학교",
            "major": "컴퓨터공학과",
            "degree": "학사",
            "gpa": 3.0
        },
        "experience": {
            "total_years": 1,
            "companies": ["소규모 스타트업"],
            "projects": ["간단한 웹사이트 개발"]
        },
        "skills": {
            "programming_languages": ["JavaScript", "HTML", "CSS"],
            "frameworks": ["React", "Express"],
            "databases": ["SQLite"],
            "certifications": []
        },
        "portfolio": {
            "github": "https://github.com/junior_dev",
            "projects": ["Todo App", "Blog"],
            "awards": []
        }
    }
    
    resume_data = {
        "personal_info": {
            "name": "이주니어",
            "email": "junior@example.com",
            "phone": "010-9876-5432"
        },
        "summary": "웹 개발에 관심이 많은 주니어 개발자입니다. React와 JavaScript를 주로 사용하여 프론트엔드 개발을 하고 있습니다.",
        "work_experience": [
            {
                "company": "소규모 스타트업",
                "position": "주니어 개발자",
                "period": "2023-2024",
                "description": "간단한 웹사이트 개발 및 유지보수, 사용자 100명 정도의 소규모 서비스"
            }
        ],
        "projects": [
            {
                "name": "Todo App",
                "description": "React 기반의 할일 관리 앱, 로컬 스토리지 사용",
                "technologies": ["React", "JavaScript", "CSS", "HTML"]
            },
            {
                "name": "Blog",
                "description": "개인 블로그 사이트, 정적 사이트 생성",
                "technologies": ["HTML", "CSS", "JavaScript"]
            }
        ]
    }
    
    print("\n=== 낮은 점수 지원자 평가 예시 ===")
    print(f"지원자: {spec_data['education']['university']} {spec_data['education']['major']}")
    print(f"경력: {spec_data['experience']['total_years']}년")
    print(f"기술스택: {', '.join(spec_data['skills']['programming_languages'])}")
    print()
    
    try:
        result = evaluate_application(job_posting, spec_data, resume_data)
        
        print("=== 평가 결과 ===")
        print(f"AI 점수: {result['ai_score']}점")
        print(f"합격 여부: {result['status']}")
        print(f"신뢰도: {result['confidence']:.2f}")
        print()
        
        if result['status'] == 'PASSED':
            print("✅ 합격 이유:")
            print(result['pass_reason'])
        else:
            print("❌ 불합격 이유:")
            print(result['fail_reason'])
        
        print()
        print("📊 평가 세부사항:")
        for category, details in result['scoring_details'].items():
            print(f"  {category}: {details['score']}/{details['max_score']} - {details['reason']}")
        
        return result
        
    except Exception as e:
        print(f"❌ 평가 중 오류 발생: {e}")
        return None

def main():
    """메인 함수"""
    print("🤖 AI 서류 평가 시스템 예시")
    print("=" * 50)
    
    # 고득점 지원자 평가
    high_score_result = example_high_score_candidate()
    
    # 낮은 점수 지원자 평가
    low_score_result = example_low_score_candidate()
    
    print("\n" + "=" * 50)
    print("📋 평가 결과 요약")
    print("=" * 50)
    
    if high_score_result:
        print(f"고득점 지원자: {high_score_result['ai_score']}점 → {high_score_result['status']}")
    
    if low_score_result:
        print(f"낮은 점수 지원자: {low_score_result['ai_score']}점 → {low_score_result['status']}")
    
    print("\n✅ 예시 실행 완료!")

if __name__ == "__main__":
    main() 