# Data Model: 티켓 생성

**Feature**: [spec.md](./spec.md) | **Date**: 2026-10-10
**기준 문서**: `docs/DATA_MODEL.md` (스키마·타입의 Source of truth — 여기서는 이 기능과 관련된 부분만 정리)

스키마 변경은 없다. `tickets` 테이블과 마이그레이션(`drizzle/0000_*.sql`)은 이미 존재하며 그대로 쓴다.
따라서 `db:generate`/`db:migrate`/`db:push` 실행이 필요 없다.

## Entity: Ticket (`tickets` 테이블, `src/server/db/schema.ts`)

| TS 필드 | DB 칼럼 | 타입 | 생성 시 값 | 출처 |
|---------|---------|------|-----------|------|
| id | id | SERIAL PK | DB 자동 증가 | 시스템 |
| title | title | VARCHAR(200) NOT NULL | 입력값 그대로(trim 안 함) | 사용자 |
| description | description | TEXT NULL | 입력값, 없으면 `null` | 사용자 |
| status | status | VARCHAR(20) NOT NULL | 항상 `'BACKLOG'` | 시스템 (FR-007) |
| priority | priority | VARCHAR(10) NOT NULL | 입력값, 없으면 `'MEDIUM'` | 사용자 (FR-004) |
| position | position | INTEGER NOT NULL | `(min(BACKLOG.position) ?? 0) - 1024` | 시스템 (FR-008) |
| plannedStartDate | planned_start_date | DATE NULL | 입력값(`YYYY-MM-DD`), 없으면 `null` | 사용자 |
| dueDate | due_date | DATE NULL | 입력값(`YYYY-MM-DD`), 없으면 `null` | 사용자 |
| startedAt | started_at | TIMESTAMP NULL | `null` | 시스템 (FR-009) |
| completedAt | completed_at | TIMESTAMP NULL | `null` | 시스템 (FR-009) |
| createdAt | created_at | TIMESTAMP NOT NULL | DB `now()` | 시스템 (FR-010) |
| updatedAt | updated_at | TIMESTAMP NOT NULL | DB `now()` | 시스템 (FR-010) |

## 입력 모델: CreateTicketInput (`src/shared/validations/ticket.ts`)

클라이언트 폼과 서버 라우트가 같은 스키마를 쓴다(constitution IV). 스키마에 없는 키는 제거된다(strip).

| 필드 | 필수 | 규칙 (위에서부터 검사) | 실패 메시지 |
|------|------|------------------------|-------------|
| title | O | 존재, 문자열 | "제목을 입력해주세요" |
| | | 길이 ≥ 1 | "제목을 입력해주세요" |
| | | 길이 ≤ 200 | "제목은 200자 이내로 입력해주세요" |
| | | trim 후 길이 > 0 | "제목을 입력해주세요" |
| description | X | 길이 ≤ 1000 | "설명은 1000자 이내로 입력해주세요" |
| priority | X | `LOW` \| `MEDIUM` \| `HIGH` | "우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요" |
| plannedStartDate | X | `YYYY-MM-DD` 형식 + 달력상 존재 | "시작예정일 형식이 올바르지 않습니다" |
| dueDate | X | `YYYY-MM-DD` 형식 + 달력상 존재 | "종료예정일 형식이 올바르지 않습니다" |
| | | ≥ `getTodayInSeoul()` (형식이 맞을 때만 판정) | "종료예정일은 오늘 이후 날짜를 선택해주세요" |

- 여러 필드가 동시에 틀리면 첫 issue(스키마 키 순서 기준)의 메시지 하나만 응답한다.
- 시작예정일과 종료예정일 사이의 순서는 검사하지 않는다(FR-014).

## 상태 전이

이 기능은 상태를 만들기만 한다: 생성 → `BACKLOG`. 이후 전이(TODO/IN_PROGRESS/DONE)는 reorder·complete 기능의 범위다.

## 공유 상수·헬퍼 (신규)

| 이름 | 위치 | 내용 |
|------|------|------|
| `TIMEZONE` | `src/shared/constants.ts` | `'Asia/Seoul'` |
| `POSITION_GAP` | `src/shared/constants.ts` | `1024` (DATA_MODEL §5.5의 간격, 이후 reorder에서도 사용) |
| `getTodayInSeoul(now?)` | `src/shared/validations/ticket.ts` (export) | `TIMEZONE` 기준 `YYYY-MM-DD` |
