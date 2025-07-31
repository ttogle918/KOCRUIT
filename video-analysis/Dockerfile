# === Video Analysis Service (TensorFlow 기반) ===
FROM python:3.11-slim

WORKDIR /app

# === 1) 시스템 패키지 설치 (Computer Vision 필수 의존성) ===
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libglib2.0-dev \
    libgtk-3-0 \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libv4l-dev \
    libxvidcore-dev \
    libx264-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libatlas-base-dev \
    gfortran \
    wget \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# === 2) FFmpeg 설치 ===
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# === 3) TensorFlow CPU 전용 설치 (캐싱 효과 최대화) ===
COPY video-analysis/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir tensorflow-cpu==2.15.0

# === 4) 나머지 패키지 설치 (최소화) ===
RUN pip install --no-cache-dir -r requirements.txt && \
    pip cache purge

# === 5) 애플리케이션 코드 복사 ===
COPY video-analysis/ .

# === 6) 포트 노출 ===
EXPOSE 8002

# === 7) 환경 변수 설정 (메모리 최적화) ===
ENV PYTHONPATH=/app
ENV TF_CPP_MIN_LOG_LEVEL=2
ENV TF_FORCE_GPU_ALLOW_GROWTH=true
ENV TF_MEMORY_ALLOCATION=0.5

# === 8) 애플리케이션 실행 ===
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"] 