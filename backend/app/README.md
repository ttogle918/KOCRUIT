# Backend API

## SQLAlchemy 관계 최적화 가이드

### 1. 관계 정의 완료 상태

모든 주요 모델 간의 관계가 `back_populates`를 사용하여 양방향으로 정의되었습니다:

#### Application ↔ User, Resume
```python
# Application 모델
user = relationship("User", back_populates="applications")
resume = relationship("Resume", back_populates="applications")

# User 모델  
applications = relationship("Application", back_populates="user")
resumes = relationship("Resume", back_populates="user")

# Resume 모델
user = relationship("User", back_populates="resumes")
applications = relationship("Application", back_populates="resume")
specs = relationship("Spec", back_populates="resume")
```

#### JobPost ↔ Company, Department, User
```python
# JobPost 모델
company = relationship("Company", back_populates="job_posts")
department_rel = relationship("Department", back_populates="job_posts")
user = relationship("User", back_populates="job_posts")
applications = relationship("Application", back_populates="job_post")
```

### 2. N+1 문제 해결을 위한 최적화 쿼리

#### 지원자 목록 조회 (최적화 전)
```python
# N+1 문제 발생
applications = db.query(Application).filter(Application.job_post_id == job_post_id).all()
for app in applications:
    user = db.query(User).filter(User.id == app.user_id).first()  # 추가 쿼리
    resume = db.query(Resume).filter(Resume.id == app.resume_id).first()  # 추가 쿼리
    specs = db.query(Spec).filter(Spec.resume_id == app.resume_id).all()  # 추가 쿼리
```

#### 지원자 목록 조회 (최적화 후)
```python
# joinedload로 한 번에 모든 관계 데이터 조회
applications = (
    db.query(Application)
    .options(
        joinedload(Application.user),
        joinedload(Application.resume).joinedload(Resume.specs)
    )
    .filter(Application.job_post_id == job_post_id)
    .all()
)

# 추가 쿼리 없이 관계 데이터 접근 가능
for app in applications:
    user_name = app.user.name  # 이미 로드됨
    resume_content = app.resume.content  # 이미 로드됨
    specs = app.resume.specs  # 이미 로드됨
```

#### 지원서 상세 조회 (최적화 후)
```python
application = (
    db.query(Application)
    .options(
        joinedload(Application.user),
        joinedload(Application.resume).joinedload(Resume.specs)
    )
    .filter(Application.id == application_id)
    .first()
)
```

### 3. 성능 개선 효과

- **N+1 문제 해결**: 지원자 100명 조회 시 쿼리 수가 1개에서 301개로 증가하는 문제를 1개로 유지
- **응답 시간 단축**: 대량 데이터 조회 시 timeout 문제 해결
- **메모리 효율성**: 필요한 데이터만 정확히 로드

### 4. 추가 최적화 옵션

#### selectinload (1:N 관계에 적합)
```python
# Resume의 specs를 별도 쿼리로 로드 (메모리 효율적)
applications = (
    db.query(Application)
    .options(
        joinedload(Application.user),
        selectinload(Application.resume).selectinload(Resume.specs)
    )
    .all()
)
```

#### subqueryload (복잡한 중첩 관계)
```python
# 복잡한 중첩 관계에서 사용
applications = (
    db.query(Application)
    .options(
        subqueryload(Application.resume).subqueryload(Resume.specs)
    )
    .all()
)
```

### 5. 사용 시 주의사항

1. **관계 정의 확인**: `back_populates`가 양쪽에 올바르게 정의되어 있는지 확인
2. **순환 참조 방지**: 복잡한 관계에서 순환 참조가 발생하지 않도록 주의
3. **메모리 사용량**: joinedload는 모든 데이터를 메모리에 로드하므로 대용량 데이터 시 주의
4. **쿼리 복잡성**: 너무 많은 join은 성능을 저하시킬 수 있음

### 6. 테스트 방법

```python
# 쿼리 실행 시간 측정
import time

start_time = time.time()
applications = (
    db.query(Application)
    .options(
        joinedload(Application.user),
        joinedload(Application.resume).joinedload(Resume.specs)
    )
    .filter(Application.job_post_id == job_post_id)
    .all()
)
end_time = time.time()

print(f"쿼리 실행 시간: {end_time - start_time:.2f}초")
print(f"지원자 수: {len(applications)}")
``` 