# 🚀 Docker 실행 가이드

## 📋 전체 실행 과정

### 1. 기존 컨테이너 정리
```bash
docker stop my-mysql && docker rm my-mysql
```

### 2. Docker Compose로 전체 서비스 시작
```bash
docker-compose up -d
```

### 3. 데이터베이스 초기화 확인
```bash
# MySQL 컨테이너가 healthy 상태인지 확인
docker ps

# 데이터베이스 생성 확인
docker exec mysql mysql -u root -proot -e "SHOW DATABASES;"

# 테이블 생성 확인
docker exec mysql mysql -u root -proot -e "USE kocruit_db; SHOW TABLES;"
```

### 4. 시드 데이터 삽입
```bash
# initdb 디렉토리로 이동
cd initdb

# 시드 데이터 실행
python3 2_seed_data.py
```

### 5. 데이터 확인
```bash
# 데이터 개수 확인
docker exec mysql mysql -u root -proot -e "USE kocruit_db; SELECT COUNT(*) as company_count FROM company; SELECT COUNT(*) as user_count FROM users;"
```

## 🎯 현재 상태
- ✅ **MySQL**: 포트 3307에서 실행 중 (13개 회사, 5,012명 사용자 데이터 포함)
- ✅ **Spring Boot**: 포트 8081에서 실행 중 (JWT 설정 문제 있음)
- ✅ **React**: 포트 5173에서 실행 중

## 🌐 접속 주소
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8081
- **MySQL**: localhost:3307

## 📝 자주 사용하는 명령어들

### 전체 시스템 시작
```bash
docker-compose up -d
```

### 서비스 상태 확인
```bash
docker ps
```

### 로그 확인
```bash
# MySQL 로그
docker logs mysql

# Spring Boot 로그 (에러가 있을 때)
docker logs kocruit_springboot

# React 로그
docker logs kocruit_react
```

### 서비스 중지
```bash
docker-compose down
```

### 특정 서비스만 재시작
```bash
docker-compose restart [service_name]
# 예: docker-compose restart backend
```

### 데이터베이스 접속
```bash
docker exec -it mysql mysql -u root -proot kocruit_db
```

### 컨테이너 내부 접속
```bash
# MySQL 컨테이너 접속
docker exec -it mysql bash

# Spring Boot 컨테이너 접속
docker exec -it kocruit_springboot sh

# React 컨테이너 접속
docker exec -it kocruit_react sh
```

## 🔧 문제 해결

### 포트 충돌 시
```bash
# 사용 중인 포트 확인
lsof -i :3307
lsof -i :8081
lsof -i :5173

# 특정 포트 사용 프로세스 종료
kill -9 [PID]
```

### 컨테이너 재빌드
```bash
# 특정 서비스만 재빌드
docker-compose build [service_name]

# 전체 재빌드
docker-compose build --no-cache
```

### 볼륨 삭제 (데이터 초기화)
```bash
docker-compose down -v
```

## 📊 데이터베이스 정보

### 연결 정보
- **Host**: localhost
- **Port**: 3307
- **Database**: kocruit_db
- **Username**: root
- **Password**: root

### 테이블 목록
- company
- users
- resume
- spec
- department
- jobpost
- company_user
- schedule
- applicant_user
- application
- field_name_score
- jobpost_role
- weight
- schedule_interview
- notification
- resume_memo
- interview_evaluation
- evaluation_detail
- interview_question

## ⚠️ 주의사항

1. **Spring Boot JWT 설정**: 현재 JWT 시크릿 키 설정 문제가 있습니다.
2. **데이터 백업**: 중요한 데이터가 있다면 정기적으로 백업하세요.
3. **포트 충돌**: 3307, 8081, 5173 포트가 사용 중이지 않은지 확인하세요.

## 🚀 빠른 시작

새로운 환경에서 처음 실행할 때:

```bash
# 1. 프로젝트 디렉토리로 이동
cd /path/to/KOSA-FINAL-PROJECT-02

# 2. 전체 서비스 시작
docker-compose up -d

# 3. 상태 확인
docker ps

# 4. 시드 데이터 삽입 (처음 한 번만)
cd initdb && python3 2_seed_data.py

# 5. 브라우저에서 접속
# Frontend: http://localhost:5173
# Backend: http://localhost:8081
``` 