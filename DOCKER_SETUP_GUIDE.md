# KOSA-FINAL-PROJECT-02 Docker 완전 초기화 및 실행 가이드

## 🚀 처음 받는 사람을 위한 완전 가이드

### 📋 사전 준비사항
- Docker Desktop 설치 및 실행
- Python 3.x 설치
- pip 설치
- mysql-connector-python 패키지 설치: `pip install mysql-connector-python`

---

## 🔄 Docker 완전 초기화 및 실행 순서

### 1. Docker Desktop 실행
```bash
# Mac에서 Docker Desktop 실행
open -a Docker
# 또는 Spotlight(⌘+Space)에서 "Docker" 검색 후 실행
```

### 2. 기존 컨테이너/볼륨 완전 정리
```bash
# 프로젝트 루트 디렉토리에서 실행
docker-compose down -v
```

### 3. Docker 컨테이너(서비스) 재시작
```bash
docker-compose up -d
```

### 4. 서비스 상태 확인
```bash
docker ps
```
**예상 결과:**
- `mysql` 컨테이너: Up 상태 (healthy)
- `kocruit_springboot` 컨테이너: Up 상태  
- `kocruit_react` 컨테이너: Up 상태

### 5. (필요시) DB 완전 초기화
```bash
# DB를 완전히 비우고 싶다면 실행
docker exec mysql mysql -u root -proot -e "DROP DATABASE IF EXISTS kocruit_db; CREATE DATABASE kocruit_db;"
```

### 6. 테이블 스키마 생성
```bash
cd initdb
docker exec -i mysql mysql -u root -proot kocruit_db < 1_create_tables.sql
```

### 7. 시드 데이터 입력
```bash
python3 2_seed_data.py
```

### 8. 데이터 확인
```bash
docker exec mysql mysql -u root -proot -e "USE kocruit_db; SELECT 'users' as table_name, COUNT(*) as count FROM users UNION ALL SELECT 'company', COUNT(*) FROM company UNION ALL SELECT 'jobpost', COUNT(*) FROM jobpost UNION ALL SELECT 'application', COUNT(*) FROM application UNION ALL SELECT 'resume', COUNT(*) FROM resume;"
```

---

## 🌐 서비스 접속 정보

- **프론트엔드 (React)**: http://localhost:5173
- **백엔드 API (Spring Boot)**: http://localhost:8081  
- **데이터베이스 (MySQL)**: localhost:3307
  - 사용자: root
  - 비밀번호: root
  - 데이터베이스: kocruit_db

---

## ⚠️ 주의사항

### 경고 메시지 해석
시드 데이터 실행 시 다음과 같은 경고가 나타날 수 있습니다:
```
⚠️ 매핑 실패 - email: hong3007@example.com, company: KOSA바이오
⚠️ 사용자 ID를 찾을 수 없음: hong1044@example.com
```

이는 다음 중 하나의 이유입니다:
1. `company_user.json`에 있는 이메일이 `users.json`에 없음
2. `applicant_user_list.json`에 있는 이메일이 `users.json`에 없음

**해결 방법:**
- 경고 메시지는 무시해도 됩니다 (기본 기능에는 영향 없음)
- 완전한 데이터를 원한다면 `users.json`에 누락된 이메일들을 추가하세요

### 데이터 파일 구조 확인
- `users.json`: 사용자 정보 (email 필드 필수)
- `company.json`: 회사 정보
- `jobpost.json`: 채용공고 정보
- `application.json`: 지원서 정보
- `resume.json`: 이력서 정보
- `company_user.json`: 회사 직원 정보
- `applicant_user_list.json`: 지원자 목록

---

## 🛠️ 문제 해결

### Docker 데몬 연결 오류
```bash
# Docker Desktop이 실행되지 않은 경우
open -a Docker
# 잠시 기다린 후 다시 시도
```

### 포트 충돌
```bash
# 포트가 이미 사용 중인 경우
lsof -i :5173  # React 포트 확인
lsof -i :8081  # Spring Boot 포트 확인  
lsof -i :3307  # MySQL 포트 확인
```

### 데이터베이스 연결 오류
```bash
# MySQL 컨테이너 상태 확인
docker logs mysql
```

---

## 📊 예상 결과

성공적으로 완료되면 다음과 같은 데이터가 생성됩니다:
- **users**: 약 5,000명
- **company**: 13개 회사
- **jobpost**: 65개 채용공고
- **application**: 120개 지원서
- **resume**: 약 3,000개 이력서

---

## 🔧 추가 명령어

### 로그 확인
```bash
# Spring Boot 로그
docker logs kocruit_springboot

# React 로그  
docker logs kocruit_react

# MySQL 로그
docker logs mysql
```

### 컨테이너 재시작
```bash
# 특정 서비스만 재시작
docker-compose restart kocruit_springboot
docker-compose restart kocruit_react
docker-compose restart mysql
```

### 전체 서비스 중지
```bash
docker-compose down
```

---

## ✅ 완료 체크리스트

- [ ] Docker Desktop 실행
- [ ] 컨테이너 정상 실행 (`docker ps` 확인)
- [ ] 데이터베이스 스키마 생성
- [ ] 시드 데이터 입력 완료
- [ ] 프론트엔드 접속 가능 (http://localhost:5173)
- [ ] 백엔드 API 접속 가능 (http://localhost:8081)

모든 항목이 체크되면 프로젝트가 정상적으로 실행되고 있습니다! 🎉 