# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 상태

**아직 애플리케이션 코드가 존재하지 않습니다.** 이 저장소에는 현재 `docs/` 디렉토리만 있으며, 1인 사용자용 칸반 TODO 앱 "Tika"의 전체 스펙 문서 세트입니다. `package.json`도 없고, git 저장소도 초기화되지 않았으며, 소스 트리도 없습니다. 첫 구현 작업은 아래 설명된 Next.js 프로젝트를 스캐폴딩하고 TRD에 따른 디렉토리 구조를 구축하는 것이며, 그 이후에 기능 구현이 가능합니다.

아직 코드가 없으므로 검증된 빌드/린트/테스트 명령어는 없습니다. 프로젝트가 스캐폴딩되면(아래 스택대로 Next.js + Jest), 일반적으로 `npm run dev`, `npm run build`, `npm run lint`, 단일 테스트 파일 실행 시 `npm test` / `npm test -- <경로>` 형태가 될 것입니다 — 다만 이는 추측이므로 `package.json`이 생기면 실제 스크립트명을 확인해야 합니다.

## 참조 우선순위 (Source of truth)

`docs/` 디렉토리가 공식 스펙입니다. 기능을 구현하기 전에 추측하지 말고 관련 문서를 먼저 읽으세요:

- `docs/PRD.md` — 제품 범위, 사용자 시나리오, 고정 4칼럼 보드 레이아웃
- `docs/TRD.md` — 아키텍처, 디렉토리 구조, 계층 분리 규칙, 데이터 흐름
- `docs/REQUIREMENTS.md` — FR/NFR 상세, 검증 에러 메시지, 사용자 스토리, 추적 매트릭스
- `docs/DATA_MODEL.md` — Drizzle 스키마, TypeScript 타입, 비즈니스 규칙, 시드 데이터
- `docs/API_SPEC.md` — 요청/응답 형식, 에러 코드, Zod 스키마(검증 공용 소스)
- `docs/COMPONENT_SPEC.md` — 컴포넌트 트리, Props, 훅 인터페이스, 이벤트 흐름
- `docs/TEST_CASES.md` — TDD 테스트 케이스 정의(FR/US 추적 포함); 구현 전/함께 이 문서 기준으로 테스트 작성

문서는 한글로 작성되어 있으니, 코드에서 이름을 붙일 때도 용어를 일관되게 유지하세요 (예: "Backlog", "시작예정일"/plannedStartDate, "종료예정일"/dueDate, "시작일"/startedAt, "종료일"/completedAt).

## 아키텍처

Vercel 위에서 프론트엔드, API 라우트, Postgres(Neon)를 하나로 통합 운영하는 단일 Next.js 15(App Router) 프로젝트입니다 — 별도 백엔드 서버 없음. 하나의 프로젝트이지만, 프론트엔드와 백엔드는 디렉토리 단위로 엄격히 분리되며, 이는 도구가 아니라 import 방향 규칙으로 강제됩니다:

```
app/api/            → Route Handler만: 요청 파싱 → 서비스 호출 → 응답 반환
src/server/          → 백엔드 로직 (services, db, middleware) — src/client에서 import 금지
src/client/          → 프론트엔드 로직 (components, hooks, api fetch 래퍼) — src/server에서 import 금지
src/shared/          → 타입, Zod 검증 스키마, 상수 — 양쪽 모두 참조 가능한 유일한 영역
```

요청 흐름: `app/api/tickets/route.ts` → `src/server/services/ticketService.ts` → `src/server/db/schema.ts` (Drizzle) → Vercel Postgres. 이는 Router → Controller → Service → DB 구조와 동일하며, Route Handler가 Router+Controller 역할을 겸하므로 얇게 유지해야 합니다(비즈니스 로직 포함 금지).

양쪽 모두에 영향을 주는 변경(예: 새 필드 추가) 시에는 `src/shared/`를 먼저 수정한 뒤 서버와 클라이언트에 전파하세요. 컴포넌트에서의 모든 API 호출은 `src/client/api/ticketApi.ts`를 거쳐야 하며, 컴포넌트에서 직접 `fetch`를 호출해서는 안 됩니다. 모든 검증(클라이언트 폼 + 서버 라우트)은 `src/shared/validations/ticket.ts`의 동일한 Zod 스키마를 사용합니다.

### 데이터 모델 — 단일 엔티티

MVP는 단일 테이블 `tickets`만 존재합니다 (`users` 테이블 없음; 단일 사용자, 인증 없음). 항상 유지해야 할 핵심 구분: `plannedStartDate`/`dueDate`는 사용자가 입력하는 `DATE`이고, `startedAt`/`completedAt`은 시스템이 관리하는 `TIMESTAMP`로 사용자가 직접 수정할 수 없으며 오직 상태 전이의 부수효과로만 설정됩니다. 전체 스키마와 규칙은 `docs/DATA_MODEL.md` §4-5 참고; 특히 실수하기 쉬운 부분:

- 상태 전이 (`PATCH /api/tickets/reorder`): `TODO`로 이동 시 `startedAt = now()` 설정; `TODO → BACKLOG` 이동 시 `startedAt` 초기화; `DONE`에서 벗어나면 `completedAt` 초기화. `DONE`으로 이동하는 것은 별도 엔드포인트(`PATCH /api/tickets/:id/complete`)이며 `reorder`가 아님 — `reorder`는 `status`로 `DONE`이 오면 명시적으로 거부함.
- `position`은 실수형처럼 중간값 삽입(`(prev+next)/2`) 방식을 사용하며, 간격이 1 미만으로 좁아지면 해당 칼럼을 1024 간격으로 재정렬함.
- `isOverdue` (`dueDate < 오늘 && status !== DONE`)는 조회 시점에 계산되는 파생 필드이며, 절대 저장하지 않음.
- `DONE` 칼럼은 `completedAt` 기준 24시간 이내 티켓만 반환함 — 이 필터는 클라이언트가 아니라 보드 조회 API에서 서버 측에서 적용됨.
- 칼럼 이동 판정과 Done 칼럼 표시 여부 모두 `Asia/Seoul` 기준의 안정적인 "오늘"/"현재 시각" 정의가 필요함.

### API 구성

`/api/tickets` 하위에 7개 엔드포인트가 있으며, 각 부수효과를 담당하는 엔드포인트는 `docs/API_SPEC.md`에 정리되어 있습니다. 헷갈리기 쉬운 라우팅 규칙 하나(`COMPONENT_SPEC.md` §5.1에도 명시): 프론트엔드는 드롭 대상에 따라 분기해야 하며, `DONE`으로 드롭하면 항상 `complete`를 호출하고, 그 외 모든 드롭(`DONE`에서 벗어나는 이동 포함)은 `reorder`를 호출해야 합니다. 이 분기를 잘못 처리하는 것이 드래그앤드롭에서 가장 흔한 버그입니다.

### 프론트엔드 상태 관리

Redux/Zustand 없이, 모든 CRUD + DnD 호출을 담당하는 단일 `useTickets` 훅(`src/client/hooks/useTickets.ts`)에서 순수 `useState`/`useReducer`로 관리합니다. 드래그앤드롭(`@dnd-kit`)은 낙관적 업데이트 방식입니다: 로컬 보드 상태를 즉시 반영한 뒤 API를 호출하고, 실패 시 드래그 이전 스냅샷으로 롤백합니다. 필터링("이번주 업무", "일정 초과")은 이미 가져온 보드 데이터에 대해 클라이언트 사이드에서만 동작하며, 새로운 fetch를 유발하지 않고 Backlog 칼럼에는 적용되지 않습니다.
