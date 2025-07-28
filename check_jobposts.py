import requests

def check_jobposts():
    """데이터베이스에 있는 공고 목록을 확인합니다."""
    try:
        # 공고 목록 조회
        response = requests.get("http://localhost:8000/api/v1/company/jobposts")
        
        print(f"응답 상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            jobposts = response.json()
            print("=== 데이터베이스에 있는 공고 목록 ===")
            for jobpost in jobposts:
                print(f"ID: {jobpost.get('id')}, 제목: {jobpost.get('title')}")
        else:
            print("❌ 공고 목록 조회 실패!")
            print(response.text)
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

def check_applications(job_post_id):
    """특정 공고의 지원자 목록을 확인합니다."""
    try:
        response = requests.get(f"http://localhost:8000/api/v1/applications/job/{job_post_id}/applicants")
        
        print(f"\n=== 공고 ID {job_post_id}의 지원자 목록 ===")
        print(f"응답 상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            applicants = response.json()
            print(f"총 지원자 수: {len(applicants)}")
            for i, applicant in enumerate(applicants[:5]):  # 처음 5명만 출력
                print(f"{i+1}. {applicant.get('name')} - 상태: {applicant.get('status')} - 서류상태: {applicant.get('document_status')}")
        else:
            print("❌ 지원자 목록 조회 실패!")
            print(response.text)
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    print("=== 데이터베이스 상태 확인 ===")
    
    # 1. 공고 목록 확인
    check_jobposts()
    
    # 2. 공고 ID 1의 지원자 목록 확인
    check_applications(1) 