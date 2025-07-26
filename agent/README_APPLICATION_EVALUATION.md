
# AI 서류 평가 시스템

이 시스템은 AI를 활용하여 지원자의 서류를 자동으로 평가하고 합격/불합격을 판별하는 기능을 제공합니다.

## 🚀 실행 방법

### 1. 환경 설정
```bash
# 필요한 패키지 설치
pip install -r requirements.txt

# 환경 변수 설정 (.env 파일)
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. AI Agent 서버 실행
```bash
cd agent
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 3. 백엔드 서버 실행
```bash
# 루트 디렉토리에서
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```

## 🎯 사용 방법

### 1. 자동 AI 평가 시스템
- **배치 AI 평가**: 시스템이 10분마다 자동으로 모든 지원자의 서류를 평가합니다
- **AI 평가 결과에 따른 자동 합격/불합격 판정**: AI가 평가한 점수(70점 기준)에 따라 자동으로 합격/불합격이 판정됩니다
- **합격자만 리스트에 표시**: AI 평가로 합격 판정된 지원자만 "서류 합격자 리스트"에 표시됩니다
- **AI 평가 결과 표시**: 합격자 리스트의 각 지원자는 이미 AI 평가가 완료되어 점수와 합격 이유가 표시됩니다
- **실시간 데이터베이스 업데이트**: AI 평가 결과가 즉시 데이터베이스의 ai_score, status, pass_reason, fail_reason 필드에 저장됩니다

### 2. 수동 AI 평가 실행 (개발/테스트용)

#### 개별 지원자 평가
```bash
curl -X POST "http://localhost:8000/applications/{application_id}/ai-evaluate" \
  -H "Authorization: Bearer {your_token}"
```

#### 전체 지원자 배치 평가
```bash
curl -X POST "http://localhost:8000/applications/batch-ai-evaluate" \
  -H "Authorization: Bearer {your_token}"
```

### 3. 웹사이트에서 확인
1. 지원자 목록 페이지로 이동 (이미 AI 평가가 완료된 합격자들만 표시)
2. 지원자 카드를 클릭하여 상세 페이지 열기
3. AI 평가 점수와 합격 이유가 바로 표시됨 (이미 완료된 상태)

## 📊 평가 기준

- **학력**: 20점 (대학, 전공, 성적)
- **경력/프로젝트**: 30점 (경력년수, 회사, 프로젝트)
- **기술스택/자격증**: 25점 (언어, 프레임워크, 자격증)
- **포트폴리오/수상**: 15점 (깃허브, 프로젝트, 수상경력)
- **기타**: 10점 (추가 강점)

**합격 기준**: 70점 이상 → PASSED, 미만 → REJECTED

## 🔧 기능 개요

### 1. 자동 AI 평가 시스템
- **모든 지원자 자동 평가**: 시스템이 모든 지원자의 서류를 자동으로 평가합니다
- **AI 평가 결과에 따른 자동 합격/불합격 판정**: AI가 평가한 점수(70점 기준)에 따라 자동으로 합격/불합격이 판정됩니다
- **합격자만 리스트에 표시**: AI 평가로 합격 판정된 지원자만 "서류 합격자 리스트"에 표시됩니다
- **AI 평가 결과 표시**: 합격자 리스트의 각 지원자는 이미 AI 평가가 완료되어 점수와 합격 이유가 표시됩니다

### 2. 점수 평가 도구 (`resume_scoring_tool.py`)
- spec 테이블과 resume 테이블 데이터를 기반으로 지원자의 서류 점수를 0-100점 사이로 평가
- 평가 기준:
  - 학력 (20점)
  - 경력/프로젝트 경험 (30점)
  - 기술스택/자격증 (25점)
  - 포트폴리오/수상경력 (15점)
  - 기타 (10점)

### 3. 합격 이유 생성 도구 (`pass_reason_tool.py`)
- 점수와 평가 세부사항을 바탕으로 합격 이유를 생성
- 지원자의 주요 강점을 2-3개 정도 언급
- 채용공고 요구사항과의 일치도 강조
- 200자 이내로 간결하게 작성

### 4. 불합격 이유 생성 도구 (`fail_reason_tool.py`)
- 점수와 평가 세부사항을 바탕으로 불합격 이유를 생성
- 주요 부족한 점을 2-3개 정도 언급
- 구체적인 개선점 제시
- 건설적인 피드백 제공

### 5. 서류 합격 판별 도구 (`application_decision_tool.py`)
- 점수를 기반으로 최종 합격/불합격을 판별
- 기본 합격 기준: 70점 이상
- PASSED 또는 REJECTED 상태 반환

## API 엔드포인트

### POST `/evaluate-application/`

지원자의 서류를 AI로 평가합니다.

**요청 본문:**
```json
{
    "job_posting": "채용공고 내용...",
    "spec_data": {
        "education": {
            "university": "서울대학교",
            "major": "컴퓨터공학과",
            "degree": "학사",
            "gpa": 4.2
        },
        "experience": {
            "total_years": 3,
            "companies": ["네이버", "카카오"],
            "projects": ["대용량 트래픽 처리 시스템"]
        },
        "skills": {
            "programming_languages": ["Java", "Python"],
            "frameworks": ["Spring Boot", "Django"],
            "databases": ["MySQL", "PostgreSQL"],
            "certifications": ["정보처리기사"]
        },
        "portfolio": {
            "github": "https://github.com/testuser",
            "projects": ["E-commerce Platform"],
            "awards": ["대학생 소프트웨어 경진대회 금상"]
        }
    },
    "resume_data": {
        "personal_info": {
            "name": "김개발",
            "email": "kim@example.com"
        },
        "summary": "3년간의 백엔드 개발 경험...",
        "work_experience": [
            {
                "company": "네이버",
                "position": "백엔드 개발자",
                "period": "2021-2023",
                "description": "대용량 트래픽 처리 시스템 개발"
            }
        ],
        "projects": [
            {
                "name": "E-commerce Platform",
                "description": "Spring Boot 기반의 전자상거래 플랫폼",
                "technologies": ["Java", "Spring Boot", "MySQL"]
            }
        ]
    }
}
```

**응답:**
```json
{
    "ai_score": 85.0,
    "status": "PASSED",
    "pass_reason": "서울대학교 컴퓨터공학과 졸업으로 우수한 학력과 3년간의 관련 업계 경험을 보유하고 있습니다. 특히 요구 기술스택과 높은 일치도를 보이며, 다양한 프로젝트 경험과 수상경력이 있어 채용공고의 요구사항에 적합합니다.",
    "fail_reason": "",
    "scoring_details": {
        "education": {
            "score": 18,
            "max_score": 20,
            "reason": "서울대학교 컴퓨터공학과 졸업으로 우수한 학력"
        },
        "experience": {
            "score": 25,
            "max_score": 30,
            "reason": "3년간의 관련 업계 경험과 다양한 프로젝트 수행"
        },
        "skills": {
            "score": 22,
            "max_score": 25,
            "reason": "요구 기술스택과 높은 일치도, 관련 자격증 보유"
        },
        "portfolio": {
            "score": 12,
            "max_score": 15,
            "reason": "포트폴리오 품질 우수, 수상경력 있음"
        },
        "others": {
            "score": 8,
            "max_score": 10,
            "reason": "추가적인 강점들"
        }
    },
    "decision_reason": "85점의 높은 점수로 합격 기준을 충족합니다.",
    "confidence": 0.95,
    "message": "Application evaluation completed successfully"
}
```

## 데이터베이스 연동

평가 결과는 다음과 같이 데이터베이스에 저장됩니다:

- **ai_score**: `application` 테이블의 `ai_score` 필드
- **status**: `application` 테이블의 `status` 필드 (PASSED/REJECTED)
- **pass_reason**: `application` 테이블의 `pass_reason` 필드
- **fail_reason**: `application` 테이블의 `fail_reason` 필드

## 테스트

테스트 파일을 실행하여 기능을 확인할 수 있습니다:

```bash
python test_application_evaluation.py
```

이 테스트는 다음과 같은 시나리오를 포함합니다:
1. 고득점 지원자 (합격 예상)
2. 낮은 점수 지원자 (불합격 예상)

## 설정

### 환경 변수
- `OPENAI_API_KEY`: OpenAI API 키 (필수)

### 의존성
- langchain-openai
- langgraph
- fastapi
- requests

## 사용 예시

```python
from agents.application_evaluation_agent import evaluate_application

# 평가 실행
result = evaluate_application(job_posting, spec_data, resume_data)

# 결과 확인
print(f"점수: {result['ai_score']}")
print(f"합격 여부: {result['status']}")
print(f"합격 이유: {result['pass_reason']}")
```

## 주의사항

1. **API 키 설정**: OpenAI API 키가 올바르게 설정되어야 합니다.
2. **데이터 형식**: spec_data와 resume_data는 지정된 형식을 따라야 합니다.
3. **점수 기준**: 기본 합격 기준은 70점이며, 필요에 따라 조정 가능합니다.
4. **에러 처리**: API 호출 실패 시 기본값이 반환됩니다.
5. **포트 설정**: AI Agent는 8001 포트, 백엔드는 8000 포트에서 실행됩니다.

## 🐛 문제 해결

### AI Agent 연결 실패
- AI Agent 서버가 8001 포트에서 실행 중인지 확인
- `http://localhost:8001/evaluate-application/` 엔드포인트 접근 가능한지 확인

### OpenAI API 오류
- API 키가 올바르게 설정되었는지 확인
- API 사용량 한도를 초과하지 않았는지 확인

### 데이터베이스 오류
- MySQL 서버가 실행 중인지 확인
- 데이터베이스 연결 정보가 올바른지 확인 