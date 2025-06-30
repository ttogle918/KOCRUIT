
# 📘 프로젝트 개발 명명 규칙 및 설계 원칙

---

## 패키지 구조

```
com.kosa.[프로젝트명].[모듈명].[클래스 성격]
```

### 예시:
- `com.kosa.recruit.board.controller`
- `com.kosa.recruit.jobpost.service`
- `com.kosa.recruit.company.repository`

---

## 클래스 명명 규칙

| 구분         | 명명 규칙                     | 예시                          |
|--------------|-------------------------------|-------------------------------|
| 도메인       | [모듈명].java                  | `Board.java`                 |
| 컨트롤러     | [모듈명]Controller.java        | `BoardController.java`       |
| 서비스       | [모듈명]Service.java           | `BoardService.java`          |
| DTO          | [모듈명]DTO.java               | `BoardDTO.java`              |
| 핸들러       | [모듈명]Handler.java           | `MessengerHandler.java`      |
| 레포지토리   | [모듈명]Repository.java        | `BoardRepository.java`       |



---

## REST API URL 및 HTTP 메서드 설계

### 모듈 단위 매핑

```java
@RequestMapping("/[모듈명]/*")
```

### URL 및 METHOD 규칙

| 기능       | URL 예시              | METHOD      |
|------------|------------------------|-------------|
| 페이지 이동 | `/board`              | GET         |
| 목록 조회   | `/board/list`         | GET         |
| 상세 조회   | `/board/{id}`         | GET         |
| 등록       | `/board`              | POST        |
| 수정       | `/board/{id}`         | PUT/PATCH   |
| 삭제       | `/board/{id}`         | DELETE      |

>  **URL은 계층적으로**, **기능은 전송 방식으로 구분**한다.

---

##  서비스 메서드 명명 규칙

| 기능         | 메서드 명                | 예시                    |
|--------------|---------------------------|-------------------------|
| 전체 조회    | `get[도메인]List()`       | `getJobpostList()`     |
| 단건 조회    | `get[도메인]()`           | `getJobpost()`         |
| 검색 조회    | `get[도메인]by[속성]()`           | `getJobpostbyName()`         |
| 등록         | `create[도메인]()`        | `createJobpost()`      |
| 수정         | `update[도메인]()`        | `updateJobpost()`      |
| 삭제         | `delete[도메인]()`        | `deleteJobpost()`      |

---

## 프론트엔드 파일 명명 규칙

( 추가 예정 )

---

## 요약

- **패키지 구조**는 `프로젝트명.모듈명.역할` 구조로 통일
- **클래스/인터페이스 명명**은 역할 기반으로 일관성 유지
- **서비스 메서드 명**은 `기능 + 도메인` 중심의 카멜 표기법 사용
- **URL 설계**는 RESTful 방식 준수 (자원 중심)
- **프론트엔드 파일명**도 일관된 패턴으로 JSX/JS 구분
