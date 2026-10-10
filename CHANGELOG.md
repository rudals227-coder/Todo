# Changelog

이 프로젝트의 주요 변경 사항을 기록합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따릅니다.

## [Unreleased]

### 추가

- 티켓 조회·수정·삭제 API `GET`/`PATCH`/`DELETE /api/tickets/:id` (`app/api/tickets/[id]/route.ts`) (2c548fd)
- 티켓 완료 API `PATCH /api/tickets/:id/complete` (`app/api/tickets/[id]/complete/route.ts`) [FR-005] (2c548fd)
- 티켓 이동 API `PATCH /api/tickets/reorder` (`app/api/tickets/reorder/route.ts`) (2c548fd)
- 보드 조회 API `GET /api/tickets` (`app/api/tickets/route.ts`) (2c548fd)
- 서비스 함수 `getBoard`, `getTicket`, `updateTicket`, `completeTicket`, `deleteTicket`, `reorderTicket` (`src/server/services/ticketService.ts`) (2c548fd)
- 공용 에러 처리·검증 미들웨어 `handleError`, `validate`, `readJsonObject` (`src/server/middleware/`) [specs/001-create-ticket] (2c548fd)
- 공용 상수 `TIMEZONE`, `POSITION_GAP` (`src/shared/constants.ts`), 공용 타입 (`src/shared/types/index.ts`) (2c548fd)
- Zod 스키마 `updateTicketSchema`, `ticketIdSchema`, `reorderTicketSchema`, Asia/Seoul 기준 `getTodayInSeoul` (`src/shared/validations/ticket.ts`) (2c548fd)
- 시드 스크립트 `src/server/db/seed.ts` (2c548fd)
- 테스트: `__tests__/api/{board,complete,reorder,ticketById}.test.ts`, `__tests__/services/{errorHandler,ticketService,ticketValidation,validate}.test.ts`, 헬퍼 `__tests__/helpers/{request,testDb}.ts` (2c548fd)
- `.prettierignore` (notes/, .claude/, .specify/, drizzle/, \*.md 제외) (77b888d)
- `/changelog` 스킬 (`.claude/skills/changelog/SKILL.md`) (77b888d)
- 필수 안전장치(가드레일) 추가 (e3f66ee)
- Spec Kit 초기화와 Constitution 설정 (7e70cc1)
- Drizzle ORM과 PostgreSQL 연결 (9187f8a)
- Jest 테스트 환경 구성 (c2c7cd3)
- Next.js 15 기본 페이지 구성 (aea6948)
- 티켓 생성 API 구현 (TDD) (ca115d0)
- 티켓 생성 API 구현 — TDD Green + refactor (2a5655f) [FR-001]
- TRD 기준 Next.js 프로젝트 구조 스캐폴딩 (a2a34b7)

### 변경

- 티켓 생성 API를 공용 미들웨어 사용 방식으로 보정, 파싱 불가·비객체 본문을 빈 객체로 처리 (`app/api/tickets/route.ts`, `__tests__/api/tickets.test.ts`) [FR-001, specs/001-create-ticket] (2c548fd)
- `npm test`를 `--runInBand`로 실행하도록 변경 (`package.json`) (2c548fd)
- 포맷 정리: `drizzle.config.ts` 끝 개행, `src/server/db/schema.ts` 줄바꿈 (2c548fd)

### 문서

- 티켓 생성 소급 명세 `specs/001-create-ticket/` (spec, plan, research, data-model, contracts, quickstart, tasks, checklists) [FR-001] (c1c6cd0)
- `docs/API_SPEC.md`: 경로 `:id` 공통 검증 규칙, 날짜 형식 오류 메시지, Asia/Seoul 기준 "오늘", position 인덱스·정수 재계산 규칙, BACKLOG 이동 시 startedAt 초기화 범위 확대 (c1c6cd0)
- `docs/REQUIREMENTS.md`: dueDate 오늘 포함, 빈 칼럼 position=-1024, 날짜·ticketId·position 검증 메시지 추가 [FR-001, FR-005] (c1c6cd0)
- `docs/DATA_MODEL.md`: startedAt 초기화 규칙, `isOverdue` Asia/Seoul 기준, position 관리 규칙 (c1c6cd0)
- `docs/TEST_CASES.md`: 001-12~17, 007-13~16 추가, 002-1·003-3 수정 (c1c6cd0)
- `CLAUDE.md`: 현재 상태(소급 명세 반영), 상태 전이 규칙 문구 수정 (c1c6cd0)
- CLAUDE.md를 SDD 스펙 구조로 재구성 (16ff98e)

### 기타

- Spec Kit 초기 설정 (d93af70)
- Spec Kit 설치 전 상태 저장 (baa5c04)
- Drizzle DB 연동 및 env 설정 (2f647c6)
