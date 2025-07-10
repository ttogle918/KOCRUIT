# 로컬 테스트 환경 가이드

## 개요
이 프로젝트는 AWS RDS와 로컬 MySQL 두 가지 환경을 지원합니다.

## 환경별 설정

### 1. AWS RDS 환경 (기본)
```bash
# AWS RDS 사용 (기존 데이터 유지)
docker-compose up -d
```
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:5173
- **Redis**: localhost:6379
- **Database**: AWS RDS (kocruit-01.c5k2wi2q8g80.us-east-2.rds.amazonaws.com)

### 2. 로컬 MySQL 환경 (테스트용)
```bash
# 로컬 MySQL 사용 (빈 데이터베이스)
docker-compose -f docker-compose.local.yml up -d
```
- **Backend**: http://localhost:8002
- **Frontend**: http://localhost:5174
- **Redis**: localhost:6380
- **Database**: 로컬 MySQL (localhost:3308)

## 데이터 백업 및 복구

### AWS RDS 데이터 백업
```bash
# 백업 스크립트 실행
python backup_aws_data.py
```
- `aws_backup_YYYYMMDD_HHMMSS.json` 파일로 백업됨

### 로컬 환경에 데이터 복원
```bash
# 1. 로컬 환경 시작
docker-compose -f docker-compose.local.yml up -d

# 2. 백업 파일을 로컬 MySQL에 복원
# (복원 스크립트는 별도 개발 필요)
```

## 주의사항

### ⚠️ 중요
- **AWS RDS 환경**: 기존 프로덕션 데이터 사용
- **로컬 환경**: 완전히 새로운 빈 데이터베이스
- 두 환경은 완전히 분리되어 있음

### 포트 충돌 방지
- AWS 환경: 8000, 5173, 6379
- 로컬 환경: 8002, 5174, 6380, 3308

## 개발 워크플로우

### 1. 안전한 테스트
```bash
# 로컬 환경에서 테스트
docker-compose -f docker-compose.local.yml up -d
# http://localhost:8002 에서 API 테스트
# http://localhost:5174 에서 프론트엔드 테스트
```

### 2. 프로덕션 적용
```bash
# 테스트 완료 후 AWS 환경에 적용
docker-compose up -d
```

## 문제 해결

### 로컬 MySQL 연결 실패
```bash
# 컨테이너 재시작
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up -d

# 로그 확인
docker-compose -f docker-compose.local.yml logs mysql
```

### 포트 충돌
```bash
# 사용 중인 포트 확인
netstat -ano | findstr :8002
netstat -ano | findstr :5174
```

## 환경 변수

### AWS 환경 (docker-compose.yml)
```yaml
environment:
  DB_HOST: kocruit-01.c5k2wi2q8g80.us-east-2.rds.amazonaws.com
  DB_NAME: kocruit
  DB_USER: admin
  DB_PASSWORD: kocruit1234!
```

### 로컬 환경 (docker-compose.local.yml)
```yaml
environment:
  DB_HOST: mysql
  DB_NAME: kocruit_db
  DB_USER: myuser
  DB_PASSWORD: 1234
``` 