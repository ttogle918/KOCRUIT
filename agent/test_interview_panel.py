#!/usr/bin/env python3
"""
Test script for interview panel auto-assignment system
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

def test_interview_panel_system():
    """Test the complete interview panel auto-assignment flow"""
    
    print("🧪 Testing Interview Panel Auto-Assignment System")
    print("=" * 50)
    
    # Test data
    test_job_post = {
        "title": "테스트 개발자 모집",
        "department": "개발팀",
        "qualifications": "3년 이상의 개발 경험",
        "conditions": "정규직, 서울시 강남구",
        "job_details": "웹 애플리케이션 개발",
        "procedures": "서류전형 -> 면접 -> 최종합격",
        "headcount": 2,
        "start_date": "2024-01-15 09:00",
        "end_date": "2024-12-31 18:00",
        "location": "서울시 강남구",
        "employment_type": "정규직",
        "deadline": "2024-01-31",
        "teamMembers": [
            {"email": "manager@company.com", "role": "관리자"}
        ],
        "weights": [
            {"item": "기술력", "score": 8.5},
            {"item": "의사소통", "score": 7.0},
            {"item": "경험", "score": 6.5},
            {"item": "학력", "score": 5.0},
            {"item": "인성", "score": 7.5}
        ],
        "interview_schedules": [
            {
                "interview_date": "2024-02-15",
                "interview_time": "14:00",
                "location": "회사 본사 3층 회의실"
            }
        ]
    }
    
    try:
        # 1. Create a job post (this should trigger interview panel assignment)
        print("1. Creating job post...")
        response = requests.post(f"{API_BASE}/company/jobposts", json=test_job_post)
        
        if response.status_code in [200, 201]:
            job_post = response.json()
            job_post_id = job_post['id']
            print(f"✅ Job post created with ID: {job_post_id}")
            
            # 2. Check if interview panel assignments were created
            print("\n2. Checking interview panel assignments...")
            response = requests.get(f"{API_BASE}/interview-panel/assignments/{job_post_id}/")
            
            if response.status_code == 200:
                assignments = response.json()
                print(f"✅ Found {len(assignments)} interview panel assignments")
                
                for assignment in assignments:
                    print(f"   - Type: {assignment['assignment_type']}")
                    print(f"   - Status: {assignment['status']}")
                    print(f"   - Required: {assignment['required_count']}")
                    print(f"   - Requests: {assignment['requests_count']}")
                    print(f"   - Members: {assignment['members_count']}")
            else:
                print(f"❌ Failed to get assignments: {response.status_code}")
                print(response.text)
            
            # 3. Get panel members
            print("\n3. Getting panel members...")
            response = requests.get(f"{API_BASE}/interview-panel/panel-members/{job_post_id}/")
            
            if response.status_code == 200:
                members = response.json()
                print(f"✅ Found {len(members)} panel members")
                
                for member in members:
                    print(f"   - {member['name']} ({member['email']})")
                    print(f"     Role: {member['role']}, Type: {member['assignment_type']}")
            else:
                print(f"❌ Failed to get panel members: {response.status_code}")
                print(response.text)
            
            # 4. Test getting pending requests (would need authentication)
            print("\n4. Testing pending requests endpoint...")
            response = requests.get(f"{API_BASE}/interview-panel/my-pending-requests/")
            
            if response.status_code == 401:
                print("✅ Authentication required (expected)")
            else:
                print(f"⚠️ Unexpected response: {response.status_code}")
            
        else:
            print(f"❌ Failed to create job post: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")

def test_manual_interviewer_assignment():
    """Test manual interviewer assignment"""
    
    print("\n🧪 Testing Manual Interviewer Assignment")
    print("=" * 50)
    
    # Test criteria
    test_criteria = {
        "job_post_id": 1,  # Assuming job post ID 1 exists
        "schedule_id": 1,  # Assuming schedule ID 1 exists
        "same_department_count": 2,
        "hr_department_count": 1
    }
    
    try:
        print("1. Manually assigning interviewers...")
        response = requests.post(f"{API_BASE}/interview-panel/assign-interviewers/", json=test_criteria)
        
        if response.status_code == 200:
            assignments = response.json()
            print(f"✅ Successfully assigned {len(assignments)} interview panel assignments")
            
            for assignment in assignments:
                print(f"   - Assignment ID: {assignment['id']}")
                print(f"   - Type: {assignment['assignment_type']}")
                print(f"   - Required: {assignment['required_count']}")
        else:
            print(f"❌ Failed to assign interviewers: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Manual assignment test failed: {str(e)}")

if __name__ == "__main__":
    print("🚀 Starting Interview Panel System Tests")
    print("Make sure the backend server is running on http://localhost:8000")
    print()
    
    test_interview_panel_system()
    test_manual_interviewer_assignment()
    
    print("\n✅ All tests completed!") 