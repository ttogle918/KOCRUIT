# Repository


### JobPostRepository

| 메서드                                               | 설명                                        |
| ------------------------------------------------- | ----------------------------------------- |
| `findByCompanyIdOrderByEndDateAsc`                | 기업별 공고 마감일순 정렬 – O                        |
| `findActiveJobPosts`                              | 마감일이 현재 이후인 공고 – JPQL, DTO projection – O |
| `findAllWithPaging(Pageable)`                     | 공고 전체 페이징 – JPQL – O                      |
| `searchJobPosts`                                  | 제목/자격요건 등 조건 검색 – JPQL, LIKE – O          |
| `findByCompanyId`, `findByTitle`, `findByEndDate` | 기본적인 조건 검색 – 메서드 기반 – O                   |


### NotificationRepository

| 메서드                                  | 쿼리 방식                       | 개선 필요 여부 |
| ------------------------------------ | --------------------------- | -------- |
| `findByReceiverOrderByCreatedAtDesc` | JPQL (`ORDER BY createdAt`) | ✅ 괜찮음    |
| `findByUserAndIsReadFalse`           | JPQL (`isRead = false`)     | ✅ 괜찮음    |
| `deleteByUser`                       | 파생 쿼리 메서드                   | ✅ 좋음     |


### ResumeRepository

| 기능             | 설명                                       | 상태                  |
| -------------- | ---------------------------------------- | ------------------- |
| 기업별 이력서 조회     | `JOIN Application a JOIN a.resume r`     | ✅ OK                |
| 키워드 검색         | `LIKE LOWER(CONCAT('%', :keyword, '%'))` | ✅ OK, MySQL에서 문제 없음 |
| 기업+이력서ID 조회    | `Optional<Resume>` 반환                    | ✅ OK                |
| 지원자 ID로 이력서 조회 | `findByUserId`                           | ✅ OK                |
| 지원자 키워드 검색     | `findByUserIdAndTitleContaining`         | ✅ OK                |

### UserRepository

| 메서드             | 설명       | 상태                        |
| --------------- | -------- | ------------------------- |
| `findByEmail`   | 이메일로 조회  | ✅ OK                      |
| `existsByEmail` | 중복 여부 확인 | ✅ OK, `SELECT CASE` 잘 처리됨 |






