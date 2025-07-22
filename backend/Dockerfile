# Python 3.11.9 기반 이미지
FROM python:3.11.9-slim

# 작업 디렉토리 설정
WORKDIR /app

# === 1) 시스템 패키지 설치 (빌드 필수 의존성)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpango1.0-0 \
    libcairo2 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    libxml2 \
    libpangocairo-1.0-0 \
    fonts-noto-cjk \
    libgirepository1.0-dev \
    gir1.2-pango-1.0 \
    python3-gi \
    && rm -rf /var/lib/apt/lists/*

# === 2) requirements.txt 복사
COPY requirements.txt .

# === 3) 대용량 라이브러리(PyTorch 계열) 먼저 설치 (캐싱 효과 최대화)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
        torch==2.2.0 \
        torchvision==0.17.0 \
        torchaudio==2.2.0

# === 4) 나머지 패키지 설치
RUN pip install --no-cache-dir -r requirements.txt

# === 5) 앱 코드 복사
COPY backend/app ./app
COPY agent ./agent
COPY initdb ./initdb

# === 6) FastAPI 실행 (Uvicorn)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# === 7) PYTHONPATH 설정
ENV PYTHONPATH=/app
