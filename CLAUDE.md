# 영업 일일보고 시스템

영업사원의 일일 고객 방문 활동, 과제/상담, 익일 계획을 보고하고 상급자가 피드백하는 웹 기반 시스템입니다.

## 문서

#요구사항및ER다이어그램
@docs/요구사항및ER다이어그램.md

#DDL
@docs/DDL.md

#화면설계
@docs/화면정의서.md

#API명세서
@docs/API명세서.md

#테스트명세서
@docs/테스트명세서.md

## 개발 환경

- **스택:** React + TypeScript + Vite
- **DB ORM:** Prisma (MySQL 8.0+)
- **린터:** ESLint 9.x (flat config)
- **포매터:** Prettier 3.x
- **테스트:** Vitest + React Testing Library
- **Git 훅:** Husky + lint-staged

## 개발 서버 명령어

```bash
npm run dev      # 개발 서버 실행 (http://localhost:5173)
npm run build    # 타입 체크 + 프로덕션 빌드
npm run preview  # 빌드 결과물 로컬 미리보기
```

## 포매터 명령어

```bash
npm run format        # 자동 포맷 적용
npm run format:check  # 포맷 위반 여부만 확인
```

## 테스트 명령어

```bash
npm test               # watch 모드로 실행
npm run test:run       # 단회 실행
npm run test:coverage  # 커버리지 리포트 생성 (기준: 80%)
```

## Prisma 명령어

```bash
npx prisma generate        # Prisma Client 생성
npx prisma migrate dev     # 마이그레이션 적용 (개발)
npx prisma migrate deploy  # 마이그레이션 적용 (운영)
npx prisma studio          # DB GUI 브라우저 실행
```

## 린트 명령어

```bash
npm run lint        # 검사
npm run lint:fix    # 자동 수정
```

## ESLint 주요 규칙

| 규칙 | 수준 | 설명 |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | warn | any 타입 사용 경고 |
| `@typescript-eslint/no-unused-vars` | error | 미사용 변수 오류 |
| `@typescript-eslint/consistent-type-imports` | error | type import 일관성 강제 |
| `react/react-in-jsx-scope` | off | React 17+ 자동 import |
| `react/prop-types` | off | TypeScript로 대체 |
| `react-hooks/rules-of-hooks` | error | Hooks 규칙 강제 |
| `react-hooks/exhaustive-deps` | warn | useEffect 의존성 경고 |
| `prefer-const` | error | const 우선 사용 강제 |
| `eqeqeq` | error | `===` 사용 강제 |
| `no-console` | warn | console.log 경고 (warn/error 허용) |
