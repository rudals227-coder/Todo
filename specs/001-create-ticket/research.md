# Research: 티켓 생성 (POST /api/tickets)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-10

Technical Context에 NEEDS CLARIFICATION은 없다(스택은 constitution·TRD로 확정). 아래는 spec 결정을
구현으로 옮기기 위해 내린 기술 결정과, 현재 구현(SDD 이전 TDD 산출물)과의 차이 분석이다.

---

## 0. 현재 구현 차이 분석 (Gap Analysis)

| # | 위치 | 현재 | spec/constitution 기준 | 근거 |
|---|------|------|------------------------|------|
| G1 | `ticketService.ts` | 빈 Backlog → position `0` | `-1024` | spec FR-008 |
| G2 | `validations/ticket.ts` | "오늘" = `new Date().toISOString()` (UTC) | Asia/Seoul 날짜 | spec FR-006, constitution 추가 제약 |
| G3 | `validations/ticket.ts` | 날짜 regex에 메시지 없음(영어 기본 메시지), 달력상 없는 날짜(`2026-13-45`) 통과 → DB 오류로 500 | 필드별 한국어 메시지, 400 | spec FR-013, constitution III |
| G4 | `route.ts` | `request.json()` 실패 시 예외 → 형식 없는 500 | `{ error: { code, message } }` | constitution III |
| G5 | `route.ts` | 서비스/DB 예외 미처리 → 형식 없는 500, 내부 정보 노출 가능 | `INTERNAL_ERROR` 500, 내부 정보 미노출 | constitution III, spec FR-015 |
| G6 | `route.ts` | 검증·에러 매핑 로직을 라우트에 직접 작성 | TRD §3의 `middleware/validate.ts`, `errorHandler.ts` 사용 | TRD, constitution V |
| G7 | 테스트 | TC-API-001 11개 중 6개만 작성(001-4, 5, 7, 10, 11 일부 누락), 빈 칼럼·시간대·형식 오류 테스트 없음 | TC-API-001 전체 + 신규 케이스 | constitution II, spec SC-003 |

---

## 1. "오늘"을 Asia/Seoul 기준으로 계산하는 방법

- **Decision**: `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' })`로 `YYYY-MM-DD` 문자열을 만드는
  순수 함수 `getTodayInSeoul(now: Date = new Date()): string`을 `src/shared/validations/ticket.ts`에
  두고 export한다. 시간대 문자열 `'Asia/Seoul'`은 `src/shared/constants.ts`의 `TIMEZONE` 상수로 둔다.
- **Rationale**: 추가 의존성이 없고, 브라우저(클라이언트 폼)와 Node(서버) 양쪽에서 같은 결과를 낸다.
  `en-CA` 로케일은 ISO와 같은 `YYYY-MM-DD` 형식을 낸다. `now`를 인자로 받아 시간 경계를 단위 테스트할
  수 있다. 날짜 문자열끼리는 사전순 비교가 곧 날짜 비교라서 기존 `>=` 비교를 유지할 수 있다.
- **Alternatives considered**:
  - `date-fns-tz`/`dayjs` — 함수 하나를 위해 의존성 추가는 과함(constitution 기술 스택 변경 절차 필요).
  - UTC+9 고정 오프셋 계산 — 한국은 서머타임이 없어 결과는 같지만, 의도가 덜 드러나고 TZ 상수와 연결되지 않음.
  - `src/shared/utils/date.ts` 신설 — TRD §3 디렉토리 구조에 없는 폴더라서 보류. 이후 `isOverdue`(보드 조회)에서도
    필요해지면 그때 TRD를 고쳐 분리한다.

## 2. 날짜 형식·유효성 검증

- **Decision**: 두 날짜 필드에 공통 헬퍼 `dateString(message)`를 만든다:
  `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message).refine(isValidCalendarDate, message)`.
  `isValidCalendarDate`는 `new Date(`${s}T00:00:00Z`)`가 Invalid Date면 `false`(`toISOString()`이 throw하므로
  먼저 확인), 아니면 다시 `YYYY-MM-DD`로 바꿨을 때 원래 문자열과 같은지로 판정한다(`2026-02-30` 같은 넘침
  날짜를 걸러냄). `dueDate`는 그 뒤에 "오늘 이후" refine을 붙인다.
- **Rationale**: 형식은 맞지만 달력에 없는 날짜가 DB까지 가면 PostgreSQL 오류(500)가 된다. 검증 단계에서
  400으로 막아야 constitution IV("검증 안 된 입력은 서비스로 넘기지 않음")를 지킨다.
- **Message order**: Zod는 스키마 키 순서대로 issue를 쌓고, 라우트는 `issues[0].message`를 쓴다.
  형식 오류가 있는 `dueDate`는 형식 메시지가 먼저 나오도록, 과거 날짜 refine은 형식이 맞을 때만 판정한다
  (형식이 틀리면 `true` 반환).
- **타입 오류 메시지**: 문자열이 아닌 값(`title: 123`, `dueDate: 20260101` 등)이 오면 Zod 기본 메시지
  "Expected string, received number"(영어)가 나간다. 각 필드에 `invalid_type_error`를 같은 필드의 기존 메시지로
  지정한다(title → "제목을 입력해주세요", description → "설명은 1000자 이내로 입력해주세요",
  날짜 → 해당 필드 형식 오류 메시지). 새 문구를 만들지 않는다.
- **Alternatives considered**: `z.string().date()`(Zod 3.23+) — 메시지 커스텀은 되지만 프로젝트의 `zod ^3.23.0`
  하한에서만 보장되고 동작(윤년 등) 확인 비용이 있어 명시적 헬퍼를 택함.

## 3. 빈 칼럼 첫 티켓 position

- **Decision**: `position = (minPosition ?? 0) - 1024`.
- **Rationale**: spec FR-008("비어 있으면 0을 기준") 그대로. 분기 없이 한 식으로 표현된다.
- **Note**: 동시에 두 요청이 들어오면 같은 position이 나올 수 있다. 단일 사용자 앱이고 순서 충돌은 DnD 재정렬
  규칙(DATA_MODEL §5.5)이 흡수하므로 트랜잭션 잠금은 도입하지 않는다.

## 4. 요청 본문 파싱 실패와 비객체 본문

- **Decision**: `request.json()`이 실패하거나 결과가 순수 객체가 아니면(배열, `null`, 문자열 등) 빈 객체 `{}`로
  간주하고 같은 스키마 검증을 거친다. 결과적으로 `VALIDATION_ERROR` 400 + "제목을 입력해주세요"가 된다.
- **Rationale**: 새 에러 코드·메시지를 만들지 않고(constitution III: 코드는 명세의 3개만) 일관된 형식을 보장한다.
  비객체를 그대로 Zod에 넘기면 "Expected object, received null" 같은 영어 메시지가 나간다.
- **Alternatives considered**: 전용 메시지("요청 형식이 올바르지 않습니다") — docs에 없는 문구를 새로 정해야 해서
  보류. docs에는 이 처리 규칙을 한 줄 추가한다(docs 작업 D4).

## 5. 에러 처리 구조 (Route Handler / middleware / service 분리)

- **Decision**:
  - `src/server/middleware/validate.ts`: `validate(schema, input)` → 성공 시 데이터, 실패 시 `ValidationError`
    (첫 issue 메시지 보관)를 throw.
  - `src/server/middleware/errorHandler.ts`: `handleError(error): NextResponse` — `ValidationError` → 400
    `VALIDATION_ERROR`, 그 외 → 500 `INTERNAL_ERROR` + 메시지 "서버 내부 오류"(API_SPEC 에러 코드 표의 문구),
    원본 오류는 `console.error`로만 남김. `TICKET_NOT_FOUND`(404)는 이 기능에서 쓰지 않으므로 지금 만들지 않는다.
  - `app/api/tickets/route.ts`: 본문 파싱 → `validate` → `createTicket` → 201, 전체를 `try/catch`로 감싸
    `handleError`에 위임.
  - `src/server/services/ticketService.ts`: 순서 계산 + 저장만. HTTP를 모른다.
- **Rationale**: TRD §3이 정의한 파일에 책임을 나눠 constitution V(라우트는 파싱→검증→호출→응답만)를 지키고,
  이후 PATCH/DELETE 등 다른 라우트가 그대로 재사용할 수 있다.
- **Alternatives considered**: 라우트마다 인라인 처리(현재 방식) — 라우트 7개에서 중복되고 형식이 어긋날 위험.

## 6. 시스템 관리 필드 무시

- **Decision**: 스키마에 없는 키(`status`, `position`, `startedAt` 등)는 Zod 기본 동작(strip)으로 제거한다.
  `.strict()`를 쓰지 않는다.
- **Rationale**: spec Edge Case("보내더라도 반영되지 않는다")는 거부가 아니라 무시를 요구한다.

## 7. 테스트 전략과 DB 정리

- **Decision**:
  - API 테스트(`__tests__/api/tickets.test.ts`): TC-API-001 전체 + 신규(형식 오류 2, 빈 칼럼 −1024, 비객체 본문,
    시스템 필드 무시, 경계값 200/1000자).
  - 서비스 테스트(`__tests__/services/ticketService.test.ts`): position 계산(빈 칼럼 / 기존 티켓 있음).
  - 시간대 단위 테스트(`__tests__/services/ticketValidation.test.ts`): `getTodayInSeoul`에 고정 시각을 넣어
    KST 자정 경계(UTC 15:00) 검증. 백엔드 Jest 프로젝트의 testMatch가 `api/`·`services/`만 보므로 여기에 둔다.
  - 빈 칼럼 테스트의 사전 정리: `tika_test`에서만, `WHERE status = 'BACKLOG'` 조건이 있는 삭제로 한다.
    정리 헬퍼는 실행 전에 연결 DB 이름이 `tika_test`인지 확인하고 아니면 throw한다.
- **Rationale**: constitution 가드레일 — `TRUNCATE`·`WHERE` 없는 `DELETE` 금지, 테스트 DB 예외는 `tika_test` 한정.
  DB 이름 확인으로 `.env.local`(tika_dev)을 잘못 읽는 사고를 막는다.

## 8. docs 수정 범위 (코드보다 먼저)

| ID | 파일 | 수정 |
|----|------|------|
| D1 | `docs/REQUIREMENTS.md` 28행 | "칼럼에 티켓이 없을 경우 position = 0" → "−1024 (0을 기준으로 −1024)" |
| D2 | `docs/REQUIREMENTS.md` FR-001 메시지 표, `docs/API_SPEC.md` §1 에러 표 | 날짜 형식 오류 메시지 2개 추가 |
| D3 | `docs/API_SPEC.md` 생성 스키마 | 날짜 regex 메시지·달력 유효성 refine, "오늘"을 Asia/Seoul로 계산하도록 예시 수정 |
| D4 | `docs/API_SPEC.md` §1 처리 규칙 | 파싱 불가·비객체 본문은 빈 객체로 간주(→ 제목 누락 메시지) 한 줄 추가 |
| D5 | `docs/TEST_CASES.md` TC-API-001 | 001-12~ 신규 케이스 추가(형식 오류 2, 빈 칼럼 −1024, KST 경계, 비객체 본문, 시스템 필드 무시) |
