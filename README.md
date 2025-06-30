# KOSA-FINAL-PROJECT-02

```
myproject/
 ├─ backend/        # Spring Boot
 ├─ frontend/       # React + Vite
 ├─ initdb/         # 초기 DB 데이터(dump.sql 등)
 ├─ docker-compose.yml
 ├─ README.md
```


initdb/ 폴더에 초기 덤프 또는 SQL 파일 넣기

initdb/ 경로는 컨테이너 최초 띄울 때 자동 실행되는 스크립트들이 저장되는 위치예요.

초기 테이블 생성이나 샘플 데이터가 있다면 dump.

sql을 넣어두면 자동 반영됩니다.


---

## 🛠️ 설치 및 실행 방법 (팀원용)

### 1. 환경 사전 준비
- Docker & Docker Compose 설치  
  [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)

### 2. 코드 내려받기
```bash
git clone https://github.com/your-org/kocruit-project.git
cd kocruit-project
```

## 실행 방법

### Docker(container) 실행

```docker-compose up -d``` 
=> 백그라운드에서 실행하기

```docker-compose up --build```
업데이트 포함하여 실행하기

```docker-compose down```
=> container 종료


```docker-compose down -v --remove-orphans```
=> 컨테이너 정리

#### docker의 mysql에 접속하기

```docker exec -it mysql8 mysql -umyuser -p1234```

#### backend 에러 코드 보기

```docker-compose logs backend```

### 프론트엔드

처음 복제 했을 때, package.json 또는 package-lock.json이 수정 됐을 때
```bash
cd frontend
npm install
```

실행
```bash
npm run dev
```

→ 브라우저에서 `http://localhost:5173` 접속


- webApp으로 만들기

```
npm install vite-plugin-pwa --save-dev
npm install dayjs
```

### 백엔드

recruit 디렉토리에 들어온 다음

```
./gradlew bootRun  # 또는
mvn spring-boot:run
```

# Agent 폴더 초기 세팅법
# 파이썬 3.11.9 추천 (3.13)

## 현재 디렉토리에서 가상환경 생성
python3 -m venv .venv

## 가상환경 활성화 (Windows)
.venv\Scripts\activate

## macOS/Linux 사용자는:
source .venv/bin/activate

## 의존성 설치
pip install -r requirements.txt

## .env 파일 추가 & 설정
OPENAI_API_KEY=sk-...

## 서버 실행
uvicorn main:app --reload --port 8001
