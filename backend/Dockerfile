# Python 3.11.9 기반 이미지
FROM python:3.11.9-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 설치 (빌드 필수 의존성)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    build-essential \
    default-libmysqlclient-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# requirements.txt 복사 후 설치
COPY ../requirements.txt ./requirements.txt

# 패키지 설치
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 앱 코드 복사
COPY backend/app ./app
COPY agent ./agent

# FastAPI 실행 (UVicorn)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

ENV PYTHONPATH=/app