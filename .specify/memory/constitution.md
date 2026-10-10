<!--
Sync Impact Report
==================
Version change: (template, unversioned) → 1.0.0
Bump rationale: 최초 비준(initial ratification) — 템플릿 placeholder를 구체 원칙으로 대체

Modified principles:
  - [PRINCIPLE_1_NAME] → I. TypeScript Strict 모드 (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. API 계약 준수
  - [PRINCIPLE_3_NAME] → III. 통일된 에러 응답
  - [PRINCIPLE_4_NAME] → IV. Zod로 모든 요청 검증
  - [PRINCIPLE_5_NAME] → V. 비즈니스 로직은 서비스 계층에

Added sections:
  - 추가 제약 (Technical Constraints)
  - 개발 워크플로 & 품질 게이트

Removed sections: 없음

Templates requiring updates:
  - .specify/templates/plan-template.md ✅ 변경 불필요 (Constitution Check는 런타임에 이 파일을 읽음)
  - .specify/templates/spec-template.md ✅ 변경 불필요
  - .specify/templates/tasks-template.md ✅ 변경 불필요

Follow-up TODOs: 없음

NOTE: 이 주석은 개정 검토용 임시 자료이며, 커밋 전에 삭제한다.
-->

# Tika Constitution

## Core Principles

### I. TypeScript Strict 모드 (NON-NEGOTIABLE)

- `tsconfig.json`의 `strict: true`는 MUST 유지하며, 끄거나 개별 strict 플래그를 비활성화해서는
  MUST NOT 된다.
- 타입 검사를 우회하는 `any`, `@ts-ignore`, `@ts-expect-error`는 같은 줄 또는 바로 위에 사유를
  주석으로 남긴 경우에만 허용한다. 사유 없는 우회는 리뷰에서 거부한다.
- `npx tsc --noEmit` 통과는 모든 작업의 완료 조건이다.

**Rationale**: `src/shared/`의 타입이 서버·클라이언트 간 계약 역할을 하므로, 계약 위반을 런타임이
아닌 컴파일 단계에서 잡기 위함이다.

### II. API 계약 준수

- 모든 API 응답(성공 응답 본문 구조, 필드명, HTTP 상태 코드)은 `docs/API_SPEC.md`를 MUST 정확히
  따른다. 상태 코드는 명세의 용도대로만 사용한다(200 조회·수정, 201 생성, 204 삭제, 400 검증 실패,
  404 리소스 없음, 500 서버 오류).
- 명세에 없는 엔드포인트·응답 필드·쿼리 파라미터를 추가해서는 MUST NOT 된다.
- 계약 변경이 필요하면 코드보다 먼저 `docs/API_SPEC.md`를 수정(사용자 승인 필요)한 뒤 구현에
  반영한다.
- API 테스트는 응답 본문과 상태 코드가 명세와 일치하는지 MUST 검증한다.

**Rationale**: 프론트엔드(`ticketApi.ts`)와 백엔드가 같은 문서를 기준으로 독립적으로 개발·테스트할
수 있도록 단일 계약을 유지하기 위함이다.

### III. 통일된 에러 응답

- 모든 에러 응답은 MUST `{ error: { code, message } }` 형식이다. 다른 형태(문자열 본문, 최상위
  `message`, 배열 등)는 MUST NOT 사용한다.
- `code`는 `docs/API_SPEC.md` 에러 코드 표의 값만 사용한다: `VALIDATION_ERROR`(400),
  `TICKET_NOT_FOUND`(404), `INTERNAL_ERROR`(500). 새 코드는 명세에 먼저 추가한 뒤에만 사용한다.
- `message`는 `docs/REQUIREMENTS.md`·`docs/API_SPEC.md`의 한국어 문구를 그대로 사용한다.
- 스택 트레이스, SQL·DB 드라이버 오류 등 내부 정보를 응답에 노출해서는 MUST NOT 된다.

**Rationale**: 클라이언트가 단일 분기로 에러를 처리하고, 사용자에게 일관된 한국어 메시지를 보여주기
위함이다.

### IV. Zod로 모든 요청 검증

- 모든 요청 입력(body, path parameter, query parameter)은 서비스 호출 전에 MUST Zod 스키마로
  검증한다.
- 검증 스키마는 `src/shared/validations/`에만 정의하며, 클라이언트 폼과 서버 라우트가 MUST 같은
  스키마를 공유한다. 같은 규칙을 다른 곳에 중복 정의해서는 MUST NOT 된다.
- 검증 실패는 `VALIDATION_ERROR`(400)로 응답한다.
- 검증되지 않은 원시 입력을 서비스 계층에 전달해서는 MUST NOT 된다.

**Rationale**: 단일 스키마로 클라이언트·서버 검증 규칙이 어긋나는 것을 막고, 서비스 계층이 항상
타입이 보장된 입력만 다루도록 하기 위함이다.

### V. 비즈니스 로직은 서비스 계층에

- 비즈니스 규칙(상태 전이와 `startedAt`/`completedAt` 설정, position 계산·재정렬, `isOverdue` 계산,
  Done 칼럼 24시간 필터 등)은 MUST `src/server/services/`에만 구현한다.
- Route Handler(`app/api/**/route.ts`)는 요청 파싱 → Zod 검증 → 서비스 호출 → 응답 변환만 수행하며,
  비즈니스 로직을 포함해서는 MUST NOT 된다.
- `src/server/` ↔ `src/client/` 간 import는 MUST NOT 하며, 공용 코드는 `src/shared/`에만 둔다.
- 서비스는 named export 함수로 작성하고, 서비스 단위 테스트로 규칙을 검증한다.

**Rationale**: HTTP 계층과 도메인 규칙을 분리해 규칙을 독립적으로 테스트하고, 라우트 간 로직 중복을
막기 위함이다.

## 추가 제약 (Technical Constraints)

- **기술 스택**: Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS 4, @dnd-kit,
  PostgreSQL + Drizzle ORM(`pg`), Zod 3, Jest 29 + Testing Library. 스택 변경은 `docs/TRD.md`
  수정과 사용자 승인을 거친다.
- **명세 우선순위**: 이 constitution → `docs/`(Source of truth) → `specs/NNN-*/`. 기능 spec/plan이
  `docs/`와 충돌하면 `docs/`를 먼저 수정(사용자 승인)한 뒤 spec에 반영한다.
- **범위 통제**: 명세에 없는 기능을 추가해서는 MUST NOT 된다. 구현 중 명세 오류·누락을 발견하면
  작업을 멈추고 명세 수정을 먼저 제안한다.
- **시간대**: "오늘"·"현재 시각" 판정은 모두 `Asia/Seoul` 기준이다.
- **클라이언트 API 호출**: 컴포넌트의 모든 API 호출은 `src/client/api/ticketApi.ts`를 거치며,
  컴포넌트에서 직접 `fetch`해서는 MUST NOT 된다.
- **파생 필드**: `isOverdue` 같은 파생 값은 조회 시 계산하며 DB에 저장하지 않는다.

## 개발 워크플로 & 품질 게이트

- **SDD 순서**: constitution → specify → (clarify) → plan → tasks → (analyze) → implement.
  각 단계 사이에는 MUST 사용자 리뷰·승인을 받는다.
- **spec 단계**는 무엇/왜만 기술하고 기술 결정은 plan 단계에서 한다. spec 요구사항은
  `docs/REQUIREMENTS.md`의 FR/US ID로 추적 가능해야 한다.
- **TDD**: tasks는 각 단위마다 테스트 작성(RED)이 구현(GREEN)보다 앞서도록 작성한다.
  RED 단계에서는 테스트만, GREEN 단계에서는 테스트를 통과하는 최소 코드만, Refactor 단계에서는
  동작 변경 없이 개선만 한다. 테스트가 실패하면 구현을 고치며 테스트를 고쳐서는 MUST NOT 된다
  (명세 오류라면 명세를 먼저 수정). 테스트 케이스는 `docs/TEST_CASES.md`를 기준으로 한다.
- **완료 조건(Quality Gates)**: `npm test`, `npx tsc --noEmit`, `npm run lint`가 모두 통과해야
  작업을 완료로 본다.

## Governance

- 이 constitution은 프로젝트의 다른 모든 관행·가이드보다 우선한다. 충돌 시 이 문서를 따른다.
- **개정 절차**: 변경 제안 → 사용자 승인 → `/speckit-constitution`으로 반영(Sync Impact Report 작성)
  → 버전 갱신. 원칙과 충돌하는 기존 코드가 있으면 개정과 함께 마이그레이션 계획을 기록한다.
- **버전 정책**(Semantic Versioning):
  - MAJOR: 원칙 삭제 또는 하위 호환되지 않는 재정의
  - MINOR: 원칙·섹션 추가 또는 지침의 실질적 확장
  - PATCH: 문구 명확화, 오타 수정 등 의미 변화 없는 수정
- **준수 점검**: `/speckit-plan`의 Constitution Check와 `/speckit-analyze`에서 모든 원칙 준수 여부를
  확인한다. 원칙 위반이 불가피하면 plan의 Complexity Tracking에 사유를 기록하고 사용자 승인을 받는다.
- 일상적인 개발 가이드(명령어, 디렉토리 구조, 도메인 규칙 세부)는 `CLAUDE.md`를 참고한다.

**Version**: 1.0.0 | **Ratified**: 2026-10-10 | **Last Amended**: 2026-10-10
