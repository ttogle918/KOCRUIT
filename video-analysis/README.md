# Video Analysis Service

## 🎬 개요
TensorFlow 기반 영상 분석 서비스로, DeepFace, MediaPipe, Whisper를 활용한 종합적인 면접 영상 분석을 제공합니다.

## 🏗️ 아키텍처

### 기술 스택
- **Framework**: TensorFlow 2.15.0
- **Computer Vision**: OpenCV, MediaPipe, DeepFace
- **Audio Processing**: Whisper, Librosa
- **API**: FastAPI
- **Container**: Docker

### 서비스 분리 이유
- **PyTorch 충돌 방지**: Backend/Agent 서비스와 완전 분리
- **성능 최적화**: TensorFlow 전용 환경으로 최적화
- **확장성**: 영상 분석만 독립적으로 확장 가능

## 🚀 실행 방법

### Docker Compose로 실행
```bash
# 전체 서비스 실행
docker-compose up -d

# Video Analysis 서비스만 실행
docker-compose up video-analysis -d
```

### 독립 실행
```bash
# 컨테이너 빌드
docker build -f video-analysis/Dockerfile -t kocruit-video-analysis .

# 컨테이너 실행
docker run -p 8002:8002 kocruit-video-analysis
```

## 📡 API 엔드포인트

### 기본 엔드포인트
- `GET /`: 서비스 상태 확인
- `GET /health`: 헬스체크
- `GET /models/status`: 모델 로딩 상태 확인

### 분석 엔드포인트
- `POST /analyze-video`: 영상 분석 (업로드)

## 🔧 설정

### 환경 변수
```env
# 데이터베이스
DB_HOST=kocruit-02.c5k2wi2q8g80.us-east-2.rds.amazonaws.com
DB_PORT=3306
DB_NAME=kocruit
DB_USER=admin
DB_PASSWORD=kocruit1234!

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# TensorFlow
TF_CPP_MIN_LOG_LEVEL=2
```

### 포트
- **서비스 포트**: 8002
- **내부 포트**: 8002

## 📊 분석 기능

### 1. 표정 분석 (DeepFace)
- 감정 상태 분석
- 표정 변화 추적
- 신뢰도 점수

### 2. 자세/시선 분석 (MediaPipe)
- 자세 변화 감지
- 시선 추적
- 제스처 인식

### 3. 음성 분석 (Whisper)
- 실시간 음성 인식
- 화자 분리
- 음성 품질 평가

## 🔍 모니터링

### 헬스체크
```bash
curl http://localhost:8002/health
```

### 모델 상태 확인
```bash
curl http://localhost:8002/models/status
```

## 🐛 문제 해결

### 일반적인 문제
1. **메모리 부족**: TensorFlow 모델 로딩 시 메모리 요구량 높음
2. **GPU 지원**: CUDA 환경에서 GPU 가속 가능
3. **모델 다운로드**: 첫 실행 시 모델 다운로드 필요

### 로그 확인
```bash
docker logs kocruit_video_analysis
```

## 📈 성능 최적화

### 권장 사양
- **CPU**: 4코어 이상
- **RAM**: 8GB 이상
- **GPU**: CUDA 지원 GPU (선택사항)

### 최적화 팁
1. **배치 처리**: 여러 영상 동시 처리
2. **모델 캐싱**: 모델 재사용으로 로딩 시간 단축
3. **메모리 관리**: 불필요한 모델 언로딩

## 🔗 연관 서비스

- **Backend**: PyTorch 기반 메인 서비스 (포트 8000)
- **Agent**: PyTorch 기반 AI 에이전트 (포트 8001)
- **Frontend**: React 기반 웹 인터페이스 (포트 5173)
- **Redis**: 캐시 및 세션 관리 (포트 6379) 