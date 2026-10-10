# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **`notes/` 디렉토리는 사용자의 개인 작업 노트입니다. 어떤 방법(Read, Grep, Glob, Bash 등)으로도 읽거나 검색하거나 수정하지 마세요.**

이 프로젝트는 **SDD(Spec-Driven Development)** 방식으로 개발합니다. 코드보다 명세가 먼저이며, 모든 기능은 Spec Kit 워크플로(§5)를 거쳐 구현합니다.

---

## 1. 프로젝트 개요와 구조

**Tika** — 1인 사용자용 칸반 TODO 앱. 고정 4칼럼(Backlog / TODO / In Progress / Done) 보드에서 티켓을 드래그앤드롭으로 관리합니다. 인증 없음, 단일 사용자.

**현재 상태**: Next.js 15 스캐폴딩, 루트/보드 레이아웃(placeholder 페이지), 티켓 생성 API(`POST /api/tickets`, FR-001), `tickets` 테이블 마이그레이션(`drizzle/0000_*.sql`)까지 완료. FR-001은 SDD 도입 이전에 TDD로 구현되었고, 이후 `specs/001-create-ticket/`으로 소급 명세·보정되었습니다(공용 에러 처리 `src/server/middleware/`, Asia/Seoul 날짜 검증 포함). 나머지 기능은 SDD로 진행합니다.

### 디렉토리 구조

```
app/                      Next.js App Router (src/ 밖, TRD §3 기준)
├── api/tickets/          Route Handler — 요청 파싱 → 서비스 호출 → 응답 반환만
├── (board)/              보드 페이지 그룹 (page.tsx, layout.tsx)
├── layout.tsx, globals.css
src/
├── server/               백엔드 전용 (services/, db/, middleware/)
├── client/               프론트엔드 전용 (components/{board,ticket,ui}, hooks/, api/)
└── shared/               양쪽 공용 (types/, validations/, constants.ts)
__tests__/                api/, services/ (node 환경) · components/, hooks/ (jsdom 환경)
drizzle/                  마이그레이션 SQL + meta (Git으로 관리)
docs/                     제품 전체 기준 명세 (§3)
specs/                    기능 단위 SDD 산출물 (/speckit-specify 실행 시 생성)
.specify/                 Spec Kit 템플릿·스크립트·constitution
notes/                    사용자 개인 노트 — 접근 금지
```

### 계층 분리 규칙 (import 방향)

- `src/server/` ↔ `src/client/` 는 서로 import 금지. 공용 코드는 `src/shared/`에만 둡니다.
- 요청 흐름: `app/api/tickets/route.ts` → `src/server/services/ticketService.ts` → `src/server/db/schema.ts`(Drizzle) → PostgreSQL. Route Handler는 Router+Controller 역할만 하며 비즈니스 로직을 넣지 않습니다.
- 양쪽에 영향을 주는 변경(예: 새 필드)은 `src/shared/`를 먼저 수정한 뒤 서버·클라이언트로 전파합니다.
- 컴포넌트의 모든 API 호출은 `src/client/api/ticketApi.ts`를 거칩니다 (컴포넌트에서 직접 `fetch` 금지).
- 클라이언트 폼과 서버 라우트 검증은 모두 `src/shared/validations/ticket.ts`의 같은 Zod 스키마를 씁니다.

---

## 2. 기술스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 15.5 (App Router), React 19 |
| 언어 | TypeScript 5 (`strict: true`) |
| 스타일 | Tailwind CSS 4 (`@tailwindcss/postcss`) |
| 드래그앤드롭 | @dnd-kit/core 6, @dnd-kit/sortable 8 |
| DB / ORM | PostgreSQL (로컬), Drizzle ORM 0.38 + drizzle-kit 0.30, 드라이버 `pg`(node-postgres) |
| 검증 | Zod 3 |
| 테스트 | Jest 29 + `next/jest`, @testing-library/react, @testing-library/jest-dom |
| 품질 | ESLint 9 (next/core-web-vitals, next/typescript), Prettier |
| 배포 대상 | Vercel |

- 경로 별칭: `@/` → `src/` (`tsconfig.json` paths + `jest.config.ts` moduleNameMapper)
- 환경변수: `DATABASE_URL` — `.env.local`(tika_dev), `.env.test`(tika_test). `.env.example` 참고
- 명령어 (**WSL 안에서 실행** — Windows 쪽에서는 git 소유권 오류가 남):
  - `npm run dev` / `npm run build` / `npm run lint`
  - `npm test` (전체) / `npm test -- <경로>` (단일 파일) — Jest가 backend(node) / frontend(jsdom) 프로젝트로 분리
  - `npm run format` / `npm run format:check`
  - `npm run db:generate` → `npm run db:migrate` (TRD §4.2), `db:push`, `db:seed`
- 백엔드 테스트는 실제 `tika_test` DB를 사용하며, `jest.setup.backend.ts`가 종료 시 DB 풀을 닫습니다.

---

## 3. 명세 문서 경로

추측하지 말고 구현 전에 관련 명세를 먼저 읽습니다. 우선순위는 위에서 아래 순서입니다.

1. **`.specify/memory/constitution.md`** — 프로젝트 원칙(최상위 규칙). ⚠️ 현재 템플릿 상태이므로 첫 기능 명세 전에 `/speckit-constitution`으로 작성해야 합니다.
2. **`docs/`** — 제품 전체 기준 명세 (Source of truth)
   - `docs/PRD.md` — 제품 범위, 사용자 시나리오, 고정 4칼럼 보드 레이아웃
   - `docs/TRD.md` — 아키텍처, 디렉토리 구조, 계층 분리 규칙, 데이터 흐름
   - `docs/REQUIREMENTS.md` — FR/NFR 상세, 검증 에러 메시지, 사용자 스토리, 추적 매트릭스
   - `docs/DATA_MODEL.md` — Drizzle 스키마, TypeScript 타입, 비즈니스 규칙, 시드 데이터
   - `docs/API_SPEC.md` — 요청/응답 형식, 에러 코드, Zod 스키마
   - `docs/COMPONENT_SPEC.md` — 컴포넌트 트리, Props, 훅 인터페이스, 이벤트 흐름
   - `docs/TEST_CASES.md` — TDD 테스트 케이스 정의 (FR/US 추적 포함)
3. **`specs/NNN-기능명/`** — 기능 단위 SDD 산출물 (`spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `contracts/`). 번호는 순차 부여.

**충돌 규칙**: `docs/`가 기준입니다. 기능 spec/plan이 `docs/`와 어긋나면 임의로 한쪽을 따르지 말고, **`docs/`를 먼저 수정(사용자 확인 후)한 뒤** spec에 반영합니다.

**용어 일관성**: 명세가 한글이므로 코드 이름도 같은 용어에 맞춥니다 — "Backlog", 시작예정일=`plannedStartDate`, 종료예정일=`dueDate`, 시작일=`startedAt`, 종료일=`completedAt`.

---

## 4. 코딩 컨벤션

### 포맷·스타일
- Prettier 설정 준수: 세미콜론 사용, 작은따옴표, trailing comma `all`
- `src/` 모듈은 `@/` 별칭으로 import (`@/server/...`, `@/shared/...`). `app/`은 `src/` 밖이므로 상대경로 사용

### 네이밍·구조
- 컴포넌트: PascalCase 파일·이름 (`TicketCard.tsx`), 훅: `useXxx.ts`, 서비스: `xxxService.ts`
- 서비스·유틸은 **named export 함수**, Next.js 페이지/레이아웃만 default export
- DB 칼럼은 snake_case, TS 필드는 camelCase (Drizzle 스키마에서 매핑)
- `status`/`priority`는 DB ENUM이 아닌 VARCHAR + Zod 검증 (DATA_MODEL §2)

### API·에러
- 에러 응답 형식: `{ error: { code, message } }` (예: `VALIDATION_ERROR` → 400)
- 사용자에게 보이는 메시지는 한국어이며 `docs/REQUIREMENTS.md`·`API_SPEC.md` 문구를 그대로 사용

### 테스트
- 위치: `__tests__/{api,services,components,hooks}/` — 폴더에 따라 node/jsdom 환경이 자동 결정됨
- `describe`/`it` 설명은 한국어로, `docs/TEST_CASES.md`의 케이스와 대응되게 작성

### 도메인 규칙 (실수하기 쉬운 부분)
- **날짜 필드 구분**: `plannedStartDate`/`dueDate`는 사용자 입력 `DATE`. `startedAt`/`completedAt`은 시스템 관리 `TIMESTAMP`로 사용자가 직접 수정할 수 없고 상태 전이의 부수효과로만 설정됨
- **상태 전이** (`PATCH /api/tickets/reorder`): `TODO`로 이동 시 `startedAt = now()`, `BACKLOG`로 이동 시(어느 칼럼에서든) `startedAt` 초기화, `DONE`에서 벗어나면 `completedAt` 초기화. `DONE`으로 이동은 별도 엔드포인트 `PATCH /api/tickets/:id/complete`이며, `reorder`는 `status: DONE`을 명시적으로 거부
- **position**: 중간값 삽입 `(prev+next)/2`, 간격이 1 미만이면 해당 칼럼을 1024 간격으로 재정렬
- **isOverdue** (`dueDate < 오늘 && status !== DONE`): 조회 시 계산하는 파생 필드, 절대 저장하지 않음
- **Done 칼럼**: `completedAt` 기준 24시간 이내만 반환 — 클라이언트가 아니라 보드 조회 API에서 서버 측 필터
- **시간대**: "오늘"/"현재 시각" 판정은 모두 `Asia/Seoul` 기준
- **DnD 분기** (COMPONENT_SPEC §5.1): `DONE`으로 드롭 → 항상 `complete` 호출, 그 외 모든 드롭(`DONE`에서 나가는 이동 포함) → `reorder` 호출. 가장 흔한 버그 지점
- **프론트 상태**: Redux/Zustand 없이 단일 `useTickets` 훅(`src/client/hooks/useTickets.ts`)에서 `useState`/`useReducer`로 관리. DnD는 낙관적 업데이트 → 실패 시 드래그 이전 스냅샷으로 롤백
- **필터**("이번주 업무", "일정 초과"): 이미 가져온 보드 데이터에 클라이언트 사이드로만 적용, 새 fetch 없음, Backlog 칼럼엔 미적용

---

## 5. SDD 워크플로 규칙

### 단계 순서

| 단계 | 명령 | 산출물 / 목적 |
|---|---|---|
| 0 | `/speckit-constitution` | `constitution.md` 작성 (최초 1회, 원칙 변경 시) |
| 1 | `/speckit-specify` | `specs/NNN-기능/spec.md` — 무엇을, 왜 |
| 2 | `/speckit-clarify` | spec의 모호한 부분 질문·반영 (필요 시) |
| 3 | `/speckit-plan` | `plan.md`, `research.md`, `data-model.md`, `contracts/` — 어떻게 |
| 4 | `/speckit-tasks` | `tasks.md` — 의존성 순서의 작업 목록 |
| 5 | `/speckit-analyze` | spec·plan·tasks 간 일관성 점검 (읽기 전용) |
| 6 | `/speckit-implement` | tasks.md 순서대로 구현 |

보조: `/speckit-checklist`(기능별 체크리스트), `/speckit-converge`(미구현분을 tasks에 추가), `/speckit-taskstoissues`(GitHub 이슈화)

### 규칙
1. **단계 사이에는 반드시 사용자 리뷰·승인**을 받습니다. 승인 없이 다음 단계로 넘어가지 않습니다.
2. **spec 단계에는 무엇/왜만** 씁니다 (기술 스택·구현 방법 금지). 기술 결정은 plan 단계에서 하며, 이때 `docs/TRD.md`·`DATA_MODEL.md`·`API_SPEC.md`와 맞는지 확인합니다.
3. spec의 요구사항은 `docs/REQUIREMENTS.md`의 FR/US ID를 참조해 추적 가능하게 합니다.
4. **tasks는 TDD 순서**로 작성합니다: 각 단위마다 테스트 작성(RED) 작업이 구현(GREEN) 작업보다 앞서야 합니다. 테스트 케이스는 `docs/TEST_CASES.md` 기준.
5. **명세에 없는 기능은 추가하지 않습니다.** 구현 중 명세 오류·누락을 발견하면 멈추고 spec(필요하면 docs) 수정을 먼저 제안합니다.
6. 구현이 끝나면 `npm test`, `npx tsc --noEmit`, `npm run lint`가 통과해야 작업을 완료로 봅니다.

### TDD 사이클 (implement 단계에 적용)
- **RED**: 테스트 코드만 작성, 구현 코드 생성 금지
- **GREEN**: 테스트를 통과하는 최소한의 코드만 작성, 테스트 코드 수정 금지
- **Refactor**: 코드 개선만, 새 기능 추가 금지, 테스트는 계속 통과
- 테스트와 구현을 한 번에 작성하지 말고 반드시 단계별로 진행
- 테스트가 실패하면 구현을 고칩니다. 테스트를 고치지 않습니다 (명세 오류라면 명세를 먼저 수정)
