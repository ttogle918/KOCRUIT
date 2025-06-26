# KOSA-FINAL-PROJECT-02

myproject/
 ├─ backend/        # Spring Boot
 ├─ frontend/       # React + Vite
 ├─ initdb/         # 초기 DB 데이터(dump.sql 등)
 ├─ docker-compose.yml
 ├─ README.md



initdb/ 폴더에 초기 덤프 또는 SQL 파일 넣기

initdb/ 경로는 컨테이너 최초 띄울 때 자동 실행되는 스크립트들이 저장되는 위치예요.

초기 테이블 생성이나 샘플 데이터가 있다면 dump.

sql을 넣어두면 자동 반영됩니다.