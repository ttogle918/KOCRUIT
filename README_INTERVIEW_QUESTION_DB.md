# Interview Question DB 저장 기능

## 개요

LangGraph로 생성된 면접 질문을 데이터베이스에 저장하고 관리하는 기능이 추가되었습니다. 이 기능을 통해 공통질문과 개별질문을 구분하여 저장하고, 나중에 재사용할 수 있습니다.

## 주요 기능

### 1. 질문 유형 분류
- **COMMON**: 공통질문 (회사/공고 기반)
- **PERSONAL**: 개별질문 (이력서 기반)
- **COMPANY**: 회사 관련 질문
- **JOB**: 직무 관련 질문
- **EXECUTIVE**: 임원면접 질문
- **SECOND**: 2차 면접 질문
- **FINAL**: 최종 면접 질문

### 2. 데이터베이스 스키마

```sql
CREATE TABLE interview_question (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    type           ENUM('common', 'personal', 'company', 'job', 'executive', 'second', 'final') NOT NULL,
    question_text  TEXT NOT NULL,
    category       VARCHAR(50),
    difficulty     VARCHAR(20),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (application_id) REFERENCES application(id)
);
```

## API 엔드포인트

### 1. 통합 질문 생성 및 DB 저장
```http
POST /api/v1/interview-questions/integrated-questions
```

**요청 예시:**
```json
{
    "resume_id": 1,
    "application_id": 41,
    "company_name": "KOSA공공",
    "name": "홍길동"
}
```

**응답:**
- 질문 생성 결과와 함께 자동으로 DB에 저장
- `application_id`가 제공된 경우에만 DB 저장 수행

### 2. 저장된 질문 조회
```http
GET /api/v1/interview-questions/application/{application_id}
```

**응답:**
```json
[
    {
        "id": 1,
        "application_id": 41,
        "type": "common",
        "question_text": "자기소개를 해주세요.",
        "category": "인성/동기",
        "difficulty": "easy",
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00"
    }
]
```

### 3. 유형별 질문 조회
```http
GET /api/v1/interview-questions/application/{application_id}/by-type
```

**응답:**
```json
{
    "common_questions": ["자기소개를 해주세요.", "우리 회사에 지원한 이유는?"],
    "personal_questions": ["이력서의 프로젝트 경험에 대해 설명해주세요."],
    "company_questions": ["회사의 최근 동향에 대해 어떻게 생각하나요?"],
    "job_questions": ["이 직무에서 가장 중요한 역량은 무엇이라고 생각하나요?"],
    "executive_questions": [],
    "second_questions": [],
    "final_questions": []
}
```

### 4. 대량 질문 생성
```http
POST /api/v1/interview-questions/bulk-create
```

**요청 예시:**
```json
{
    "application_id": 41,
    "questions": [
        {
            "type": "common",
            "question_text": "자기소개를 해주세요.",
            "category": "인성/동기",
            "difficulty": "easy"
        },
        {
            "type": "personal",
            "question_text": "이력서에 있는 프로젝트 경험에 대해 설명해주세요.",
            "category": "프로젝트 경험",
            "difficulty": "medium"
        }
    ]
}
```

## 서비스 클래스

### InterviewQuestionService

주요 메서드:

1. **create_question()**: 단일 질문 생성
2. **create_questions_bulk()**: 대량 질문 생성
3. **save_langgraph_questions()**: LangGraph 생성 결과를 DB에 저장
4. **get_questions_by_application()**: 지원서별 질문 조회
5. **get_questions_by_type()**: 유형별 분류 조회

## 마이그레이션

### 1. 마이그레이션 실행
```bash
python run_interview_question_migration.py
```

### 2. 마이그레이션 내용
- 기존 `interview_question` 테이블 백업
- 새로운 스키마로 테이블 재생성
- 기존 데이터 복원 (가능한 경우)

## 테스트

### 테스트 실행
```bash
python test_interview_question_db.py
```

### 테스트 항목
1. 통합 질문 생성 및 DB 저장 테스트
2. 대량 질문 생성 테스트
3. 질문 조회 테스트
4. LangGraph 워크플로우 통합 테스트

## 사용 예시

### 1. LangGraph 워크플로우와 통합
```python
# 기존 API 호출 시 자동으로 DB에 저장됨
response = requests.post(
    "http://localhost:8000/api/v1/interview-questions/integrated-questions",
    json={
        "resume_id": 1,
        "application_id": 41,
        "company_name": "KOSA공공",
        "name": "홍길동"
    }
)

# 저장된 질문 조회
saved_questions = requests.get(
    "http://localhost:8000/api/v1/interview-questions/application/41/by-type"
)
```

### 2. 프론트엔드에서 활용
```javascript
// 질문 생성 후 저장된 질문 조회
const generateQuestions = async () => {
    const response = await fetch('/api/v1/interview-questions/integrated-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            resume_id: 1,
            application_id: 41,
            company_name: 'KOSA공공',
            name: '홍길동'
        })
    });
    
    // 저장된 질문 조회
    const savedQuestions = await fetch('/api/v1/interview-questions/application/41/by-type');
    const questionsByType = await savedQuestions.json();
    
    console.log('공통질문:', questionsByType.common_questions);
    console.log('개별질문:', questionsByType.personal_questions);
};
```

## 주의사항

1. **DB 저장 실패 처리**: DB 저장이 실패해도 API 응답은 정상적으로 반환됩니다.
2. **중복 저장 방지**: 같은 `application_id`에 대해 여러 번 호출해도 중복 저장되지 않습니다.
3. **데이터 무결성**: `application_id`가 유효한지 확인 후 저장합니다.
4. **성능 최적화**: 대량 질문 생성 시 트랜잭션을 사용하여 성능을 최적화합니다.

## 향후 개선 사항

1. **질문 품질 평가**: 생성된 질문의 품질을 평가하는 기능
2. **질문 재사용**: 유사한 지원자에게 기존 질문 재사용
3. **질문 통계**: 유형별, 카테고리별 질문 통계 제공
4. **질문 수정**: 저장된 질문 수정 및 관리 기능 