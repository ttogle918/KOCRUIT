# Backend App 구조

## 디렉토리 구조 및 역할

```
app/
├── api/           # API 엔드포인트 (라우터)
│   └── v1/       # API 버전 1
│       ├── auth.py           # 인증 관련 API
│       ├── companies.py      # 회사 관련 API
│       ├── jobs.py          # 채용공고 관련 API
│       ├── applications.py  # 지원 관련 API
│       ├── resumes.py       # 이력서 관련 API
│       ├── schedules.py     # 일정 관련 API
│       ├── notifications.py # 알림 관련 API
│       └── api.py          # API 라우터 통합
├── core/          # 핵심 설정 및 유틸리티
│   ├── config.py    # 환경 설정
│   └── database.py  # 데이터베이스 설정
├── models/         # SQLAlchemy 데이터베이스 모델
│   ├── user.py
│   ├── company.py
│   ├── job.py
│   ├── application.py
│   ├── resume.py
│   ├── schedule.py
│   ├── notification.py
│   └── spec.py
├── schemas/        # Pydantic 스키마 (요청/응답 모델)
├── services/       # 비즈니스 로직
└── exceptions/     # 커스텀 예외 처리
```

## 각 디렉토리 역할

### `api/` - API 엔드포인트
- FastAPI 라우터들을 정의
- HTTP 요청/응답 처리
- URL 경로 정의

### `models/` - 데이터베이스 모델
- SQLAlchemy ORM 모델
- 데이터베이스 테이블 구조 정의
- 모델 간 관계 정의

### `schemas/` - Pydantic 스키마
- API 요청/응답 데이터 검증
- 데이터 직렬화/역직렬화
- OpenAPI 문서 자동 생성

### `services/` - 비즈니스 로직
- 복잡한 비즈니스 로직 처리
- 데이터베이스 조작 로직
- 외부 API 호출 등

### `core/` - 핵심 설정
- 데이터베이스 연결 설정
- 환경 변수 관리
- 공통 유틸리티

### `exceptions/` - 예외 처리
- 커스텀 예외 클래스
- 에러 핸들링 로직

## 구조의 장점

1. **관심사 분리**: 각 디렉토리가 명확한 역할을 가짐
2. **확장성**: 새로운 기능 추가 시 적절한 위치에 배치 가능
3. **유지보수성**: 코드가 논리적으로 분리되어 있어 유지보수 용이
4. **테스트 용이성**: 각 레이어별로 독립적인 테스트 가능 