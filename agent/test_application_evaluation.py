#!/usr/bin/env python3
"""
서류 평가 기능 테스트
"""

import json
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.application_evaluation_agent import evaluate_application

def test_application_evaluation():
    """서류 평가 기능을 테스트합니다."""
    
    # 테스트 데이터
    job_posting = """
    [채용공고]
    회사: 테크스타트업
    직무: 백엔드 개발자
    
    요구사항:
    - 학력: 대학교 졸업 이상
    - 경력: 3년 이상
    - 기술스택: Java, Spring Boot, MySQL, Redis
    - 자격증: 정보처리기사 우대
    - 프로젝트 경험 필수
    """
    
    spec_data = {
        "education": {
            "university": "서울대학교",
            "major": "컴퓨터공학과",
            "degree": "학사",
            "gpa": 4.2
        },
        "experience": {
            "total_years": 3,
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
            "github": "https://github.com/testuser",
            "projects": ["E-commerce Platform", "Chat Application"],
            "awards": ["대학생 소프트웨어 경진대회 금상"]
        }
    }
    
    resume_data = {
        "personal_info": {
            "name": "김개발",
            "email": "kim@example.com",
            "phone": "010-1234-5678"
        },
        "summary": "3년간의 백엔드 개발 경험을 바탕으로 대용량 트래픽 처리와 마이크로서비스 아키텍처 구축에 전문성을 가지고 있습니다.",
        "work_experience": [
            {
                "company": "네이버",
                "position": "백엔드 개발자",
                "period": "2021-2023",
                "description": "대용량 트래픽 처리 시스템 개발 및 운영"
            },
            {
                "company": "카카오",
                "position": "주니어 개발자",
                "period": "2020-2021",
                "description": "마이크로서비스 아키텍처 구축 및 API 개발"
            }
        ],
        "projects": [
            {
                "name": "E-commerce Platform",
                "description": "Spring Boot 기반의 전자상거래 플랫폼 개발",
                "technologies": ["Java", "Spring Boot", "MySQL", "Redis"]
            },
            {
                "name": "Chat Application",
                "description": "실시간 채팅 애플리케이션 개발",
                "technologies": ["Node.js", "Socket.io", "MongoDB"]
            }
        ]
    }
    
    print("=== 서류 평가 테스트 시작 ===")
    print(f"채용공고: {job_posting[:100]}...")
    print(f"지원자: {spec_data['education']['university']} {spec_data['education']['major']}")
    print(f"경력: {spec_data['experience']['total_years']}년")
    print()
    
    try:
        # 서류 평가 실행
        result = evaluate_application(job_posting, spec_data, resume_data)
        
        print("=== 평가 결과 ===")
        print(f"AI 점수: {result['ai_score']}점")
        print(f"합격 여부: {result['status']}")
        print(f"신뢰도: {result['confidence']:.2f}")
        print()
        
        if result['status'] == 'PASSED':
            print("=== 합격 이유 ===")
            print(result['pass_reason'])
        else:
            print("=== 불합격 이유 ===")
            print(result['fail_reason'])
        
        print()
        print("=== 평가 세부사항 ===")
        for category, details in result['scoring_details'].items():
            print(f"{category}: {details['score']}/{details['max_score']} - {details['reason']}")
        
        print()
        print("=== 판별 근거 ===")
        print(result['decision_reason'])
        
        return result
        
    except Exception as e:
        print(f"테스트 중 오류 발생: {e}")
        return None

def test_low_score_application():
    """낮은 점수의 지원자 테스트"""
    
    job_posting = """
    [채용공고]
    회사: 테크스타트업
    직무: 시니어 백엔드 개발자
    
    요구사항:
    - 학력: 대학교 졸업 이상
    - 경력: 5년 이상
    - 기술스택: Java, Spring Boot, MySQL, Redis, Docker, Kubernetes
    - 자격증: 정보처리기사 필수
    - 대용량 시스템 경험 필수
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
            "github": "https://github.com/junior",
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
        "summary": "웹 개발에 관심이 많은 주니어 개발자입니다.",
        "work_experience": [
            {
                "company": "소규모 스타트업",
                "position": "주니어 개발자",
                "period": "2023-2024",
                "description": "간단한 웹사이트 개발 및 유지보수"
            }
        ],
        "projects": [
            {
                "name": "Todo App",
                "description": "React 기반의 할일 관리 앱",
                "technologies": ["React", "JavaScript", "CSS"]
            }
        ]
    }
    
    print("\n=== 낮은 점수 지원자 테스트 ===")
    print(f"지원자: {spec_data['education']['university']} {spec_data['education']['major']}")
    print(f"경력: {spec_data['experience']['total_years']}년")
    print()
    
    try:
        result = evaluate_application(job_posting, spec_data, resume_data)
        
        print("=== 평가 결과 ===")
        print(f"AI 점수: {result['ai_score']}점")
        print(f"합격 여부: {result['status']}")
        print(f"신뢰도: {result['confidence']:.2f}")
        print()
        
        if result['status'] == 'PASSED':
            print("=== 합격 이유 ===")
            print(result['pass_reason'])
        else:
            print("=== 불합격 이유 ===")
            print(result['fail_reason'])
        
        return result
        
    except Exception as e:
        print(f"테스트 중 오류 발생: {e}")
        return None

if __name__ == "__main__":
    # 고득점 지원자 테스트
    high_score_result = test_application_evaluation()
    
    # 낮은 점수 지원자 테스트
    low_score_result = test_low_score_application()
    
    print("\n=== 테스트 완료 ===")
    print("모든 테스트가 완료되었습니다.") 