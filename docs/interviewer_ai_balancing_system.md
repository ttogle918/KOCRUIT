# 면접관 프로필 시스템 (통합)

## 📋 개요

면접관의 개별 특성 분석과 상대적 비교 분석을 통합한 AI 기반 면접관 평가 및 밸런스 편성 시스템입니다.

### 🎯 핵심 목표
- **편향 방지**: 엄격한 면접관과 관대한 면접관을 균형있게 배치
- **전문성 커버**: 기술 중심 면접관과 인성 중심 면접관을 조합
- **상대적 분석**: 같은 면접에서의 상대적 위치 분석
- **데이터 기반**: 과거 평가 패턴을 분석한 객관적 특성 측정

## 🧠 면접관 특성 지표

### 평가 성향 지표
- **엄격도 (Strictness)**: 평균보다 낮은 점수를 주는 정도 (0-100)
- **관대함 (Leniency)**: 평균보다 높은 점수를 주는 정도 (0-100)  
- **일관성 (Consistency)**: 점수 분산이 낮은 정도 (0-100)

### 평가 패턴 지표
- **기술 중심도 (Tech Focus)**: 기술 관련 항목에 높은 점수를 주는 정도 (0-100)
- **인성 중심도 (Personality Focus)**: 인성 관련 항목에 높은 점수를 주는 정도 (0-100)
- **상세도 (Detail Level)**: 메모 길이, 평가 시간 등 (0-100)

### 신뢰도 지표
- **경험치 (Experience)**: 총 면접 횟수 기반 (0-100)
- **정확도 (Accuracy)**: 다른 면접관과의 평가 일치도 (0-100)

### 상대적 위치 지표
- **엄격도 백분위**: 전체 면접관 대비 엄격도 위치
- **일관성 백분위**: 전체 면접관 대비 일관성 위치

## 🗄️ 데이터베이스 구조

### interviewer_profile 테이블 (통합)
```sql
CREATE TABLE interviewer_profile (
    id INT PRIMARY KEY,
    evaluator_id INT,  -- company_user.id 참조
    
    -- 개별 특성 분석 (0-100)
    strictness_score DECIMAL(5,2),
    leniency_score DECIMAL(5,2),
    consistency_score DECIMAL(5,2),
    
    -- 평가 패턴 분석 (0-100)
    tech_focus_score DECIMAL(5,2),
    personality_focus_score DECIMAL(5,2),
    detail_level_score DECIMAL(5,2),
    
    -- 신뢰도 지표 (0-100)
    experience_score DECIMAL(5,2),
    accuracy_score DECIMAL(5,2),
    
    -- 통계 데이터
    total_interviews INT,
    avg_score_given DECIMAL(5,2),
    score_variance DECIMAL(5,2),
    pass_rate DECIMAL(5,2),
    
    -- 평가 세부 통계
    avg_tech_score DECIMAL(5,2),
    avg_personality_score DECIMAL(5,2),
    avg_memo_length DECIMAL(8,2),
    
    -- 상대적 위치 (전체 면접관 대비)
    strictness_percentile DECIMAL(5,2),
    consistency_percentile DECIMAL(5,2),
    
    -- 메타데이터
    last_evaluation_date DATETIME,
    profile_version INT,
    confidence_level DECIMAL(5,2),
    is_active BOOLEAN,
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### interviewer_profile_history 테이블
```sql
CREATE TABLE interviewer_profile_history (
    id INT PRIMARY KEY,
    interviewer_profile_id INT,
    evaluation_id INT,
    
    -- 변경 전후 값 (JSON)
    old_values TEXT,
    new_values TEXT,
    
    -- 변경 정보
    change_type VARCHAR(50),
    change_reason TEXT,
    
    created_at TIMESTAMP
);
```

## ⚙️ 시스템 구성 요소

### 1. InterviewerProfile 모델 (통합)
```python
class InterviewerProfile(Base):
    # 개별 특성과 상대적 분석 통합
    strictness_score = Column(DECIMAL(5,2))
    consistency_score = Column(DECIMAL(5,2))
    # ... 기타 특성들
    
    def calculate_balance_score(self, other_evaluations):
        """다른 면접관들과의 밸런스 점수 계산"""
    
    def is_complementary_to(self, other_evaluation):
        """다른 면접관과 보완적인지 판단"""
    
    def get_characteristic_summary(self):
        """면접관 특성 요약 반환"""
```

### 2. InterviewerProfileService (통합)
```python
class InterviewerProfileService:
    @staticmethod
    def create_evaluation_with_profile(db, interview_id, evaluator_id, total_score, ...):
        """면접 평가 생성과 동시에 면접관 평가 업데이트"""
    
    @staticmethod
    def get_balanced_panel_recommendation(db, available_interviewers, required_count):
        """밸런스 있는 면접 패널 추천"""
    
    @staticmethod
    def analyze_interview_panel_relative(db, interview_id):
        """면접 패널의 상대적 분석"""
    
    @staticmethod
    def get_interviewer_characteristics(db, interviewer_id):
        """면접관 특성 조회"""
```

### 3. 기존 InterviewPanelService 통합
- 기존 랜덤 선택 방식 유지 (호환성)
- AI 추천 옵션 추가 (`use_ai_balance=True`)
- 실패 시 기존 방식으로 폴백

## 🔄 동작 프로세스

### 1. 평가 생성 및 프로필 업데이트
```
면접 평가 완료 → InterviewerEvaluationService.create_evaluation_with_profile()
↓
개별 특성 분석 + 상대적 분석 → 통합 프로필 업데이트 → 히스토리 기록
```

### 2. AI 기반 면접관 선택
```
면접관 배정 요청 → 후보자 풀 조회 → AI 밸런스 분석 → 최적 조합 선택
```

### 3. 상대적 분석
```
같은 면접의 모든 평가 수집 → 면접관별 상대적 엄격도/일관성 계산 → 패널 밸런스 평가
```

### 4. 밸런스 점수 계산
```python
balance_score = (
    max(0, 100 - strictness_variance) * 0.3 +  # 분산 최소화
    (tech_coverage + personality_coverage) * 0.4 +  # 커버리지
    min(total_experience / panel_size, 100) * 0.3  # 경험치
)
```

## 🚀 설치 및 설정

### 1. 데이터베이스 마이그레이션
```bash
# 통합된 면접관 프로필 테이블 생성
mysql -u username -p database_name < initdb/9_create_interviewer_profile_tables.sql
```

### 2. 시스템 테스트
```bash
# 통합 시스템 테스트
cd backend
python -m app.scripts.test_interviewer_profile_system
```

### 3. API 사용법
```python
# 면접 평가 생성 (자동으로 프로필 업데이트)
evaluation = InterviewerProfileService.create_evaluation_with_profile(
    db=db,
    interview_id=123,
    evaluator_id=456,
    total_score=4.2,
    summary="좋은 기술력, 인성도 우수",
    evaluation_items=[
        {'type': '기술역량', 'score': 4.5, 'grade': 'A', 'comment': '우수'},
        {'type': '인성', 'score': 4.0, 'grade': 'B', 'comment': '양호'}
    ]
)

# 면접관 특성 조회
characteristics = InterviewerProfileService.get_interviewer_characteristics(
    db, interviewer_id=456
)

# 밸런스 패널 추천
recommended_ids, balance_score = InterviewerProfileService.get_balanced_panel_recommendation(
    db, available_interviewers=[456, 789, 101], required_count=3
)

# 상대적 분석
analysis = InterviewerProfileService.analyze_interview_panel_relative(db, interview_id=123)
```

## 📊 모니터링 및 분석

### 면접관 특성 조회
```python
# 특정 면접관 특성 조회
characteristics = InterviewerProfileService.get_interviewer_characteristics(
    db, interviewer_id=123
)
print(characteristics['summary'])  # "신뢰도 85% | 엄격한 평가자, 기술 중심"
```

### 상대적 분석 결과
```python
# 면접 패널 상대적 분석
analysis = InterviewerProfileService.analyze_interview_panel_relative(db, interview_id=123)
print(f"면접관 수: {analysis['interviewer_count']}")
print(f"점수 분산: {analysis['score_variance']:.2f}")
print(f"상대적 엄격도: {analysis['relative_strictness']}")
```

### 통계 출력 예시
```
=== 면접관 프로필 통계 ===
총 평가 프로필 수: 15
활성 프로필: 15
평균 면접 횟수: 8.2
평균 신뢰도: 67.3%

엄격도 분포: 엄격 4명, 보통 8명, 관대 3명
일관성 분포: 높음 6명, 보통 7명, 낮음 2명
신뢰도 분포: 높음(80%+) 5명, 보통(50-80%) 7명, 낮음(<50%) 3명
```

## 🔧 고급 설정

### 밸런스 점수 가중치 조정
`InterviewerProfileService._calculate_team_balance_score()` 함수에서:
```python
balance_score = (
    strictness_balance * 0.3 +      # 엄격도 분산 최소화
    coverage_score * 0.3 +          # 전문성 커버리지  
    experience_avg * 0.2 +          # 경험치
    consistency_avg * 0.2           # 일관성
)
```

### 특성 계산 로직 커스터마이징
- 엄격도: `(전체평균 - 개인평균) / 전체평균 * 100`
- 일관성: `(전체분산 - 개인분산) / 전체분산 * 100`
- 신뢰도: `min(100, 면접횟수 / 10 * 100)`

## 🛠️ 유지보수

### 자동 업데이트
- 새로운 면접 평가 생성 시 자동으로 프로필 업데이트
- 히스토리 자동 기록

### 문제 해결
1. **AI 추천 실패**: 자동으로 기존 랜덤 방식으로 폴백
2. **데이터 부족**: 신뢰도가 낮은 경우 기본값 사용
3. **상대적 분석 실패**: 개별 특성 분석만 사용

## 🔄 마이그레이션

### 기존 시스템에서 통합 시스템으로
1. 기존 `interviewer_profile` 테이블 데이터 백업
2. 새로운 `interviewer_profile` 테이블 생성
3. 데이터 마이그레이션 (필요시)
4. 기존 테이블 삭제 (선택사항)

### 호환성
- 기존 `interview_evaluation` 테이블은 그대로 유지
- 새로운 통합 시스템은 기존 데이터를 참조하여 동작
- 점진적 마이그레이션 가능 