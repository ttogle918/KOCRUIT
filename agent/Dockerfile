FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libsndfile1 \
    libportaudio2 \
    portaudio19-dev \
    git \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY agent/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 🆕 모델은 런타임에 로딩 (빌드 타임 다운로드 제거)
# SentenceTransformer와 Transformers 모델 모두 런타임에 안전하게 로딩

# 애플리케이션 코드 복사
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

ENV PYTHONPATH=/app

# 🆕 HuggingFace 캐시 디렉토리 설정
ENV HF_HOME=/app/.cache/huggingface
ENV TRANSFORMERS_CACHE=/app/.cache/huggingface/transformers
ENV HF_DATASETS_CACHE=/app/.cache/huggingface/datasets

# 🆕 모델 다운로드 시 진행률 표시 활성화
ENV HF_HUB_DISABLE_PROGRESS_BARS=false