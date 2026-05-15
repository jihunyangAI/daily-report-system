# 영업 일일보고 시스템 DDL

| 항목 | 내용 |
|---|---|
| 문서명 | 영업 일일보고 시스템 DDL |
| 버전 | v1.0 |
| 작성일 | 2026-05-14 |
| DB | MySQL 8.0+ / utf8mb4 / InnoDB |

---

## 테이블 목록

| 테이블명 | 설명 |
|---|---|
| `salesperson` | 영업사원 마스터 |
| `customer` | 고객 마스터 |
| `daily_report` | 일일보고 헤더 |
| `visit_record` | 방문기록 |
| `problem` | 과제/상담 항목 |
| `plan` | 익일계획 항목 |
| `comment` | 댓글 |

---

## DDL

```sql
-- ============================================================
-- 영업 일일보고 시스템 DDL
-- MySQL 8.0+  |  utf8mb4  |  InnoDB
-- ============================================================

-- ------------------------------------------------------------
-- 1. SALESPERSON (영업사원 마스터)
-- ------------------------------------------------------------
CREATE TABLE salesperson (
    salesperson_id  INT              NOT NULL AUTO_INCREMENT,
    name            VARCHAR(50)      NOT NULL            COMMENT '사원명',
    department      VARCHAR(100)     NOT NULL            COMMENT '부서',
    rank            VARCHAR(50)      NOT NULL            COMMENT '직급',
    manager_id      INT              NULL                COMMENT '상급자 ID (자기참조)',
    email           VARCHAR(200)     NOT NULL            COMMENT '이메일(로그인 ID)',
    password_hash   VARCHAR(255)     NOT NULL            COMMENT '비밀번호 해시',
    hire_date       DATE             NOT NULL            COMMENT '입사일',
    is_active       TINYINT(1)       NOT NULL DEFAULT 1  COMMENT '재직여부(1:재직, 0:퇴직)',
    created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                              ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_salesperson        PRIMARY KEY (salesperson_id),
    CONSTRAINT uq_salesperson_email  UNIQUE      (email),
    CONSTRAINT fk_salesperson_manager
        FOREIGN KEY (manager_id) REFERENCES salesperson (salesperson_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='영업사원 마스터';


-- ------------------------------------------------------------
-- 2. CUSTOMER (고객 마스터)
-- ------------------------------------------------------------
CREATE TABLE customer (
    customer_id     INT              NOT NULL AUTO_INCREMENT,
    company_name    VARCHAR(200)     NOT NULL            COMMENT '회사명',
    contact_name    VARCHAR(100)     NOT NULL            COMMENT '담당자명',
    phone           VARCHAR(20)      NULL                COMMENT '연락처',
    email           VARCHAR(200)     NULL                COMMENT '이메일',
    address         VARCHAR(500)     NULL                COMMENT '주소',
    industry        VARCHAR(100)     NULL                COMMENT '업종',
    memo            TEXT             NULL                COMMENT '메모',
    is_active       TINYINT(1)       NOT NULL DEFAULT 1  COMMENT '활성여부',
    created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                              ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_customer PRIMARY KEY (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='고객 마스터';


-- ------------------------------------------------------------
-- 3. DAILY_REPORT (일일보고 헤더)
-- ------------------------------------------------------------
CREATE TABLE daily_report (
    report_id       INT              NOT NULL AUTO_INCREMENT,
    salesperson_id  INT              NOT NULL            COMMENT '작성 사원 ID',
    report_date     DATE             NOT NULL            COMMENT '보고 일자',
    status          VARCHAR(20)      NOT NULL DEFAULT 'DRAFT'
                                                        COMMENT '상태: DRAFT|SUBMITTED|CONFIRMED',
    submitted_at    DATETIME         NULL                COMMENT '제출일시',
    confirmed_at    DATETIME         NULL                COMMENT '확인일시',
    created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                              ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_daily_report              PRIMARY KEY  (report_id),
    CONSTRAINT uq_daily_report_person_date  UNIQUE       (salesperson_id, report_date),
    CONSTRAINT chk_daily_report_status      CHECK        (status IN ('DRAFT','SUBMITTED','CONFIRMED')),
    CONSTRAINT fk_daily_report_salesperson
        FOREIGN KEY (salesperson_id) REFERENCES salesperson (salesperson_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='일일보고 헤더';


-- ------------------------------------------------------------
-- 4. VISIT_RECORD (방문기록)
-- ------------------------------------------------------------
CREATE TABLE visit_record (
    visit_id        INT              NOT NULL AUTO_INCREMENT,
    report_id       INT              NOT NULL            COMMENT '일일보고 ID',
    customer_id     INT              NOT NULL            COMMENT '방문 고객 ID',
    visit_time      TIME             NULL                COMMENT '방문 시각',
    visit_purpose   VARCHAR(500)     NULL                COMMENT '방문 목적',
    visit_content   TEXT             NULL                COMMENT '방문 내용',
    next_visit_date DATE             NULL                COMMENT '차기 방문 예정일',

    CONSTRAINT pk_visit_record PRIMARY KEY (visit_id),
    CONSTRAINT fk_visit_record_report
        FOREIGN KEY (report_id)    REFERENCES daily_report (report_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_visit_record_customer
        FOREIGN KEY (customer_id)  REFERENCES customer (customer_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='방문기록';


-- ------------------------------------------------------------
-- 5. PROBLEM (과제/상담 항목)
-- ------------------------------------------------------------
CREATE TABLE problem (
    problem_id      INT              NOT NULL AUTO_INCREMENT,
    report_id       INT              NOT NULL            COMMENT '일일보고 ID',
    seq             SMALLINT         NOT NULL DEFAULT 1  COMMENT '표시 순서',
    content         TEXT             NOT NULL            COMMENT '과제/상담 내용',
    created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_problem PRIMARY KEY (problem_id),
    CONSTRAINT fk_problem_report
        FOREIGN KEY (report_id) REFERENCES daily_report (report_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='과제/상담 항목';


-- ------------------------------------------------------------
-- 6. PLAN (익일계획 항목)
-- ------------------------------------------------------------
CREATE TABLE plan (
    plan_id         INT              NOT NULL AUTO_INCREMENT,
    report_id       INT              NOT NULL            COMMENT '일일보고 ID',
    seq             SMALLINT         NOT NULL DEFAULT 1  COMMENT '표시 순서',
    content         TEXT             NOT NULL            COMMENT '익일 계획 내용',
    created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_plan PRIMARY KEY (plan_id),
    CONSTRAINT fk_plan_report
        FOREIGN KEY (report_id) REFERENCES daily_report (report_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='익일계획 항목';


-- ------------------------------------------------------------
-- 7. COMMENT (댓글)
--    ref_type + ref_id 로 PROBLEM / PLAN 을 다형적으로 참조
--    FK는 ref_type 값에 따라 앱 레벨에서 무결성 보장
-- ------------------------------------------------------------
CREATE TABLE comment (
    comment_id      INT              NOT NULL AUTO_INCREMENT,
    ref_type        VARCHAR(10)      NOT NULL            COMMENT '참조 유형: PROBLEM|PLAN',
    ref_id          INT              NOT NULL            COMMENT 'problem_id 또는 plan_id',
    author_id       INT              NOT NULL            COMMENT '작성자(상급자) ID',
    content         TEXT             NOT NULL            COMMENT '댓글 내용',
    created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                              ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_comment           PRIMARY KEY (comment_id),
    CONSTRAINT chk_comment_ref_type CHECK       (ref_type IN ('PROBLEM','PLAN')),
    CONSTRAINT fk_comment_author
        FOREIGN KEY (author_id) REFERENCES salesperson (salesperson_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='댓글';


-- ============================================================
-- 인덱스
-- ============================================================
-- daily_report: 날짜 조회, 상태 조회
CREATE INDEX idx_daily_report_date        ON daily_report  (report_date);
CREATE INDEX idx_daily_report_status      ON daily_report  (status);

-- visit_record: 보고서별, 고객별 조회
CREATE INDEX idx_visit_record_report      ON visit_record  (report_id);
CREATE INDEX idx_visit_record_customer    ON visit_record  (customer_id);

-- problem / plan: 보고서별 조회
CREATE INDEX idx_problem_report           ON problem       (report_id);
CREATE INDEX idx_plan_report              ON plan          (report_id);

-- comment: 참조 대상 조회, 작성자 조회
CREATE INDEX idx_comment_ref              ON comment       (ref_type, ref_id);
CREATE INDEX idx_comment_author           ON comment       (author_id);
```

---

## 주요 설계 포인트

| 항목 | 내용 |
|---|---|
| **1사원 1일 1보고** | `daily_report(salesperson_id, report_date)` UNIQUE 제약 |
| **보고 삭제 시 하위 데이터** | `visit_record`, `problem`, `plan` 모두 `ON DELETE CASCADE` |
| **상급자 자기참조** | `salesperson.manager_id → salesperson.salesperson_id` |
| **다형성 댓글** | `comment.ref_type + ref_id`로 PROBLEM·PLAN 공용 참조, DB FK 대신 앱 레벨 무결성 |
| **상태 제어** | `DRAFT → SUBMITTED → CONFIRMED` CHECK 제약으로 값 제한 |

> **CHECK 제약** — MySQL 8.0.16 이상에서 실제 강제됩니다. 구버전 사용 시 앱 레벨 검증이 필요합니다.
