# Implementation Plan: 티켓 생성 (POST /api/tickets)

**Branch**: `001-create-ticket` (git 브랜치는 만들지 않음, 현재 `main`) | **Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-create-ticket/spec.md`

## Summary

사용자가 제목(필수)과 설명·우선순위·시작예정일·종료예정일(선택)로 티켓을 만들면 Backlog 맨 위에 추가하는
`POST /api/tickets`를 spec과 constitution에 맞게 완성한다. 엔드포인트는 SDD 이전 TDD로 이미 있으므로 이번 작업은
**신규 구현이 아니라 차이 보정**이다([research §0](./research.md) G1~G7).

기술 접근:
1. **docs 먼저**: 사용자 결정(빈 칼럼 −1024, Asia/Seoul "오늘", 날짜 형식 오류 메시지)을 docs에 반영(D1~D5).
2. **Zod 검증** (`src/shared/validations/ticket.ts`): Asia/Seoul 기준 `getTodayInSeoul`, 달력 유효성까지 보는 날짜
   헬퍼, 필드별 한국어 메시지(타입 오류 포함). 클라이언트·서버 공용.
3. **middleware** (`src/server/middleware/`): `validate.ts`(Zod → `ValidationError`), `errorHandler.ts`
   (`ValidationError` → 400 `VALIDATION_ERROR`, 그 외 → 500 `INTERNAL_ERROR` "서버 내부 오류").
4. **Route Handler** (`app/api/tickets/route.ts`): 본문 파싱(실패·비객체 → `{}`) → `validate` → 서비스 호출 → 201.
   비즈니스 로직 없음, 예외는 `handleError`에 위임.
5. **Service** (`src/server/services/ticketService.ts`): `position = (min ?? 0) − 1024` 계산과 저장만.
6. **TDD**: 각 보정마다 실패하는 테스트를 먼저 작성(RED) → 최소 구현(GREEN) → 정리.

## Technical Context

**Language/Version**: TypeScript 5 (`strict: true`), Node.js ≥ 20

**Primary Dependencies**: Next.js 15.5 App Router(Route Handler), Zod 3, Drizzle ORM 0.38 + `pg`

**Storage**: PostgreSQL — `tickets` 테이블(기존, 스키마 변경 없음). 개발 `tika_dev`, 테스트 `tika_test`

**Testing**: Jest 29 + `next/jest` — backend 프로젝트(node 환경, `__tests__/api`, `__tests__/services`),
실제 `tika_test` DB 사용, `jest.setup.backend.ts`가 풀 종료

**Target Platform**: Vercel(서버리스 Node 런타임), 로컬 개발은 WSL

**Project Type**: web-service (Next.js 풀스택 단일 저장소, `app/` + `src/{server,client,shared}`)

**Performance Goals**: 생성 요청 p95 ≤ 300ms (docs NFR-001, spec SC-002) — 쿼리 2회(min 조회 + insert),
`idx_tickets_status_position` 인덱스로 충족

**Constraints**: 응답·에러 형식은 API_SPEC 그대로, 사용자 메시지 한국어, "오늘"은 Asia/Seoul,
constitution 가드레일(테스트 DB 정리는 `tika_test` 한정·`WHERE` 필수, `db:push` 금지성 확인)

**Scale/Scope**: 단일 사용자, 엔드포인트 1개, 수정 파일 약 6개 + docs 3개

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 점검 | Phase 0 전 | Phase 1 후 |
|------|------|-----------|-----------|
| I. TypeScript Strict | `strict` 유지, `any`/`@ts-ignore` 없음. 본문 파싱 결과는 `unknown`으로 받아 Zod로 좁힘 | ✅ | ✅ |
| II. API 계약 준수 | 응답 필드·201/400/500이 [contract](./contracts/post-tickets.md)·API_SPEC과 일치. 계약 변경(D2~D4)은 docs 먼저 | ✅ (docs 선행 조건) | ✅ |
| III. 통일된 에러 응답 | 모든 실패 경로(검증·파싱·DB)가 `{error:{code,message}}`. code는 3개 중 2개만 사용, 500에 내부 정보 없음 | ❌ 현재 구현 G3·G4·G5 위반 → 이번 작업으로 해소 | ✅ |
| IV. Zod 요청 검증 | 단일 스키마(`shared/validations`), 달력에 없는 날짜도 검증 단계에서 차단, 검증 전 서비스 호출 없음 | ❌ 현재 G3(무효 날짜가 DB까지 감) → 해소 | ✅ |
| V. 서비스 계층 분리 | position 계산은 서비스, 라우트는 파싱→검증→호출→응답, 에러 매핑은 middleware | ⚠️ 현재 G6 → 해소 | ✅ |
| 추가 제약 | 명세 밖 기능 없음, Asia/Seoul, 파생 필드 저장 없음 | ❌ 현재 G2 → 해소 | ✅ |
| 워크플로/TDD | 테스트 먼저, 완료 조건 test·tsc·lint | ✅ | ✅ |
| 가드레일 | 스키마 변경 없음(마이그레이션·`db:push` 불필요). 테스트 정리는 `tika_test` 확인 + `WHERE status='BACKLOG'` 조건 삭제 | ✅ | ✅ |

**판정**: 통과. ❌ 항목은 "설계가 원칙을 위반"하는 것이 아니라 "기존 코드가 원칙을 위반"하는 것이며, 이 plan의
목적이 그 위반을 고치는 것이다. 정당화가 필요한 설계상 위반은 없으므로 Complexity Tracking은 비워 둔다.

## Project Structure

### Documentation (this feature)

```text
specs/001-create-ticket/
├── spec.md
├── plan.md              # 이 파일
├── research.md          # Phase 0: 차이 분석 + 기술 결정 + docs 수정 범위(D1~D5)
├── data-model.md        # Phase 1: Ticket 엔티티, 입력 검증 규칙
├── quickstart.md        # Phase 1: 검증 실행 가이드
├── contracts/
│   └── post-tickets.md  # Phase 1: 요청/응답/에러 계약
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — 아직 없음)
```

### Source Code (repository root)

```text
docs/
├── REQUIREMENTS.md                     # 수정: D1(28행 position), D2(메시지 2개)
├── API_SPEC.md                         # 수정: D2(에러 표), D3(생성 스키마), D4(파싱 규칙)
└── TEST_CASES.md                       # 수정: D5(TC-API-001 신규 케이스)

app/api/tickets/
└── route.ts                            # 수정: 파싱 → validate → createTicket → 201, catch → handleError

src/
├── server/
│   ├── middleware/
│   │   ├── validate.ts                 # 신규: validate(schema, input), ValidationError
│   │   └── errorHandler.ts             # 신규: handleError(error) → NextResponse
│   └── services/
│       └── ticketService.ts            # 수정: position = (min ?? 0) - POSITION_GAP
└── shared/
    ├── constants.ts                    # 신규: TIMEZONE, POSITION_GAP
    └── validations/
        └── ticket.ts                   # 수정: getTodayInSeoul, dateString 헬퍼, 필드별 메시지

__tests__/
├── api/
│   └── tickets.test.ts                 # 수정: TC-API-001 전체 + 신규 케이스
└── services/
    ├── ticketService.test.ts           # 신규: position 계산(빈 칼럼 / 기존 티켓)
    └── ticketValidation.test.ts        # 신규: getTodayInSeoul KST 자정 경계, 날짜 유효성
```

**Structure Decision**: TRD §3의 기존 디렉토리 구조를 그대로 쓴다. 새 파일(`middleware/validate.ts`,
`middleware/errorHandler.ts`, `shared/constants.ts`)은 모두 TRD에 이미 정의된 경로다. 날짜 헬퍼는 TRD에 없는
`utils/` 폴더를 만들지 않고 `validations/ticket.ts`에 둔다([research §1](./research.md)). 클라이언트 코드
(`TicketForm`, `ticketApi.ts`, `useTickets`)는 이 기능 범위 밖이다(spec Assumptions).

### 의존성 순서 (tasks 생성 참고)

1. docs D1~D5 (사용자 확인 후)
2. `shared/constants.ts` → `shared/validations/ticket.ts` (테스트 먼저)
3. `server/middleware/validate.ts`, `errorHandler.ts` (테스트 먼저 — API 테스트로 검증)
4. `server/services/ticketService.ts` position 수정 (서비스 테스트 먼저)
5. `app/api/tickets/route.ts` 재구성 (API 테스트 먼저)
6. 품질 게이트: `npm test`, `npx tsc --noEmit`, `npm run lint`

## Complexity Tracking

해당 없음 — Constitution Check에서 정당화가 필요한 설계상 위반이 없다.
