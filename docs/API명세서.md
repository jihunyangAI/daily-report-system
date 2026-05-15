# 영업 일일보고 시스템 API 명세서

| 항목 | 내용 |
|---|---|
| 문서명 | 영업 일일보고 시스템 API 명세서 |
| 버전 | v1.0 |
| 작성일 | 2026-05-14 |
| Base URL | `https://{host}/api` |

---

## 목차

1. [공통 규격](#1-공통-규격)
2. [인증 Auth](#2-인증-auth)
3. [영업사원 Salesperson](#3-영업사원-salesperson)
4. [고객 Customer](#4-고객-customer)
5. [일일보고 Daily Report](#5-일일보고-daily-report)
6. [방문기록 Visit Record](#6-방문기록-visit-record)
7. [과제/상담 Problem](#7-과제상담-problem)
8. [익일계획 Plan](#8-익일계획-plan)
9. [댓글 Comment](#9-댓글-comment)
10. [에러 코드](#10-에러-코드)

---

## 1. 공통 규격

### 1.1 인증

모든 API (`/auth/login` 제외)는 HTTP 헤더에 JWT 토큰을 포함해야 합니다.

```
Authorization: Bearer {access_token}
```

### 1.2 공통 응답 형식

**성공**
```json
{
  "success": true,
  "data": { ... }
}
```

**실패**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  }
}
```

**페이징이 있는 목록 응답**
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "size": 20,
      "totalCount": 100,
      "totalPages": 5
    }
  }
}
```

### 1.3 공통 쿼리 파라미터 (목록 API)

| 파라미터 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| page | integer | 1 | 페이지 번호 |
| size | integer | 20 | 페이지 크기 (최대 100) |

### 1.4 날짜/시간 형식

| 타입 | 형식 | 예시 |
|---|---|---|
| date | `YYYY-MM-DD` | `2026-05-14` |
| time | `HH:MM` | `14:30` |
| datetime | `YYYY-MM-DDTHH:mm:ss` | `2026-05-14T14:30:00` |

### 1.5 HTTP 상태 코드

| 코드 | 의미 |
|---|---|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 (유효성 오류) |
| 401 | 인증 실패 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 충돌 (중복 등) |
| 500 | 서버 오류 |

---

## 2. 인증 Auth

### 2.1 로그인

```
POST /auth/login
```

**Request Body**

```json
{
  "email": "hong@company.com",
  "password": "password123"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| email | string | Y | 이메일 |
| password | string | Y | 비밀번호 |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 28800,
    "salesperson": {
      "salespersonId": 1,
      "name": "홍길동",
      "department": "영업1팀",
      "rank": "대리",
      "isManager": false
    }
  }
}
```

**Response `401`**

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "이메일 또는 비밀번호가 올바르지 않습니다"
  }
}
```

---

### 2.2 로그아웃

```
POST /auth/logout
```

**Response `200`**

```json
{
  "success": true,
  "data": null
}
```

---

### 2.3 내 정보 조회

```
GET /auth/me
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "salespersonId": 1,
    "name": "홍길동",
    "email": "hong@company.com",
    "department": "영업1팀",
    "rank": "대리",
    "manager": {
      "salespersonId": 5,
      "name": "박팀장"
    },
    "isManager": false,
    "hireDate": "2023-03-02"
  }
}
```

---

## 3. 영업사원 Salesperson

### 3.1 목록 조회

```
GET /salespersons
```

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| keyword | string | N | 사원명 검색 |
| department | string | N | 부서 필터 |
| isActive | boolean | N | 재직여부 (미입력 시 전체) |
| page | integer | N | 기본값 1 |
| size | integer | N | 기본값 20 |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "salespersonId": 1,
        "name": "홍길동",
        "department": "영업1팀",
        "rank": "대리",
        "manager": {
          "salespersonId": 5,
          "name": "박팀장"
        },
        "email": "hong@company.com",
        "hireDate": "2023-03-02",
        "isActive": true
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "totalCount": 12,
      "totalPages": 1
    }
  }
}
```

---

### 3.2 단건 조회

```
GET /salespersons/{salespersonId}
```

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| salespersonId | integer | 사원 ID |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "salespersonId": 1,
    "name": "홍길동",
    "department": "영업1팀",
    "rank": "대리",
    "manager": {
      "salespersonId": 5,
      "name": "박팀장"
    },
    "email": "hong@company.com",
    "hireDate": "2023-03-02",
    "isActive": true
  }
}
```

---

### 3.3 등록

```
POST /salespersons
```

**권한:** 관리자

**Request Body**

```json
{
  "name": "김영희",
  "email": "kim@company.com",
  "password": "initPass1!",
  "department": "영업1팀",
  "rank": "사원",
  "managerId": 5,
  "hireDate": "2026-03-01"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| name | string | Y | 사원명 (최대 50자) |
| email | string | Y | 이메일, 중복 불가 |
| password | string | Y | 초기 비밀번호 (8자 이상) |
| department | string | Y | 부서명 |
| rank | string | Y | 직급 |
| managerId | integer | N | 상급자 ID |
| hireDate | date | Y | 입사일 |

**Response `201`**

```json
{
  "success": true,
  "data": {
    "salespersonId": 12
  }
}
```

---

### 3.4 수정

```
PUT /salespersons/{salespersonId}
```

**권한:** 관리자

**Request Body**

```json
{
  "name": "김영희",
  "department": "영업2팀",
  "rank": "주임",
  "managerId": 7,
  "hireDate": "2026-03-01",
  "isActive": true,
  "password": "newPass1!"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| name | string | Y | |
| department | string | Y | |
| rank | string | Y | |
| managerId | integer | N | null 입력 시 상급자 해제 |
| hireDate | date | Y | |
| isActive | boolean | Y | |
| password | string | N | 입력 시에만 변경 |

**Response `200`**

```json
{
  "success": true,
  "data": null
}
```

---

## 4. 고객 Customer

### 4.1 목록 조회

```
GET /customers
```

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| keyword | string | N | 회사명·담당자명 검색 |
| industry | string | N | 업종 필터 |
| isActive | boolean | N | 활성여부 (미입력 시 전체) |
| page | integer | N | 기본값 1 |
| size | integer | N | 기본값 20 |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "customerId": 1,
        "companyName": "(주)A산업",
        "contactName": "김대리",
        "phone": "010-1234-5678",
        "email": "kim@a-industry.com",
        "industry": "제조",
        "isActive": true
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "totalCount": 45,
      "totalPages": 3
    }
  }
}
```

---

### 4.2 단건 조회

```
GET /customers/{customerId}
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "customerId": 1,
    "companyName": "(주)A산업",
    "contactName": "김대리",
    "phone": "010-1234-5678",
    "email": "kim@a-industry.com",
    "address": "서울시 강남구 테헤란로 123",
    "industry": "제조",
    "memo": "주력 고객사, 연간 계약 갱신 예정",
    "isActive": true,
    "createdAt": "2025-01-10T09:00:00",
    "updatedAt": "2026-03-15T14:22:00"
  }
}
```

---

### 4.3 등록

```
POST /customers
```

**권한:** 관리자

**Request Body**

```json
{
  "companyName": "(주)B솔루션",
  "contactName": "이과장",
  "phone": "02-9876-5432",
  "email": "lee@b-solution.com",
  "address": "경기도 성남시 분당구 판교로 456",
  "industry": "IT",
  "memo": ""
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| companyName | string | Y | 회사명 (최대 200자) |
| contactName | string | Y | 담당자명 (최대 100자) |
| phone | string | N | 연락처 |
| email | string | N | 이메일 |
| address | string | N | 주소 (최대 500자) |
| industry | string | N | 업종 |
| memo | string | N | 메모 |

**Response `201`**

```json
{
  "success": true,
  "data": {
    "customerId": 46
  }
}
```

---

### 4.4 수정

```
PUT /customers/{customerId}
```

**권한:** 관리자

**Request Body**

```json
{
  "companyName": "(주)B솔루션",
  "contactName": "이과장",
  "phone": "02-9876-5432",
  "email": "lee@b-solution.com",
  "address": "경기도 성남시 분당구 판교로 456",
  "industry": "IT",
  "memo": "2026년 신규 계약 체결",
  "isActive": true
}
```

**Response `200`**

```json
{
  "success": true,
  "data": null
}
```

---

## 5. 일일보고 Daily Report

### 5.1 내 보고서 목록 조회

```
GET /reports
```

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| startDate | date | N | 조회 시작일 (기본: 당월 1일) |
| endDate | date | N | 조회 종료일 (기본: 오늘) |
| status | string | N | DRAFT \| SUBMITTED \| CONFIRMED |
| page | integer | N | 기본값 1 |
| size | integer | N | 기본값 20 |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "reportId": 101,
        "reportDate": "2026-05-14",
        "status": "DRAFT",
        "visitCount": 3,
        "submittedAt": null,
        "confirmedAt": null,
        "updatedAt": "2026-05-14T11:30:00"
      },
      {
        "reportId": 98,
        "reportDate": "2026-05-13",
        "status": "CONFIRMED",
        "visitCount": 2,
        "submittedAt": "2026-05-13T18:02:00",
        "confirmedAt": "2026-05-14T09:05:00",
        "updatedAt": "2026-05-13T18:02:00"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "totalCount": 42,
      "totalPages": 3
    }
  }
}
```

---

### 5.2 팀 보고서 목록 조회

```
GET /reports/team
```

**권한:** 상급자

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| reportDate | date | N | 보고일자 (기본: 오늘) |
| salespersonId | integer | N | 특정 사원 필터 (직속 부하만) |
| status | string | N | DRAFT \| SUBMITTED \| CONFIRMED \| NONE (미작성) |
| page | integer | N | 기본값 1 |
| size | integer | N | 기본값 20 |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "reportId": 101,
        "reportDate": "2026-05-14",
        "salesperson": {
          "salespersonId": 1,
          "name": "홍길동",
          "department": "영업1팀"
        },
        "status": "SUBMITTED",
        "visitCount": 3,
        "commentCount": 0,
        "submittedAt": "2026-05-14T17:55:00"
      },
      {
        "reportId": null,
        "reportDate": "2026-05-14",
        "salesperson": {
          "salespersonId": 3,
          "name": "이철수",
          "department": "영업1팀"
        },
        "status": "NONE",
        "visitCount": 0,
        "commentCount": 0,
        "submittedAt": null
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "totalCount": 5,
      "totalPages": 1
    }
  }
}
```

---

### 5.3 보고서 상세 조회

```
GET /reports/{reportId}
```

**권한:** 본인 또는 직속 상급자

**Response `200`**

```json
{
  "success": true,
  "data": {
    "reportId": 101,
    "reportDate": "2026-05-14",
    "status": "SUBMITTED",
    "salesperson": {
      "salespersonId": 1,
      "name": "홍길동",
      "department": "영업1팀",
      "rank": "대리"
    },
    "submittedAt": "2026-05-14T17:55:00",
    "confirmedAt": null,
    "createdAt": "2026-05-14T09:10:00",
    "updatedAt": "2026-05-14T17:55:00",
    "visits": [
      {
        "visitId": 201,
        "customer": {
          "customerId": 1,
          "companyName": "(주)A산업",
          "contactName": "김대리"
        },
        "visitTime": "10:00",
        "visitPurpose": "제품 데모",
        "visitContent": "신제품 소개 및 시연 진행. 관심 높음.",
        "nextVisitDate": "2026-05-20"
      }
    ],
    "problems": [
      {
        "problemId": 301,
        "seq": 1,
        "content": "A사 계약 조건 내부 검토 필요",
        "createdAt": "2026-05-14T10:30:00",
        "comments": [
          {
            "commentId": 401,
            "author": {
              "salespersonId": 5,
              "name": "박팀장"
            },
            "content": "법무팀과 확인해서 내일까지 답변 주세요",
            "createdAt": "2026-05-14T09:05:00",
            "updatedAt": "2026-05-14T09:05:00"
          }
        ]
      }
    ],
    "plans": [
      {
        "planId": 501,
        "seq": 1,
        "content": "C사 신규 방문 (오전 10시)",
        "createdAt": "2026-05-14T10:35:00",
        "comments": []
      }
    ]
  }
}
```

---

### 5.4 보고서 생성

```
POST /reports
```

**권한:** 영업사원 (당일 보고서 없는 경우)

**Request Body**

```json
{
  "reportDate": "2026-05-14"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| reportDate | date | Y | 보고 일자 |

**Response `201`**

```json
{
  "success": true,
  "data": {
    "reportId": 101
  }
}
```

**Response `409`** - 당일 보고서 중복

```json
{
  "success": false,
  "error": {
    "code": "REPORT_ALREADY_EXISTS",
    "message": "해당 날짜의 보고서가 이미 존재합니다",
    "data": {
      "reportId": 101
    }
  }
}
```

---

### 5.5 보고서 제출

```
POST /reports/{reportId}/submit
```

**권한:** 본인, DRAFT 상태일 때만 가능

**유효성:** 방문기록 1건 이상 존재해야 함

**Response `200`**

```json
{
  "success": true,
  "data": {
    "reportId": 101,
    "status": "SUBMITTED",
    "submittedAt": "2026-05-14T17:55:00"
  }
}
```

**Response `422`** - 방문기록 없음

```json
{
  "success": false,
  "error": {
    "code": "REPORT_VISIT_REQUIRED",
    "message": "방문기록을 1건 이상 입력해야 제출할 수 있습니다"
  }
}
```

---

### 5.6 보고서 확인처리

```
POST /reports/{reportId}/confirm
```

**권한:** 직속 상급자, SUBMITTED 상태일 때만 가능

**Response `200`**

```json
{
  "success": true,
  "data": {
    "reportId": 101,
    "status": "CONFIRMED",
    "confirmedAt": "2026-05-15T09:05:00"
  }
}
```

---

## 6. 방문기록 Visit Record

### 6.1 방문기록 추가

```
POST /reports/{reportId}/visits
```

**권한:** 본인, DRAFT 상태일 때만 가능

**Request Body**

```json
{
  "customerId": 1,
  "visitTime": "10:00",
  "visitPurpose": "제품 데모",
  "visitContent": "신제품 소개 및 시연 진행. 관심 높음.",
  "nextVisitDate": "2026-05-20"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| customerId | integer | Y | 고객 ID |
| visitTime | time | N | 방문 시각 (HH:MM) |
| visitPurpose | string | N | 방문 목적 (최대 500자) |
| visitContent | string | N | 방문 내용 |
| nextVisitDate | date | N | 차기 방문 예정일 |

**Response `201`**

```json
{
  "success": true,
  "data": {
    "visitId": 201
  }
}
```

---

### 6.2 방문기록 수정

```
PUT /reports/{reportId}/visits/{visitId}
```

**권한:** 본인, DRAFT 상태일 때만 가능

**Request Body**

```json
{
  "customerId": 1,
  "visitTime": "10:30",
  "visitPurpose": "계약 협의",
  "visitContent": "계약서 최종 검토. 다음 주 서명 예정.",
  "nextVisitDate": "2026-05-21"
}
```

**Response `200`**

```json
{
  "success": true,
  "data": null
}
```

---

### 6.3 방문기록 삭제

```
DELETE /reports/{reportId}/visits/{visitId}
```

**권한:** 본인, DRAFT 상태일 때만 가능

**Response `200`**

```json
{
  "success": true,
  "data": null
}
```

---

## 7. 과제/상담 Problem

### 7.1 과제/상담 추가

```
POST /reports/{reportId}/problems
```

**권한:** 본인, DRAFT 상태일 때만 가능

**Request Body**

```json
{
  "content": "A사 계약 조건 내부 검토 필요",
  "seq": 1
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| content | string | Y | 내용 |
| seq | integer | N | 표시 순서 (기본: 마지막 + 1) |

**Response `201`**

```json
{
  "success": true,
  "data": {
    "problemId": 301
  }
}
```

---

### 7.2 과제/상담 수정

```
PUT /reports/{reportId}/problems/{problemId}
```

**권한:** 본인, DRAFT 상태일 때만 가능

**Request Body**

```json
{
  "content": "A사 계약 조건 내부 검토 완료, 법무팀 확인 중",
  "seq": 1
}
```

**Response `200`**

```json
{
  "success": true,
  "data": null
}
```

---

### 7.3 과제/상담 삭제

```
DELETE /reports/{reportId}/problems/{problemId}
```

**권한:** 본인, DRAFT 상태일 때만 가능

**Response `200`**

```json
{
  "success": true,
  "data": null
}
```

---

## 8. 익일계획 Plan

### 8.1 익일계획 추가

```
POST /reports/{reportId}/plans
```

**권한:** 본인, DRAFT 상태일 때만 가능

**Request Body**

```json
{
  "content": "C사 신규 방문 (오전 10시)",
  "seq": 1
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| content | string | Y | 내용 |
| seq | integer | N | 표시 순서 (기본: 마지막 + 1) |

**Response `201`**

```json
{
  "success": true,
  "data": {
    "planId": 501
  }
}
```

---

### 8.2 익일계획 수정

```
PUT /reports/{reportId}/plans/{planId}
```

**권한:** 본인, DRAFT 상태일 때만 가능

**Request Body**

```json
{
  "content": "C사 신규 방문 (오전 10시, 제안서 지참)",
  "seq": 1
}
```

**Response `200`**

```json
{
  "success": true,
  "data": null
}
```

---

### 8.3 익일계획 삭제

```
DELETE /reports/{reportId}/plans/{planId}
```

**권한:** 본인, DRAFT 상태일 때만 가능

**Response `200`**

```json
{
  "success": true,
  "data": null
}
```

---

## 9. 댓글 Comment

### 9.1 과제/상담 댓글 추가

```
POST /problems/{problemId}/comments
```

**권한:** 직속 상급자

**Request Body**

```json
{
  "content": "법무팀과 확인해서 내일까지 답변 주세요"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| content | string | Y | 댓글 내용 (최대 1000자) |

**Response `201`**

```json
{
  "success": true,
  "data": {
    "commentId": 401
  }
}
```

---

### 9.2 과제/상담 댓글 수정

```
PUT /problems/{problemId}/comments/{commentId}
```

**권한:** 댓글 작성자 본인

**Request Body**

```json
{
  "content": "법무팀과 확인해서 내일까지 답변 주세요 (긴급)"
}
```

**Response `200`**

```json
{
  "success": true,
  "data": null
}
```

---

### 9.3 과제/상담 댓글 삭제

```
DELETE /problems/{problemId}/comments/{commentId}
```

**권한:** 댓글 작성자 본인

**Response `200`**

```json
{
  "success": true,
  "data": null
}
```

---

### 9.4 익일계획 댓글 추가

```
POST /plans/{planId}/comments
```

**권한:** 직속 상급자

**Request Body**

```json
{
  "content": "제안서 꼭 지참하세요"
}
```

**Response `201`**

```json
{
  "success": true,
  "data": {
    "commentId": 402
  }
}
```

---

### 9.5 익일계획 댓글 수정

```
PUT /plans/{planId}/comments/{commentId}
```

**권한:** 댓글 작성자 본인

**Request Body**

```json
{
  "content": "제안서 꼭 지참하세요. 최신 버전으로 준비해주세요."
}
```

**Response `200`**

```json
{
  "success": true,
  "data": null
}
```

---

### 9.6 익일계획 댓글 삭제

```
DELETE /plans/{planId}/comments/{commentId}
```

**권한:** 댓글 작성자 본인

**Response `200`**

```json
{
  "success": true,
  "data": null
}
```

---

## 10. 에러 코드

| 코드 | HTTP 상태 | 설명 |
|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | 이메일 또는 비밀번호 불일치 |
| `AUTH_TOKEN_EXPIRED` | 401 | 액세스 토큰 만료 |
| `AUTH_TOKEN_INVALID` | 401 | 유효하지 않은 토큰 |
| `AUTH_INACTIVE_ACCOUNT` | 401 | 비활성(퇴직) 계정 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `VALIDATION_ERROR` | 400 | 입력값 유효성 오류 |
| `REPORT_ALREADY_EXISTS` | 409 | 해당 날짜 보고서 중복 |
| `REPORT_VISIT_REQUIRED` | 422 | 제출 시 방문기록 없음 |
| `REPORT_STATUS_INVALID` | 422 | 현재 상태에서 불가한 작업 |
| `REPORT_NOT_EDITABLE` | 403 | DRAFT 상태가 아니어서 수정 불가 |
| `SALESPERSON_EMAIL_DUPLICATE` | 409 | 이메일 중복 |
| `INTERNAL_SERVER_ERROR` | 500 | 서버 내부 오류 |

---

## API 목록 요약

| 분류 | 메서드 | URL | 설명 |
|---|---|---|---|
| Auth | POST | `/auth/login` | 로그인 |
| Auth | POST | `/auth/logout` | 로그아웃 |
| Auth | GET | `/auth/me` | 내 정보 조회 |
| 영업사원 | GET | `/salespersons` | 목록 조회 |
| 영업사원 | GET | `/salespersons/{id}` | 단건 조회 |
| 영업사원 | POST | `/salespersons` | 등록 |
| 영업사원 | PUT | `/salespersons/{id}` | 수정 |
| 고객 | GET | `/customers` | 목록 조회 |
| 고객 | GET | `/customers/{id}` | 단건 조회 |
| 고객 | POST | `/customers` | 등록 |
| 고객 | PUT | `/customers/{id}` | 수정 |
| 일일보고 | GET | `/reports` | 내 보고서 목록 |
| 일일보고 | GET | `/reports/team` | 팀 보고서 목록 |
| 일일보고 | GET | `/reports/{id}` | 상세 조회 |
| 일일보고 | POST | `/reports` | 생성 |
| 일일보고 | POST | `/reports/{id}/submit` | 제출 |
| 일일보고 | POST | `/reports/{id}/confirm` | 확인처리 |
| 방문기록 | POST | `/reports/{id}/visits` | 추가 |
| 방문기록 | PUT | `/reports/{id}/visits/{vId}` | 수정 |
| 방문기록 | DELETE | `/reports/{id}/visits/{vId}` | 삭제 |
| 과제/상담 | POST | `/reports/{id}/problems` | 추가 |
| 과제/상담 | PUT | `/reports/{id}/problems/{pId}` | 수정 |
| 과제/상담 | DELETE | `/reports/{id}/problems/{pId}` | 삭제 |
| 익일계획 | POST | `/reports/{id}/plans` | 추가 |
| 익일계획 | PUT | `/reports/{id}/plans/{pId}` | 수정 |
| 익일계획 | DELETE | `/reports/{id}/plans/{pId}` | 삭제 |
| 댓글 | POST | `/problems/{pId}/comments` | 과제 댓글 추가 |
| 댓글 | PUT | `/problems/{pId}/comments/{cId}` | 과제 댓글 수정 |
| 댓글 | DELETE | `/problems/{pId}/comments/{cId}` | 과제 댓글 삭제 |
| 댓글 | POST | `/plans/{pId}/comments` | 계획 댓글 추가 |
| 댓글 | PUT | `/plans/{pId}/comments/{cId}` | 계획 댓글 수정 |
| 댓글 | DELETE | `/plans/{pId}/comments/{cId}` | 계획 댓글 삭제 |
