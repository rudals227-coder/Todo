---

description: "Task list for 001-create-ticket (POST /api/tickets 차이 보정)"
---

# Tasks: 티켓 생성 (POST /api/tickets)

**Input**: Design documents from `/specs/001-create-ticket/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/post-tickets.md](./contracts/post-tickets.md), [quickstart.md](./quickstart.md)

**Tests**: 포함한다. 이 프로젝트는 constitution·CLAUDE.md에 따라 TDD가 필수다. 각 구현(GREEN) 작업 앞에 그 작업을
검증하는 테스트(RED) 작업이 있다.

**Organization**: spec의 사용자 스토리별로 묶었다. 엔드포인트가 이미 있으므로 대부분은 차이 보정
([research §0](./research.md) G1~G7)이다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능(다른 파일, 끝나지 않은 작업에 의존하지 않음)
- **[Story]**: 해당 사용자 스토리(US1, US2, US3)
- **RED**: 테스트만 작성하고 **실패를 확인**한다. 구현 코드 작성 금지
- **RED(특성화)**: 이미 있는 동작을 고정하는 테스트라 처음부터 통과할 수 있다. 통과하면 그대로 두고, 실패하면 구현 쪽 결함으로 본다
- **GREEN**: 테스트를 통과시키는 최소 코드만 작성한다. 테스트 코드 수정 금지
- 모든 명령은 WSL 안 프로젝트 루트에서 실행한다

## TDD·가드레일 공통 규칙

- 테스트가 실패하면 구현을 고친다. 테스트를 고치지 않는다(명세 오류라면 멈추고 spec/docs 수정을 제안).
- 테스트에서 DB를 정리할 때는 `__tests__/helpers/testDb.ts`(T005)만 사용한다: 연결 DB가 `tika_test`인지 확인하고,
  `WHERE status = 'BACKLOG'` 조건이 있는 삭제만 한다. `TRUNCATE`·`WHERE` 없는 `DELETE`·`DROP` 금지.
- 스키마 변경이 없으므로 `db:generate`/`db:migrate`/`db:push`를 실행하지 않는다.

---

## Phase 1: Setup (docs 선행 수정 + 공용 기반)

**Purpose**: constitution "docs 먼저" 규칙에 따라 기준 문서를 사용자 결정에 맞추고, 공용 상수·테스트 헬퍼를 만든다.

**⚠️ docs 수정(T001~T003)은 변경 내용을 사용자에게 보여주고 승인받은 뒤 반영한다.**

- [X] T001 [P] `docs/REQUIREMENTS.md` FR-001 수정: (1) 28행 "칼럼에 티켓이 없을 경우 position = 0"을 "칼럼에 티켓이 없을 경우 0을 기준으로 삼아 position = -1024"로 변경(research D1), (2) "검증 에러 메시지" 표에 `| 시작예정일 형식 오류 | "시작예정일 형식이 올바르지 않습니다" |`, `| 종료예정일 형식 오류 | "종료예정일 형식이 올바르지 않습니다" |` 두 행 추가(D2), (3) 입력 필드 표의 dueDate 제약을 "오늘(Asia/Seoul) 이후 날짜, 오늘 포함"으로 명확화
- [X] T002 [P] `docs/API_SPEC.md` §1 수정: (1) 에러 응답 표에 날짜 형식 오류 2행 추가(D2), (2) 처리 규칙에 "본문이 JSON으로 파싱되지 않거나 객체가 아니면 빈 객체로 간주한다(→ 제목 누락 메시지)", "스키마에 없는 필드는 무시한다" 추가(D4), (3) "검증 스키마(Zod) > 생성 스키마"를 research §1·§2 기준으로 갱신 — 날짜 regex에 필드별 메시지, 달력상 존재 여부 refine, `invalid_type_error`, "오늘"은 `toISOString()`이 아니라 Asia/Seoul 기준(D3). 같은 문서의 수정 스키마(UpdateTicketInput)에 있는 동일한 UTC 계산은 이 기능 범위 밖이므로 표시만 해 둔다(`<!-- TODO: 수정 기능 spec에서 Asia/Seoul 반영 -->`)
- [X] T003 [P] `docs/TEST_CASES.md` TC-API-001에 신규 행 추가(D5): 001-12 시작예정일 형식 오류(`"2026-13-45"` → 400 "시작예정일 형식이 올바르지 않습니다"), 001-13 종료예정일 형식 오류(`"내일"` → 400 "종료예정일 형식이 올바르지 않습니다"), 001-14 빈 Backlog 첫 티켓 position = -1024, 001-15 한국 시간 자정 직후 오늘 날짜 종료예정일 허용, 001-16 파싱 불가·비객체 본문 → 400 "제목을 입력해주세요", 001-17 시스템 필드(status, position, startedAt, completedAt) 무시
- [X] T004 [P] `src/shared/constants.ts` 신규 생성: `export const TIMEZONE = 'Asia/Seoul';`, `export const POSITION_GAP = 1024;` (data-model "공유 상수·헬퍼")
- [X] T005 [P] `__tests__/helpers/testDb.ts` 신규 생성: `assertTestDatabase()` — `process.env.DATABASE_URL`의 DB 이름이 `tika_test`가 아니면 throw, `clearBacklog()` — `assertTestDatabase()` 후 `db.delete(tickets).where(eq(tickets.status, 'BACKLOG'))` 실행. 다른 삭제 함수는 만들지 않는다(constitution 가드레일, research §7)

**Checkpoint**: docs가 spec 결정과 일치하고, 공용 상수·테스트 헬퍼가 준비됨

---

## Phase 2: Foundational (에러 처리 구조 — 모든 스토리의 선행 조건)

**Purpose**: 모든 실패 경로가 `{ error: { code, message } }`를 반환하도록 middleware를 만들고 라우트를 "파싱 → 검증 → 서비스 → 응답" 구조로 바꾼다(G4, G5, G6).

**⚠️ CRITICAL**: 이 phase가 끝나야 사용자 스토리 작업을 시작한다.

- [X] T006 [P] RED: `__tests__/services/validate.test.ts` 작성 — `validate(schema, input)`가 성공 시 파싱된 데이터를 반환하고, 실패 시 `ValidationError`를 throw하며 그 `message`가 Zod 첫 issue의 메시지와 같은지 검증. `npm test -- __tests__/services/validate.test.ts`로 실패 확인
- [X] T007 [P] RED: `__tests__/services/errorHandler.test.ts` 작성 — `handleError(new ValidationError('제목을 입력해주세요'))` → 상태 400, 본문 `{ error: { code: 'VALIDATION_ERROR', message: '제목을 입력해주세요' } }`; `handleError(new Error('relation "tickets" does not exist'))` → 상태 500, 본문 `{ error: { code: 'INTERNAL_ERROR', message: '서버 내부 오류' } }`이고 본문 문자열에 원본 메시지·스택이 없음. 실패 확인
- [X] T008 GREEN: `src/server/middleware/validate.ts` 생성 — `export class ValidationError extends Error`, `export function validate<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T>` (실패 시 `result.error.issues[0].message`로 `ValidationError` throw). T006 통과 확인
- [X] T009 GREEN: `src/server/middleware/errorHandler.ts` 생성 — `export function handleError(error: unknown): NextResponse`: `ValidationError` → 400 `VALIDATION_ERROR`, 그 외 → `console.error(error)` 후 500 `INTERNAL_ERROR` + "서버 내부 오류". `TICKET_NOT_FOUND`는 만들지 않는다. T007 통과 확인
- [X] T010 RED: `__tests__/api/tickets.test.ts`에 "요청 본문 처리" describe 추가 — JSON이 아닌 본문(`'not-json'`), `null`, 배열(`[]`), 문자열(`"hello"`)을 보내면 각각 400 + `VALIDATION_ERROR` + "제목을 입력해주세요"(TC 001-16). 본문을 문자열 그대로 보내는 `createRawRequest(raw: string)` 헬퍼 추가. 실패 확인
- [X] T011 GREEN: `app/api/tickets/route.ts` 재구성 — `request.json()`을 try/catch로 감싸 실패하거나 결과가 순수 객체가 아니면 `{}` 사용(타입은 `unknown`), `validate(createTicketSchema, body)` → `createTicket(data)` → `NextResponse.json(ticket, { status: 201 })`, 전체를 try/catch로 감싸 `handleError(error)` 반환. 라우트에 비즈니스 로직·에러 매핑 코드를 두지 않는다(constitution V). T010과 기존 API 테스트 전부 통과 확인

**Checkpoint**: 모든 실패 경로가 통일된 에러 형식. 기존 API 테스트 6개 포함 전부 통과

---

## Phase 3: User Story 1 - 제목만으로 할 일 빠르게 등록 (Priority: P1) 🎯 MVP

**Goal**: 제목만으로 만든 티켓이 Backlog 맨 위(빈 칼럼이면 position −1024)에 BACKLOG·MEDIUM·시작일/종료일 null로 생성된다(FR-001, 004, 007~011, G1).

**Independent Test**: `npm test -- __tests__/services/ticketService.test.ts __tests__/api/tickets.test.ts` 중 US1 describe가 통과하면 단독으로 검증된다.

### Tests for User Story 1 ⚠️ (먼저 작성, 실패 확인)

- [X] T012 [P] [US1] RED: `__tests__/services/ticketService.test.ts` 신규 — (1) `clearBacklog()` 후 `createTicket({ title: '첫 티켓' })`의 position이 `-1024`, (2) 이어서 하나 더 만들면 position이 `-2048`(= 이전 최솟값 − 1024), (3) 반환값의 status `'BACKLOG'`, priority `'MEDIUM'`, startedAt·completedAt `null`. `__tests__/helpers/testDb.ts`(T005)만으로 정리. 실패 확인((1)이 현재 0이라 실패해야 함)
- [X] T013 [US1] RED: `__tests__/api/tickets.test.ts`에 US1 describe 추가 — (a) 빈 Backlog(`clearBacklog()`)에서 생성 → 201, `position === -1024`(TC 001-14), (b) 연속 2개 생성 → 나중 티켓의 position이 더 작음(TC 001-10, 특성화), (c) `{ title, status: 'DONE', position: 5, startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:00:00Z' }` → 201, status `'BACKLOG'`, startedAt·completedAt `null`, position ≠ 5(TC 001-17), (d) 응답에 `id`, `position`, `createdAt`, `updatedAt`이 있고 createdAt·updatedAt이 ISO 8601 문자열(FR-011). (a) 실패 확인

### Implementation for User Story 1

- [X] T014 [US1] GREEN: `src/server/services/ticketService.ts` 수정 — `const position = (minPosition ?? 0) - POSITION_GAP;` (`POSITION_GAP`은 `@/shared/constants`에서 import). 그 외 로직 변경 없음. T012·T013 통과 확인

**Checkpoint**: US1 단독으로 완전히 동작·검증됨 (MVP)

---

## Phase 4: User Story 2 - 잘못된 입력은 거부하고 이유를 알려줌 (Priority: P2)

**Goal**: 모든 잘못된 입력이 정해진 한국어 메시지와 함께 400으로 거부되고 아무것도 저장되지 않는다. "오늘"은 Asia/Seoul 기준(FR-002, 003, 006, 012, 013, 016, G2, G3).

**Independent Test**: `npm test -- __tests__/services/ticketValidation.test.ts __tests__/api/tickets.test.ts`의 US2 describe 통과.

### Tests for User Story 2 ⚠️ (먼저 작성, 실패 확인)

- [X] T015 [P] [US2] RED: `__tests__/services/ticketValidation.test.ts` 신규(DB 사용 안 함) — (1) `getTodayInSeoul(new Date('2026-03-10T15:30:00Z')) === '2026-03-11'`, `getTodayInSeoul(new Date('2026-03-10T14:59:59Z')) === '2026-03-10'`; (2) `jest.useFakeTimers().setSystemTime(new Date('2026-03-10T15:30:00Z'))` 상태에서 `createTicketSchema.safeParse({ title: 'a', dueDate: '2026-03-11' })` 성공, `dueDate: '2026-03-10'` 실패 + "종료예정일은 오늘 이후 날짜를 선택해주세요"(TC 001-15, 테스트 후 `jest.useRealTimers()`); (3) `plannedStartDate`가 `'2026-13-45'`, `'2026-02-30'`, `'2026/03/01'`이면 "시작예정일 형식이 올바르지 않습니다", `'2028-02-29'`는 성공; (4) `dueDate: '내일'` → "종료예정일 형식이 올바르지 않습니다"(오늘 이후 메시지가 아니라 형식 메시지가 첫 issue); (5) 타입 오류: `title: 123` → "제목을 입력해주세요", `description: 5` → "설명은 1000자 이내로 입력해주세요", `dueDate: 20991231` → "종료예정일 형식이 올바르지 않습니다". 실패 확인
- [X] T016 [US2] RED: `__tests__/api/tickets.test.ts`에 US2 describe 추가(T013 다음, 같은 파일) — 누락된 TC 보강: 001-4 `{ title: '' }`, 001-5 `{ title: '   ' }` → "제목을 입력해주세요", 001-7 `description: 'a'.repeat(1001)` → "설명은 1000자 이내로 입력해주세요", 001-12 `plannedStartDate: '2026-13-45'`, 001-13 `dueDate: '내일'` → 각 형식 메시지. 경계값: 제목 정확히 200자·설명 정확히 1000자 → 201. 거부 시 미저장: 고유한 제목(예: `'거부-' + Date.now()`)에 잘못된 우선순위를 붙여 보낸 뒤 그 제목의 행이 0개인지 DB로 확인(FR-012). 모든 400 응답의 `error.code === 'VALIDATION_ERROR'`. 형식 오류 케이스 실패 확인

### Implementation for User Story 2

- [X] T017 [US2] GREEN: `src/shared/validations/ticket.ts` 수정 — (1) `export function getTodayInSeoul(now: Date = new Date()): string` (`Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)`); (2) 내부 `isValidCalendarDate(s)` — `new Date(`${s}T00:00:00Z`)`가 Invalid Date면 false, 아니면 `toISOString().slice(0, 10) === s`; (3) 내부 `dateString(message)` = `z.string({ invalid_type_error: message }).regex(/^\d{4}-\d{2}-\d{2}$/, message).refine(isValidCalendarDate, message)`; (4) 필드 규칙(data-model 표 그대로): title "1~200자, 공백만 불가" + `invalid_type_error: '제목을 입력해주세요'`, description "최대 1000자" + `invalid_type_error: '설명은 1000자 이내로 입력해주세요'`, priority `LOW | MEDIUM | HIGH`(기존 errorMap 유지), plannedStartDate `dateString('시작예정일 형식이 올바르지 않습니다').optional()`, dueDate `dateString('종료예정일 형식이 올바르지 않습니다')` + "오늘 이후" refine(형식이 틀리면 `true`를 반환해 형식 메시지만 남김, 비교 기준은 `getTodayInSeoul()`) `.optional()`; (5) `toISOString().split('T')[0]` 기반 오늘 계산 제거. `createTicketSchema`·`CreateTicketInput` export 이름 유지. T015·T016 통과 확인

**Checkpoint**: US1 + US2 모두 단독 검증 통과

---

## Phase 5: User Story 3 - 등록하면서 상세 정보까지 설정 (Priority: P3)

**Goal**: 선택 필드를 모두 채운 티켓이 값 그대로 생성되고, 오늘 날짜 종료예정일·과거 시작예정일·시작 > 종료 입력이 허용된다(FR-001, 005, 006, 014).

**Independent Test**: `npm test -- __tests__/api/tickets.test.ts`의 US3 describe 통과.

### Tests for User Story 3 ⚠️

- [X] T018 [US3] RED(특성화): `__tests__/api/tickets.test.ts`에 US3 describe 추가 — (a) 전체 필드(기존 "모든 필드" 테스트를 이 describe로 옮기지 말고 그대로 두고 참조만), (b) `dueDate: getTodayInSeoul()` → 201(TC 001-15의 API 수준 확인), (c) `plannedStartDate: '2020-01-01'` → 201, (d) `plannedStartDate: '2099-03-20', dueDate: '2099-03-10'` → 201(FR-014). `getTodayInSeoul`은 `@/shared/validations/ticket`에서 import. US2 완료 후라면 처음부터 통과할 수 있음 — 실패하면 T019 진행

### Implementation for User Story 3

- [X] T019 [US3] GREEN(필요 시): T018이 실패한 경우에만 `src/shared/validations/ticket.ts`를 수정해 통과시킨다(새 검증 규칙 추가 금지 — 특히 시작·종료 순서 검사는 넣지 않는다, FR-014). 통과했다면 변경 없이 완료 표시

**Checkpoint**: 모든 사용자 스토리 단독 검증 통과

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 동작 변경 없는 정리와 완료 조건 확인

- [X] T020 Refactor: `app/api/tickets/route.ts`, `src/server/middleware/*.ts`, `src/server/services/ticketService.ts`, `src/shared/validations/ticket.ts`의 중복·이름을 정리(동작 변경·기능 추가 금지). `npm test`가 계속 통과하는지 확인
- [X] T021 [P] `CLAUDE.md` §1 "현재 상태"의 "FR-001은 … `specs/` 산출물이 없습니다" 문장을 "FR-001은 `specs/001-create-ticket/`으로 소급 명세·보정됨"으로 갱신(사용자 확인 후)
- [X] T022 완료 조건 실행: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run format:check` — 모두 통과해야 완료(constitution 품질 게이트). 실패 시 해당 GREEN/Refactor 작업으로 돌아간다
- [X] T023 [specs/001-create-ticket/quickstart.md](./quickstart.md) §3 수동 확인(선택, `npm run dev` + curl). `tika_dev`에 남은 데이터는 사용자 승인 없이 지우지 않는다

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 즉시 시작 가능. T001~T003은 사용자 승인 필요
- **Foundational (Phase 2)**: T004(constants)는 필요 없지만 T005 이후 진행 권장. 모든 스토리를 막음
- **US1 (Phase 3)**: Phase 2 완료 후. T012는 T004·T005에 의존
- **US2 (Phase 4)**: Phase 2 완료 후. T017은 T004에 의존. T016은 같은 파일(T013) 때문에 US1 이후에 작성
- **US3 (Phase 5)**: US2(T017) 이후 — 날짜 검증 결과에 의존
- **Polish (Phase 6)**: 모든 스토리 완료 후

### Story Dependencies

- **US1 (P1)**: 다른 스토리에 의존하지 않음
- **US2 (P2)**: 기능상 독립. 단 `__tests__/api/tickets.test.ts`를 US1과 공유하므로 작성은 순차
- **US3 (P3)**: US2의 날짜 검증(T017)에 의존

### 작업 단위 의존성

```text
T001,T002,T003 (docs, 승인) ─┐
T004 ──────────────┬─────────┼─► T014, T017
T005 ──────────────┼─► T012, T013
T006 ─► T008 ─┐    │
T007 ─► T009 ─┼─► T011 ─► (US1) T012,T013 ─► T014
T010 ─────────┘           (US2) T015,T016 ─► T017 ─► (US3) T018 ─► T019
                                                     └► T020 ─► T021,T022 ─► T023
```

### Within Each User Story

- RED(테스트) → 실패 확인 → GREEN(구현) → 통과 확인
- 같은 파일을 건드리는 작업은 순차(특히 `__tests__/api/tickets.test.ts`: T010 → T013 → T016 → T018)

---

## Parallel Example

```bash
# Phase 1: 서로 다른 파일
Task: "T001 docs/REQUIREMENTS.md 수정"
Task: "T002 docs/API_SPEC.md 수정"
Task: "T003 docs/TEST_CASES.md 수정"
Task: "T004 src/shared/constants.ts 생성"
Task: "T005 __tests__/helpers/testDb.ts 생성"

# Phase 2: middleware 테스트 두 개
Task: "T006 __tests__/services/validate.test.ts"
Task: "T007 __tests__/services/errorHandler.test.ts"

# US1·US2 사이: 서로 다른 테스트 파일
Task: "T012 [US1] __tests__/services/ticketService.test.ts"
Task: "T015 [US2] __tests__/services/ticketValidation.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 (docs 승인 포함) → Phase 2 → Phase 3(US1)
2. **STOP and VALIDATE**: `npm test` — 에러 형식 통일 + 빈 칼럼 −1024가 확인되면 MVP 완료

### Incremental Delivery

1. Setup + Foundational → 모든 실패 경로가 `{ error }` 형식
2. US1 → 생성 위치·기본값 보정
3. US2 → Asia/Seoul "오늘", 날짜 형식·유효성, 타입 오류 메시지
4. US3 → 선택 필드 조합 확인
5. Polish → 품질 게이트

### 구현 후

이 기능은 기존 코드 보정이므로, `/speckit-implement` 완료 후 `/speckit-converge`로 spec·plan과 남은 차이가 없는지 확인한다.

---

## Notes

- [P] = 다른 파일, 끝나지 않은 작업에 의존하지 않음
- RED 작업에서 테스트가 예상과 달리 통과하면(특성화 표시가 없는 경우) 멈추고 원인을 보고한다 — 테스트가 잘못됐거나 이미 구현된 것이다
- 각 작업 또는 논리적 묶음마다 커밋(커밋은 사용자가 WSL 터미널에서 직접 수행)
- 명세에 없는 동작(시작·종료 순서 검사, 새 에러 코드, 새 메시지 등)을 추가하지 않는다
