CREATE TABLE company (
    id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    name    VARCHAR(255) NOT NULL UNIQUE,
    address VARCHAR(255) NOT NULL,
    bus_num     VARCHAR(255)
);


CREATE TABLE users (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    phone       VARCHAR(20),
    user_type   VARCHAR(255),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    birth_date  DATE,
    gender      VARCHAR(10),
    address     VARCHAR(255)
);
 

CREATE TABLE resume (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    title       VARCHAR(255) NOT NULL,
    content     TEXT,
    file_url    VARCHAR(255),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
);
 


CREATE TABLE spec (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    resume_id        BIGINT NOT NULL,
    spec_type        VARCHAR(255) NOT NULL,
    spec_title       VARCHAR(255) NOT NULL,
    spec_description TEXT,

    FOREIGN KEY (resume_id) REFERENCES resume(id)
);
 


CREATE TABLE department (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    job_function VARCHAR(255),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    company_id   BIGINT NOT NULL,

    FOREIGN KEY (company_id) REFERENCES company(id)
);
 

CREATE TABLE jobpost (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id     BIGINT,
    department_id  BIGINT,
    user_id        BIGINT,
    title          VARCHAR(255) NOT NULL,
    qualifications TEXT,
    conditions     TEXT,
    job_details    TEXT,
    `procedure`    TEXT,  -- 예약어는 반드시 백틱 사용
    headcount      INT,
    start_date     TIMESTAMP,
    end_date       TIMESTAMP,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id)    REFERENCES company(id),
    FOREIGN KEY (department_id) REFERENCES department(id),
    FOREIGN KEY (user_id)       REFERENCES users(id)
);

 
CREATE TABLE company_user (
    id            BIGINT PRIMARY KEY,
    company_id    BIGINT,
    `rank`        VARCHAR(255),
    joined_at     DATE,              -- 입사일자
    
    FOREIGN KEY (id) REFERENCES users(id),
    FOREIGN KEY (company_id) REFERENCES company(id)
);



CREATE TABLE schedule (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    schedule_type  VARCHAR(255),
    user_id        BIGINT,
    title          VARCHAR(255),
    description    TEXT,
    location       VARCHAR(255),
    scheduled_at   TIMESTAMP,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status         VARCHAR(255),

    FOREIGN KEY (user_id) REFERENCES company_user(id)
);


CREATE TABLE applicant_user (
    id               BIGINT PRIMARY KEY,               -- users 테이블의 ID (직접 참조)

    FOREIGN KEY (id) REFERENCES users(id)
);




CREATE TABLE application (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id            BIGINT NOT NULL,
    resume_id          BIGINT,
    appliedpost_id     BIGINT NOT NULL,
    score              DECIMAL(10,2),
    ai_score           DECIMAL(5,2),
    human_score        DECIMAL(5,2),
    final_score        DECIMAL(5,2),
    status             VARCHAR(20),
    applied_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    application_source VARCHAR(255),
    pass_reason        TEXT,
    fail_reason        TEXT,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resume_id) REFERENCES resume(id),
    FOREIGN KEY (appliedpost_id) REFERENCES jobpost(id),
    CHECK (status IN ('WAITING', 'PASSED', 'REJECTED'))
);
 


CREATE TABLE field_name_score (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_id  BIGINT NOT NULL,
    field_name      VARCHAR(255) NOT NULL,
    score           DECIMAL(10,2),

    FOREIGN KEY (application_id) REFERENCES application(id)
);
 



CREATE TABLE jobpost_role (
    jobpost_id       BIGINT NOT NULL,          -- 공고 ID
    company_user_id  BIGINT NOT NULL,          -- 회사 소속 유저 ID
    role             VARCHAR(30) NOT NULL,     -- 'MANAGER', ‘MEMBER’, ‘EMPLOYEE’ 등
    granted_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (jobpost_id, company_user_id, role),
    FOREIGN KEY (jobpost_id)      REFERENCES jobpost(id)      ON DELETE CASCADE,
    FOREIGN KEY (company_user_id) REFERENCES company_user(id) ON DELETE CASCADE,
    
     -- 필요하면 허용할 역할을 제한
    CHECK (role IN ('MANAGER', 'MEMBER'))
);


CREATE TABLE weight (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    target_type   VARCHAR(255) NOT NULL,
    jobpost_id    BIGINT,
    field_name    VARCHAR(255) NOT NULL,
    weight_value  FLOAT,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (jobpost_id) REFERENCES jobpost(id)
);



CREATE TABLE schedule_interview (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    schedule_id    BIGINT,
    user_id        BIGINT,
    schedule_date  TIMESTAMP,
    status         VARCHAR(255),

    FOREIGN KEY (schedule_id) REFERENCES schedule(id),
    FOREIGN KEY (user_id) REFERENCES company_user(id)
);
 


CREATE TABLE notification (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    message     TEXT,
    user_id     BIGINT,
    type        VARCHAR(255),
    is_read     TINYINT(1) DEFAULT 0 CHECK (is_read IN (0, 1)),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
);



CREATE TABLE resume_memo (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT,
    application_id  BIGINT,
    content         TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES company_user(id),
    FOREIGN KEY (application_id) REFERENCES application(id)
);


CREATE TABLE interview_evaluation (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY, -- 새로 추가된 id 컬럼
    interview_id   BIGINT NOT NULL,        -- schedule_interview.id
    evaluator_id   BIGINT,                 -- company_user.id (NULL이면 AI)
    is_ai          TINYINT(1) DEFAULT 0 CHECK (is_ai IN (0, 1)),
    score          DECIMAL(5,2),
    summary        TEXT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (interview_id) REFERENCES schedule_interview(id),
    FOREIGN KEY (evaluator_id) REFERENCES company_user(id)
);
 



-- 1. 시퀀스 대체: AUTO_INCREMENT 사용
CREATE TABLE evaluation_detail (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    evaluation_id BIGINT NOT NULL,
    category      VARCHAR(100),       -- 예: "인성"
    grade         VARCHAR(10),        -- 예: "상", "중", "하"
    score         DECIMAL(5,2),

FOREIGN KEY (evaluation_id) REFERENCES interview_evaluation(interview_id)

);
 



CREATE TABLE interview_question (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT NOT NULL,
    type           VARCHAR(20),         -- 예: 'COMMON', 'PERSONAL'
    question_text  VARCHAR(1000),

    FOREIGN KEY (application_id) REFERENCES application(id)
);