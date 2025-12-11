FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지 업데이트 및 필요한 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libsndfile1 \
    libportaudio2 \
    portaudio19-dev \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
# docker-compose context가 root(.)이므로, agent/requirements.txt 경로 사용
COPY agent/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
# context root의 agent 폴더 내용을 컨테이너의 /app/agent로 복사
COPY agent/ /app/agent/

# 포트 노출
EXPOSE 8001

# PYTHONPATH 설정 (agent 모듈 인식 위함)
ENV PYTHONPATH=/app

# 애플리케이션 실행
# agent 패키지 내의 main 모듈 실행
CMD ["uvicorn", "agent.main:app", "--host", "0.0.0.0", "--port", "8001"]
