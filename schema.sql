-- 1. Company
CREATE TABLE Company (
    id       NUMBER(19) PRIMARY KEY,
    name     VARCHAR2(255) NOT NULL,
    address  VARCHAR2(255)
);

-- 2. users
CREATE TABLE users (
    id         NUMBER(19) PRIMARY KEY,
    company_id NUMBER(19),
    name       VARCHAR2(255) NOT NULL,
    email      VARCHAR2(255) NOT NULL UNIQUE,
   	birth_date DATE,
    password   VARCHAR2(255) NOT NULL,
    role       VARCHAR2(50) DEFAULT 'user',
    user_type  VARCHAR2(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_company FOREIGN KEY (company_id) REFERENCES Company(id)
);

-- 3. resume
CREATE TABLE resume (
    id         NUMBER(19) PRIMARY KEY,
    user_id    NUMBER(19) NOT NULL UNIQUE,
    title      VARCHAR2(255),
    content    VARCHAR2(4000),
    file_url   VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_resume_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. JobPost 테이블 수정
CREATE TABLE JobPost (
    id              NUMBER(19) PRIMARY KEY,
    company_id      NUMBER(19) NOT NULL,
    title           VARCHAR2(255) NOT NULL,
    qualifications  VARCHAR2(4000),  -- 지원자격 (경력, 학력, 스킬, 우대사항 등)
    conditions      VARCHAR2(4000),  -- 근무조건 (고용형태, 급여, 지역, 시간, 직책 등)
    job_details     VARCHAR2(4000),  -- 모집분야 및 자격요건 상세
    procedure       VARCHAR2(4000),  -- 전형절차
    headcount       NUMBER(3),       -- 모집 인원
    start_date      TIMESTAMP,       -- 공고 시작일
    end_date        TIMESTAMP,       -- 공고 종료일
    user_id         NUMBER(19),      -- 작성자 ID
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_jobpost_company FOREIGN KEY (company_id) REFERENCES Company(id),
    CONSTRAINT fk_jobpost_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 5. schedule
CREATE TABLE schedule (
    id             NUMBER(19) PRIMARY KEY,
    schedule_type  VARCHAR2(50),
    user_id        NUMBER(19) NOT NULL,
    title          VARCHAR2(255),
    description    VARCHAR2(4000),
    location       VARCHAR2(255),
    scheduled_at   DATE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status         VARCHAR2(50),

    CONSTRAINT fk_schedule_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT chk_schedule_status CHECK (status IN ('done', 'doing', 'todo'))
);

-- 6. application
CREATE TABLE application (
    id              NUMBER(19) PRIMARY KEY,
    user_id         NUMBER(19) NOT NULL,
    appliedPost_id  NUMBER(19) NOT NULL,
    resume_id       NUMBER(19) NOT NULL,
    score           NUMBER(5, 2),
    status          VARCHAR2(50) DEFAULT 'PENDING',
    application_source VARCHAR2(4000),
    is_bookmarked CHAR(1), -- 'Y' or 'N' 으로 관리
    applied_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_application_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_application_post FOREIGN KEY (appliedPost_id) REFERENCES JobPost(id),
    CONSTRAINT fk_application_resume FOREIGN KEY (resume_id) REFERENCES resume(id),
    CONSTRAINT chk_application_status CHECK (status IN ('PENDING', 'PASSED', 'REJECTED')),
    CONSTRAINT uq_apply_post UNIQUE (user_id, appliedPost_id)
);

-- 7. field_name_score
CREATE TABLE field_name_score (
    id             NUMBER(19) PRIMARY KEY,
    application_id NUMBER(19) NOT NULL,
    field_name     VARCHAR2(255) NOT NULL,
    score          NUMBER(5,2),

    CONSTRAINT fk_field_name_application FOREIGN KEY (application_id) REFERENCES application(id)
);

-- 8. Job
CREATE TABLE Job (
    jobpost_id NUMBER(19),
    user_id    NUMBER(19),
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_jobpost_user_invite PRIMARY KEY (jobpost_id, user_id),
    CONSTRAINT fk_invite_jobpost FOREIGN KEY (jobpost_id) REFERENCES JobPost(id),
    CONSTRAINT fk_invite_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 9. Weight
CREATE TABLE Weight (
    id           NUMBER(19) PRIMARY KEY,
    jobpost_id   NUMBER(19),
    target_type  VARCHAR2(50) NOT NULL,
    field_name   VARCHAR2(255) NOT NULL,
    weight_value FLOAT,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_target_type CHECK (target_type IN ('resume', 'interview')),
    CONSTRAINT fk_weight_jobpost FOREIGN KEY(jobpost_id) REFERENCES JobPost(id)
);

-- 10. schedule_interview
CREATE TABLE schedule_interview (
    id            NUMBER(19) PRIMARY KEY,
    schedule_id   NUMBER(19),
    user_id       NUMBER(19) NOT NULL,
    schedule_date DATE,
    status        VARCHAR2(50),

    CONSTRAINT fk_schedule_interview_schedule FOREIGN KEY (schedule_id) REFERENCES schedule(id),
    CONSTRAINT fk_schedule_interview_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT chk_schedule_interview CHECK (status IN ('proposed', 'accepted', 'rejected'))
);

-- 11. notification
CREATE TABLE notification (
    id         NUMBER(19) PRIMARY KEY,
    message    VARCHAR2(4000),
    user_id    NUMBER(19),
    type       VARCHAR2(50),
    is_read    NUMBER(1), -- BOOLEAN 대신 NUMBER(1)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 12. resume_memo
CREATE TABLE resume_memo (
    id         NUMBER(19) PRIMARY KEY,
    user_id    NUMBER(19),
    resume_id  NUMBER(19),
    content    VARCHAR2(4000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_resume_memo_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_resume_memo_resume FOREIGN KEY (resume_id) REFERENCES resume(id)
);
