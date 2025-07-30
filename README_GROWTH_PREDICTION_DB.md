# 성장가능성 예측 DB 저장 기능

## 📋 개요

성장가능성 예측 결과를 형광펜 기능처럼 데이터베이스에 저장하고 조회할 수 있는 기능입니다. AI가 성장가능성을 분석한 후 자동으로 DB에 저장되며, 나중에 저장된 결과를 조회할 수 있습니다.

## 🎯 주요 기능

### 1. 자동 DB 저장
- 성장가능성 예측 완료 시 자동으로 DB에 저장
- 기존 결과가 있으면 업데이트, 없으면 새로 생성
- 분석 소요 시간, 버전 등 메타데이터 포함

### 2. 저장된 결과 조회
- application_id로 저장된 결과 조회
- 분석 완료 후 페이지 새로고침해도 결과 유지
- 성능 최적화를 위한 인덱스 적용

### 3. 결과 삭제
- 저장된 성장가능성 예측 결과 삭제 기능
- 관리자가 필요시 결과를 제거할 수 있음

## 🗄️ 데이터베이스 스키마

### growth_prediction_result 테이블

```sql
CREATE TABLE growth_prediction_result (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    jobpost_id INT,
    company_id INT,
    
    -- 성장가능성 예측 결과 데이터
    total_score FLOAT NOT NULL,  -- 총점
    detail JSON,  -- 항목별 상세 점수
    comparison_chart_data JSON,  -- 비교 차트 데이터
    reasons JSON,  -- 예측 근거
    boxplot_data JSON,  -- 박스플롯 데이터
    detail_explanation JSON,  -- 항목별 상세 설명
    item_table JSON,  -- 표 데이터
    narrative TEXT,  -- 자동 요약 설명
    
    -- 메타데이터
    analysis_version VARCHAR(50) DEFAULT '1.0',
    analysis_duration FLOAT,  -- 분석 소요 시간 (초)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 외래키 제약조건
    FOREIGN KEY (application_id) REFERENCES application(id) ON DELETE CASCADE,
    FOREIGN KEY (jobpost_id) REFERENCES jobpost(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE SET NULL,
    
    -- 인덱스
    INDEX idx_growth_prediction_application_id (application_id),
    INDEX idx_growth_prediction_jobpost_id (jobpost_id),
    INDEX idx_growth_prediction_company_id (company_id),
    INDEX idx_growth_prediction_created_at (created_at)
);
```

## 🔌 API 엔드포인트

### 1. 테이블 생성
```http
POST /api/v1/ai/growth-prediction/create-table
```

### 2. 성장가능성 예측 (자동 저장)
```http
POST /api/v1/ai/growth-prediction/predict
Content-Type: application/json

{
  "application_id": 123
}
```

### 3. 저장된 결과 조회
```http
GET /api/v1/ai/growth-prediction/results/{application_id}
```

### 4. 결과 삭제
```http
DELETE /api/v1/ai/growth-prediction/results/{application_id}
```

## 🖥️ 프론트엔드 사용법

### GrowthPredictionCard 컴포넌트
```jsx
import GrowthPredictionCard from './components/GrowthPredictionCard';

<GrowthPredictionCard 
  applicationId={123}
  showDetails={true}
  onResultChange={(result) => console.log('결과 변경:', result)}
/>
```

### 자동 저장된 결과 조회
- 컴포넌트 마운트 시 자동으로 저장된 결과 조회
- 저장된 결과가 있으면 즉시 표시
- 없으면 "AI 성장 가능성 예측" 버튼 표시

## 🔄 동작 흐름

1. **초기 로드**: 컴포넌트 마운트 시 저장된 결과 조회
2. **결과 없음**: "AI 성장 가능성 예측" 버튼 표시
3. **예측 실행**: 버튼 클릭 시 AI 분석 수행
4. **자동 저장**: 분석 완료 후 자동으로 DB에 저장
5. **결과 표시**: 저장된 결과를 화면에 표시
6. **재방문**: 페이지 새로고침 후에도 저장된 결과 표시

## 📊 저장되는 데이터

### 기본 정보
- `application_id`: 지원서 ID
- `jobpost_id`: 채용공고 ID
- `company_id`: 회사 ID

### 예측 결과
- `total_score`: 총 성장가능성 점수
- `detail`: 항목별 상세 점수 (JSON)
- `comparison_chart_data`: 고성과자 대비 비교 데이터
- `reasons`: 예측 근거 리스트
- `boxplot_data`: 박스플롯 통계 데이터
- `detail_explanation`: 항목별 상세 설명
- `item_table`: 표 형태의 점수 데이터
- `narrative`: AI가 생성한 요약 설명

### 메타데이터
- `analysis_version`: 분석 버전
- `analysis_duration`: 분석 소요 시간
- `created_at`: 생성 시간
- `updated_at`: 수정 시간

## ⚡ 성능 최적화

### 1. 인덱스 최적화
- `application_id` 인덱스로 빠른 조회
- `jobpost_id`, `company_id` 인덱스로 필터링 성능 향상
- `created_at` 인덱스로 시간순 정렬 최적화

### 2. 캐싱 전략
- 프론트엔드에서 저장된 결과 캐싱
- 불필요한 API 호출 방지

### 3. 에러 처리
- DB 저장 실패 시에도 분석 결과는 반환
- 저장된 결과가 없을 때의 graceful handling

## 🔧 설정 및 배포

### 1. 테이블 생성
```bash
# API를 통한 테이블 생성
curl -X POST http://localhost:8000/api/v1/ai/growth-prediction/create-table
```

### 2. 환경 변수
- `DB_HOST`: 데이터베이스 호스트
- `DB_NAME`: 데이터베이스 이름
- `DB_USER`: 데이터베이스 사용자
- `DB_PASSWORD`: 데이터베이스 비밀번호

## 🐛 트러블슈팅

### 1. 테이블이 없는 경우
```bash
# 테이블 생성 API 호출
curl -X POST http://localhost:8000/api/v1/ai/growth-prediction/create-table
```

### 2. 저장된 결과가 조회되지 않는 경우
- application_id가 올바른지 확인
- 데이터베이스 연결 상태 확인
- 로그에서 오류 메시지 확인

### 3. 성능 이슈
- 인덱스가 제대로 생성되었는지 확인
- 데이터베이스 연결 풀 설정 확인

## 📈 향후 개선 사항

1. **배치 처리**: 여러 지원자의 예측을 한 번에 처리
2. **결과 히스토리**: 예측 결과의 버전 관리
3. **통계 분석**: 저장된 결과를 활용한 통계 기능
4. **알림 기능**: 예측 완료 시 알림 기능
5. **API 캐싱**: Redis를 활용한 API 응답 캐싱 