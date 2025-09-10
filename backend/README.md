# 🚀 Kocruit Backend

> **FastAPI 기반 채용 관리 시스템 백엔드**

## 📋 개요

Kocruit의 백엔드는 FastAPI를 기반으로 구축된 RESTful API 서버입니다. 채용공고 관리, 지원자 관리, AI 이력서 분석, 면접 시스템 등 채용 프로세스의 모든 기능을 제공합니다.

## 🛠️ 기술 스택

- **Framework**: FastAPI 0.104+
- **Database**: MySQL 8.0 (AWS RDS)
- **Cache**: Redis 7.0
- **ORM**: SQLAlchemy 2.0
- **Authentication**: JWT
- **Background Tasks**: APScheduler
- **Documentation**: Swagger UI

## 🏗️ 아키텍처

```
backend/
├── app/
│   ├── api/v1/          # API 라우터들
│   ├── core/            # 핵심 설정
│   ├── models/          # 데이터베이스 모델
│   ├── schemas/         # Pydantic 스키마
│   ├── services/        # 비즈니스 로직
│   └── utils/           # 유틸리티 함수
├── initdb/              # 데이터베이스 초기화
└── Dockerfile           # Docker 설정
```

## 🚀 주요 기능

### 📝 채용공고 관리
- **CRUD 작업**: 채용공고 생성, 수정, 삭제, 조회
- **상태 관리**: 게시/비게시, 마감 상태 관리
- **검색 및 필터링**: 키워드, 부서별, 상태별 검색

### 👤 지원자 관리
- **지원서 처리**: 지원서 제출, 수정, 삭제
- **상태 추적**: 지원 단계별 상태 관리
- **이력서 관리**: 파일 업로드, 다운로드, 분석

### 🤖 AI 이력서 분석
- **형광펜 하이라이팅**: AI가 핵심 내용 색상별 구분
- **경쟁력 비교**: 동일 직무 지원자 상대적 평가
- **키워드 매칭**: 채용공고 요구사항과 적합도 분석

### 🎤 면접 시스템
- **AI 면접**: 비디오 업로드 및 분석
- **실시간 면접**: WebSocket 기반 실시간 음성인식
- **면접관 배정**: 자동 면접관 매칭 시스템

### 📊 통계 및 분석
- **채용 현황**: 실시간 채용 통계
- **성과 분석**: 면접 패턴, 성공률 분석
- **리포트 생성**: 다양한 형태의 분석 리포트

## 🔧 API 엔드포인트

### 인증 (Authentication)
- `POST /api/v1/auth/login` - 로그인
- `POST /api/v1/auth/register` - 회원가입
- `POST /api/v1/auth/refresh` - 토큰 갱신

### 채용공고 (Job Posts)
- `GET /api/v1/jobs/` - 채용공고 목록
- `POST /api/v1/jobs/` - 채용공고 생성
- `GET /api/v1/jobs/{id}` - 채용공고 상세
- `PUT /api/v1/jobs/{id}` - 채용공고 수정
- `DELETE /api/v1/jobs/{id}` - 채용공고 삭제

### 지원자 (Applications)
- `GET /api/v1/applications/` - 지원자 목록
- `POST /api/v1/applications/` - 지원서 제출
- `GET /api/v1/applications/{id}` - 지원서 상세
- `PUT /api/v1/applications/{id}` - 지원서 수정

### 이력서 분석 (Resume Analysis)
- `POST /api/v1/resume/analyze` - 이력서 분석
- `GET /api/v1/resume/highlight/{id}` - 하이라이팅 결과
- `GET /api/v1/resume/competitiveness/{id}` - 경쟁력 분석

### 면접 (Interview)
- `POST /api/v1/interview/ai-interview` - AI 면접 시작
- `POST /api/v1/interview/realtime-interview` - 실시간 면접
- `GET /api/v1/interview/evaluations/{id}` - 면접 평가 결과

## 🚀 실행 방법

### 1. 환경 설정
```bash
# 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt
```

### 2. 환경 변수 설정
```bash
# .env 파일 생성
echo "DATABASE_URL=mysql://user:password@localhost:3306/kocruit" > .env
echo "REDIS_URL=redis://localhost:6379" >> .env
echo "JWT_SECRET_KEY=your-secret-key" >> .env
echo "OPENAI_API_KEY=your-openai-key" >> .env
```

### 3. 데이터베이스 설정
```bash
# MySQL 데이터베이스 생성
mysql -u root -p
CREATE DATABASE kocruit;

# 테이블 생성
python initdb/create_tables.py
```

### 4. 서버 실행
```bash
# 개발 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 프로덕션 서버 실행
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### 5. Docker로 실행
```bash
# Docker 이미지 빌드
docker build -t kocruit-backend .

# Docker 컨테이너 실행
docker run -p 8000:8000 --env-file .env kocruit-backend
```

## 📊 데이터베이스 스키마

### 주요 테이블
- **companies**: 회사 정보
- **job_posts**: 채용공고
- **applications**: 지원서
- **resumes**: 이력서
- **interview_evaluations**: 면접 평가
- **users**: 사용자 정보

### 관계
- Company → Job Posts (1:N)
- Job Post → Applications (1:N)
- Application → Resume (1:1)
- Application → Interview Evaluations (1:N)

## 🔒 보안

- **JWT 인증**: 모든 API 엔드포인트 보호
- **CORS 설정**: 프론트엔드 도메인만 허용
- **Rate Limiting**: API 호출 제한
- **데이터 검증**: Pydantic을 통한 입력 검증

## 📈 성능 최적화

- **Redis 캐싱**: 자주 조회되는 데이터 캐싱
- **데이터베이스 인덱싱**: 쿼리 성능 최적화
- **비동기 처리**: FastAPI의 비동기 기능 활용
- **연결 풀링**: 데이터베이스 연결 최적화

## 🧪 테스트

```bash
# 단위 테스트 실행
pytest tests/

# 커버리지 리포트 생성
pytest --cov=app tests/

# API 테스트 실행
pytest tests/api/
```

## 📚 API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.
