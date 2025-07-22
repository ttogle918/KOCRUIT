#!/usr/bin/env python3
"""
파란색 형광펜 기능을 테스트하는 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from tools.highlight_resume_tool import highlight_blue

def test_blue_highlight():
    """파란색 하이라이트 기능 테스트"""
    print("=== 파란색 하이라이트 테스트 ===")
    
    # 테스트 데이터
    resume_text = """
    저는 Java와 Spring Framework를 활용하여 웹 애플리케이션을 개발한 경험이 있습니다.
    Python을 배우고 싶어서 온라인 강의를 수강하고 있습니다.
    Spring Boot 프로젝트에서 REST API를 구축하고 MySQL 데이터베이스를 연동했습니다.
    React를 사용해 프론트엔드를 개발하고 싶습니다.
    Docker를 활용하여 개발 환경을 구축하고 배포 자동화를 구현했습니다.
    """
    
    qualifications = "[필수] Java, Spring [우대] Python, React, MySQL, Docker"
    
    print(f"자기소개서: {resume_text}")
    print(f"자격요건: {qualifications}")
    
    try:
        result = highlight_blue(resume_text, "", qualifications)
        print(f"\n하이라이트 결과: {len(result)}개")
        for i, highlight in enumerate(result, 1):
            print(f"{i}. 텍스트: '{highlight.get('text', 'N/A')}'")
            print(f"   시작: {highlight.get('start', 0)}, 끝: {highlight.get('end', 0)}")
            print(f"   신뢰도: {highlight.get('confidence', 0)}")
            print(f"   이유: {highlight.get('reason', 'N/A')}")
            print()
    except Exception as e:
        print(f"오류 발생: {e}")

if __name__ == "__main__":
    test_blue_highlight() 