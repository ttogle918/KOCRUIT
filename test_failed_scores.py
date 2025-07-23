import requests

# 필기불합격자 API 테스트
url = 'http://localhost:8000/api/v1/written-test/failed/17'
response = requests.get(url)

print('필기불합격자 API 응답:')
print(f'상태 코드: {response.status_code}')

if response.status_code == 200:
    data = response.json()
    print(f'필기불합격자 수: {len(data)}')
    
    # 점수 분석
    null_scores = [app for app in data if app['written_test_score'] is None]
    with_scores = [app for app in data if app['written_test_score'] is not None]
    
    print(f'점수가 null인 지원자: {len(null_scores)}명')
    print(f'점수가 있는 지원자: {len(with_scores)}명')
    
    print('\n점수가 null인 지원자들 (처음 5개):')
    for app in null_scores[:5]:
        print(f'- {app["user_name"]}: 점수={app["written_test_score"]}, 평가일={app["evaluation_date"]}')
    
    print('\n점수가 있는 지원자들 (처음 5개):')
    for app in with_scores[:5]:
        print(f'- {app["user_name"]}: 점수={app["written_test_score"]}, 평가일={app["evaluation_date"]}')
else:
    print(f'오류: {response.text}') 