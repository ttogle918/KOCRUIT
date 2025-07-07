# DBeaver로 로컬 MySQL 연결 가이드

## 📋 연결 정보

### 기본 연결 정보
- **호스트**: `localhost`
- **포트**: `3306`
- **데이터베이스**: `kocruit`
- **사용자명**: `kocruit_user` (권장) 또는 `root`
- **비밀번호**: `kocruit_pass` (kocruit_user용) 또는 `password` (root용)

## 🔧 DBeaver 연결 설정 단계

### 1. DBeaver 실행
- DBeaver를 실행합니다.

### 2. 새 데이터베이스 연결 생성
1. **파일** → **새로 만들기** → **데이터베이스 연결** 클릭
2. 또는 상단 툴바의 **새 연결** 버튼 클릭

### 3. 데이터베이스 선택
1. **MySQL** 선택
2. **다음** 클릭

### 4. 연결 설정 입력
```
서버 호스트: localhost
포트: 3306
데이터베이스: kocruit
사용자명: kocruit_user
비밀번호: kocruit_pass
```

### 5. 연결 테스트
1. **연결 테스트** 버튼 클릭
2. "연결됨" 메시지 확인
3. **확인** 클릭

## 🔍 연결 문제 해결

### 문제 1: 연결 거부됨
**해결방법:**
1. Docker 컨테이너가 실행 중인지 확인:
   ```bash
   docker ps | grep mysql
   ```

2. MySQL 컨테이너 재시작:
   ```bash
   docker-compose restart mysql
   ```

### 문제 2: 인증 실패
**해결방법:**
1. root 계정으로 연결 시도:
   ```
   사용자명: root
   비밀번호: password
   ```

2. 또는 MySQL 컨테이너에서 사용자 재생성:
   ```bash
   docker exec -it kocruit_mysql mysql -u root -ppassword
   ```

### 문제 3: 데이터베이스 없음
**해결방법:**
1. 데이터베이스 생성 확인:
   ```bash
   docker exec -it kocruit_mysql mysql -u root -ppassword -e "SHOW DATABASES;"
   ```

## 📊 연결 후 확인할 수 있는 내용

### 테이블 목록
- `users` - 사용자 정보 (5,129개)
- `company` - 회사 정보 (13개)
- `jobpost` - 채용공고 (65개)
- `application` - 지원서 (121개)
- `resume` - 이력서 (2,951개)
- `department` - 부서 정보
- `company_user` - 회사 사용자
- `schedule` - 일정
- 기타 20개 테이블

### 샘플 쿼리
```sql
-- 사용자 수 확인
SELECT COUNT(*) as user_count FROM users;

-- 회사별 채용공고 수
SELECT c.name, COUNT(j.id) as job_count 
FROM company c 
LEFT JOIN jobpost j ON c.id = j.company_id 
GROUP BY c.id, c.name;

-- 지원 현황
SELECT j.title, COUNT(a.id) as application_count 
FROM jobpost j 
LEFT JOIN application a ON j.id = a.job_post_id 
GROUP BY j.id, j.title;
```

## 🔐 보안 주의사항

1. **개발 환경 전용**: 이 설정은 로컬 개발 환경에서만 사용
2. **비밀번호 보호**: 프로덕션에서는 강력한 비밀번호 사용
3. **접근 제한**: 필요한 경우에만 외부 접근 허용

## 📝 추가 설정 (선택사항)

### SSL 설정
- **SSL 모드**: `DISABLED` (로컬 개발용)

### 드라이버 설정
- **드라이버**: MySQL 8.0+ 호환 드라이버
- **URL**: `jdbc:mysql://localhost:3306/kocruit`

### 연결 풀 설정
- **최대 연결 수**: 10
- **초기 연결 수**: 2
- **최대 대기 시간**: 30초 