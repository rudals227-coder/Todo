# Tika - API 명세서 (API_SPEC.md)

> Base URL: `/api`
> 인증: 없음 (MVP - 단일 사용자)
> Content-Type: application/json
> Timezone: Asia/Seoul

---

## 공통 규칙

### 에러 응답 형식

모든 에러는 동일한 구조로 반환한다.

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "사람이 읽을 수 있는 에러 메시지"
  }
}
```

### HTTP 상태 코드

| 코드 | 의미 | 사용 |
|------|------|------|
| 200 | OK | 조회, 수정, 상태 변경 성공 |
| 201 | Created | 티켓 생성 성공 |
| 204 | No Content | 삭제 성공 |
| 400 | Bad Request | 요청 검증 실패 (Zod 검증 에러) |
| 404 | Not Found | 존재하지 않는 리소스 |
| 500 | Internal Server Error | 서버 내부 오류 |

### 에러 코드 정의

| 코드 | 의미 |
|------|------|
| VALIDATION_ERROR | 요청 데이터 검증 실패 |
| TICKET_NOT_FOUND | 티켓을 찾을 수 없음 |
| INTERNAL_ERROR | 서버 내부 오류 |

### 공통: 경로의 티켓 ID (`:id`)

- 양의 정수여야 한다. 숫자가 아니거나(`"abc"`), 0 이하이거나, 정수가 아니면 400 `VALIDATION_ERROR` "티켓 ID가 올바르지 않습니다"
- 형식은 맞지만 존재하지 않으면 404 `TICKET_NOT_FOUND` "티켓을 찾을 수 없습니다"
- `/:id`를 받는 3·4·5·6번 API에 공통 적용한다

### 날짜 필드 구분

| 필드명 | 타입 | 형식 | 입력 주체 | 설명 |
|--------|------|------|----------|------|
| plannedStartDate | DATE | YYYY-MM-DD | 사용자 | 시작예정일 |
| dueDate | DATE | YYYY-MM-DD | 사용자 | 종료예정일 |
| startedAt | TIMESTAMP | ISO 8601 | 시스템 | 시작일 (TODO 이동 시 자동) |
| completedAt | TIMESTAMP | ISO 8601 | 시스템 | 종료일 (Done 이동 시 자동) |
| createdAt | TIMESTAMP | ISO 8601 | 시스템 | 생성 시각 |
| updatedAt | TIMESTAMP | ISO 8601 | 시스템 | 수정 시각 |

---

## 1. POST /api/tickets

**설명**: 새 티켓을 생성하여 Backlog에 추가한다.
**관련 FR**: FR-001 (티켓 생성)

### Request Body

| 필드 | 타입 | 필수 | 제약조건 | 기본값 | 설명 |
|------|------|------|----------|--------|------|
| title | string | O | 1~200자, 공백만 불가 | - | 티켓 제목 |
| description | string | X | 최대 1000자 | null | 상세 설명 |
| priority | string | X | LOW \| MEDIUM \| HIGH | MEDIUM | 우선순위 |
| plannedStartDate | string | X | YYYY-MM-DD | null | 시작예정일 |
| dueDate | string | X | YYYY-MM-DD, 오늘(Asia/Seoul) 이후, 오늘 포함 | null | 종료예정일 |

```json
{
  "title": "API 설계 문서 작성",
  "description": "REST API 엔드포인트와 요청/응답 형식을 정의한다",
  "priority": "HIGH",
  "plannedStartDate": "2026-02-10",
  "dueDate": "2026-02-15"
}
```

### 처리 규칙

- status는 항상 `BACKLOG`로 설정
- position은 해당 칼럼의 `min(position) - 1024` (맨 위 배치). 칼럼이 비어 있으면 0을 기준으로 `-1024`
- createdAt, updatedAt 자동 설정
- 본문이 JSON으로 파싱되지 않거나 객체가 아니면 빈 객체로 간주한다 (→ 제목 누락 메시지)
- 스키마에 없는 필드(status, position, startedAt, completedAt 등)는 무시한다

### Response 201 Created

```json
{
  "id": 1,
  "title": "API 설계 문서 작성",
  "description": "REST API 엔드포인트와 요청/응답 형식을 정의한다",
  "status": "BACKLOG",
  "priority": "HIGH",
  "position": -1024,
  "plannedStartDate": "2026-02-10",
  "dueDate": "2026-02-15",
  "startedAt": null,
  "completedAt": null,
  "createdAt": "2026-02-01T09:00:00.000Z",
  "updatedAt": "2026-02-01T09:00:00.000Z"
}
```

### 에러 응답

| 상태 코드 | 코드 | 조건 | 메시지 |
|----------|------|------|--------|
| 400 | VALIDATION_ERROR | 제목 누락 | "제목을 입력해주세요" |
| 400 | VALIDATION_ERROR | 제목 200자 초과 | "제목은 200자 이내로 입력해주세요" |
| 400 | VALIDATION_ERROR | 제목 공백만 입력 | "제목을 입력해주세요" |
| 400 | VALIDATION_ERROR | 설명 1000자 초과 | "설명은 1000자 이내로 입력해주세요" |
| 400 | VALIDATION_ERROR | 잘못된 우선순위 값 | "우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요" |
| 400 | VALIDATION_ERROR | 과거 종료예정일 | "종료예정일은 오늘 이후 날짜를 선택해주세요" |
| 400 | VALIDATION_ERROR | 시작예정일 형식 오류 (YYYY-MM-DD가 아니거나 달력에 없는 날짜) | "시작예정일 형식이 올바르지 않습니다" |
| 400 | VALIDATION_ERROR | 종료예정일 형식 오류 (YYYY-MM-DD가 아니거나 달력에 없는 날짜) | "종료예정일 형식이 올바르지 않습니다" |

---

## 2. GET /api/tickets

**설명**: 전체 티켓을 칼럼별로 그룹화하여 조회한다 (보드 렌더링용).
**관련 FR**: FR-002 (보드 조회), FR-008 (오버듀 판정)

### Query Parameters

없음 (전체 티켓을 칼럼별로 반환)

### 처리 규칙

- 4개 칼럼(BACKLOG, TODO, IN_PROGRESS, DONE)별로 티켓을 그룹화
- 각 칼럼 내 정렬: position 오름차순
- 각 티켓에 `isOverdue` 파생 필드 포함 (`dueDate < 오늘(Asia/Seoul) AND status ≠ DONE`, dueDate가 없으면 false)
- Done 칼럼: `completedAt` 기준 24시간 이내 티켓만 포함 (서버에서 필터)
- `total`: 응답에 포함된(필터 후) 티켓 수의 합
- 티켓이 없는 칼럼도 빈 배열로 항상 포함

### Response 200 OK

```json
{
  "board": {
    "BACKLOG": [
      {
        "id": 7,
        "title": "알림 기능 조사",
        "description": null,
        "status": "BACKLOG",
        "priority": "LOW",
        "position": 1,
        "plannedStartDate": null,
        "dueDate": null,
        "startedAt": null,
        "completedAt": null,
        "createdAt": "2026-02-01T09:00:00.000Z",
        "updatedAt": "2026-02-01T09:00:00.000Z",
        "isOverdue": false
      }
    ],
    "TODO": [
      {
        "id": 5,
        "title": "로그인 페이지 구현",
        "description": null,
        "status": "TODO",
        "priority": "HIGH",
        "position": 1,
        "plannedStartDate": "2026-02-03",
        "dueDate": "2026-02-10",
        "startedAt": "2026-02-01T00:00:00.000Z",
        "completedAt": null,
        "createdAt": "2026-02-01T09:00:00.000Z",
        "updatedAt": "2026-02-01T09:00:00.000Z",
        "isOverdue": true
      }
    ],
    "IN_PROGRESS": [],
    "DONE": []
  },
  "total": 2
}
```

---

## 3. GET /api/tickets/:id

**설명**: 특정 티켓의 전체 정보를 조회한다.
**관련 FR**: FR-003 (티켓 상세 조회)

### Path Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 티켓 ID |

### Response 200 OK

```json
{
  "id": 1,
  "title": "API 설계 문서 작성",
  "description": "REST API 엔드포인트와 요청/응답 형식을 정의한다",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "position": 1,
  "plannedStartDate": "2026-02-10",
  "dueDate": "2026-02-15",
  "startedAt": "2026-01-28T00:00:00.000Z",
  "completedAt": null,
  "createdAt": "2026-02-01T09:00:00.000Z",
  "updatedAt": "2026-02-01T09:00:00.000Z",
  "isOverdue": false
}
```

### 에러 응답

| 상태 코드 | 코드 | 조건 | 메시지 |
|----------|------|------|--------|
| 404 | TICKET_NOT_FOUND | 존재하지 않는 ID | "티켓을 찾을 수 없습니다" |

---

## 4. PATCH /api/tickets/:id

**설명**: 티켓의 제목, 설명, 우선순위, 시작예정일, 종료예정일을 수정한다 (부분 업데이트).
**관련 FR**: FR-004 (티켓 수정)

### Path Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 티켓 ID |

### Request Body (모든 필드 선택)

| 필드 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| title | string | 1~200자, 공백만 불가 | 제목 변경 |
| description | string \| null | 최대 1000자. null이면 삭제 | 설명 변경 |
| priority | string | LOW \| MEDIUM \| HIGH | 우선순위 변경 |
| plannedStartDate | string \| null | YYYY-MM-DD. null이면 삭제 | 시작예정일 변경 |
| dueDate | string \| null | YYYY-MM-DD, 오늘(Asia/Seoul) 이후, 오늘 포함. null이면 삭제 | 종료예정일 변경 |

```json
{
  "title": "API 설계 문서 작성 (수정)",
  "priority": "MEDIUM",
  "plannedStartDate": "2026-02-12"
}
```

### 처리 규칙

- 전송된 필드만 업데이트 (PATCH). 빈 객체를 보내면 updatedAt만 갱신된다
- updatedAt 자동 갱신
- status, position, startedAt, completedAt은 이 API로 수정 불가 — 보내도 무시한다
- 본문 파싱 불가·비객체 본문은 빈 객체로 간주한다 (1번 API와 같음)

### Response 200 OK

수정된 티켓 전체 데이터 (GET /api/tickets/:id와 동일한 형식)

### 에러 응답

| 상태 코드 | 코드 | 조건 | 메시지 |
|----------|------|------|--------|
| 400 | VALIDATION_ERROR | 제목 200자 초과 | "제목은 200자 이내로 입력해주세요" |
| 400 | VALIDATION_ERROR | 설명 1000자 초과 | "설명은 1000자 이내로 입력해주세요" |
| 400 | VALIDATION_ERROR | 잘못된 우선순위 값 | "우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요" |
| 400 | VALIDATION_ERROR | 과거 종료예정일 | "종료예정일은 오늘 이후 날짜를 선택해주세요" |
| 400 | VALIDATION_ERROR | 제목이 빈 문자열·공백만 | "제목을 입력해주세요" |
| 400 | VALIDATION_ERROR | 시작예정일 형식 오류 | "시작예정일 형식이 올바르지 않습니다" |
| 400 | VALIDATION_ERROR | 종료예정일 형식 오류 | "종료예정일 형식이 올바르지 않습니다" |
| 400 | VALIDATION_ERROR | 잘못된 ID 형식 | "티켓 ID가 올바르지 않습니다" |
| 404 | TICKET_NOT_FOUND | 존재하지 않는 ID | "티켓을 찾을 수 없습니다" |

---

## 5. PATCH /api/tickets/:id/complete

**설명**: 티켓을 Done 상태로 완료 처리하고, 종료일(completedAt)을 자동 설정한다.
**관련 FR**: FR-005 (티켓 완료)

### Path Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 티켓 ID |

### Request Body

없음

### 처리 규칙

- status를 `DONE`으로 변경
- `completedAt`을 현재 시각으로 설정
- position은 Done 칼럼(자기 자신 제외)의 `min(position) - 1024` (맨 위 배치). Done 칼럼이 비어 있으면 0을 기준으로 `-1024`
- startedAt은 변경하지 않는다
- 이미 DONE인 티켓도 같은 규칙으로 다시 완료 처리한다 (completedAt·position 갱신)
- updatedAt 자동 갱신

### Response 200 OK

```json
{
  "id": 3,
  "title": "API 설계 문서 작성",
  "description": "REST API 엔드포인트와 요청/응답 형식을 정의한다",
  "status": "DONE",
  "priority": "HIGH",
  "position": -1024,
  "plannedStartDate": "2026-02-10",
  "dueDate": "2026-02-15",
  "startedAt": "2026-01-28T00:00:00.000Z",
  "completedAt": "2026-02-01T15:30:00.000Z",
  "createdAt": "2026-02-01T09:00:00.000Z",
  "updatedAt": "2026-02-01T15:30:00.000Z"
}
```

### 에러 응답

| 상태 코드 | 코드 | 조건 | 메시지 |
|----------|------|------|--------|
| 404 | TICKET_NOT_FOUND | 존재하지 않는 ID | "티켓을 찾을 수 없습니다" |

---

## 6. DELETE /api/tickets/:id

**설명**: 티켓을 영구 삭제한다.
**관련 FR**: FR-006 (티켓 삭제)

### Path Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | number | 티켓 ID |

### 처리 규칙

- 하드 삭제 (soft delete 아님, MVP 기준)

### Response 204 No Content

본문 없음

### 에러 응답

| 상태 코드 | 코드 | 조건 | 메시지 |
|----------|------|------|--------|
| 404 | TICKET_NOT_FOUND | 존재하지 않는 ID | "티켓을 찾을 수 없습니다" |

---

## 7. PATCH /api/tickets/reorder

**설명**: 드래그앤드롭으로 티켓의 상태(칼럼)와 순서를 변경한다. Done으로의 이동은 `/api/tickets/:id/complete`를 사용하고, 그 외 모든 이동(Done에서 나가는 것 포함)은 이 API를 사용한다.
**관련 FR**: FR-007 (상태/순서 변경)

### Request Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| ticketId | number | O | 이동할 티켓 ID (양의 정수) |
| status | string | O | 대상 칼럼 (BACKLOG \| TODO \| IN_PROGRESS) |
| position | number | O | 대상 칼럼 안에서 놓일 자리의 인덱스 (0부터, 이동하는 티켓 자신은 제외하고 센다). 칼럼 길이보다 크면 맨 뒤로 간주 |

> **주의**: status에 `DONE`은 허용하지 않는다. Done 이동은 `PATCH /api/tickets/:id/complete`를 사용한다.

```json
{
  "ticketId": 3,
  "status": "IN_PROGRESS",
  "position": 0
}
```

### 처리 규칙

**상태/순서 변경**:
- 대상 티켓의 status와 position 동시 업데이트
- 전체 작업을 트랜잭션으로 처리 (원자성 보장)
- updatedAt 자동 갱신

**position 재계산 로직** (서버가 인덱스로부터 실제 position 값을 계산, position은 정수):
- 빈 칼럼: `0`
- 두 카드 사이에 삽입할 때: `floor((prev + next) / 2)`로 계산
- 사이에 정수가 없으면(`next - prev < 2`): 해당 칼럼 전체를 이동 티켓을 포함해 `0, 1024, 2048, …` 간격으로 재정렬하고, position이 바뀐 다른 티켓을 `affected`로 반환
- 맨 앞 삽입: 첫 번째 카드의 position - 1024
- 맨 뒤 삽입: 마지막 카드의 position + 1024

**비즈니스 로직 (startedAt)** — 상태가 바뀔 때만 적용 (같은 칼럼 내 순서 변경은 변경 없음):
- TODO로 이동 시: `startedAt = 현재 시각`
- BACKLOG로 이동 시 (TODO·IN_PROGRESS·DONE 어디서든): `startedAt = null`
- 그 외 이동: startedAt 변경 없음

**비즈니스 로직 (completedAt)**:
- Done에서 다른 칼럼으로 이동 시: `completedAt = null`

### Response 200 OK

```json
{
  "ticket": {
    "id": 3,
    "title": "API 설계 문서 작성",
    "description": "REST API 엔드포인트와 요청/응답 형식을 정의한다",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "position": 0,
    "plannedStartDate": "2026-02-10",
    "dueDate": "2026-02-15",
    "startedAt": "2026-01-28T00:00:00.000Z",
    "completedAt": null,
    "createdAt": "2026-02-01T09:00:00.000Z",
    "updatedAt": "2026-02-01T10:30:00.000Z"
  },
  "affected": [
    { "id": 5, "position": 1024 },
    { "id": 8, "position": 2048 }
  ]
}
```

**affected**: 순서가 변경된 다른 티켓들의 ID와 새 position

### 에러 응답

| 상태 코드 | 코드 | 조건 | 메시지 |
|----------|------|------|--------|
| 400 | VALIDATION_ERROR | 잘못된 status 값 (DONE 포함) | "상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요" |
| 400 | VALIDATION_ERROR | ticketId 누락·양의 정수가 아님 | "티켓 ID가 올바르지 않습니다" |
| 400 | VALIDATION_ERROR | position 누락·음수·정수가 아님 | "위치 값이 올바르지 않습니다" |
| 404 | TICKET_NOT_FOUND | 존재하지 않는 ticketId | "티켓을 찾을 수 없습니다" |

---

## API 엔드포인트 요약

| # | 메서드 | 경로 | 설명 | 관련 FR |
|---|--------|------|------|---------|
| 1 | POST | /api/tickets | 티켓 생성 | FR-001 |
| 2 | GET | /api/tickets | 전체 보드 조회 | FR-002, FR-008 |
| 3 | GET | /api/tickets/:id | 티켓 상세 조회 | FR-003 |
| 4 | PATCH | /api/tickets/:id | 티켓 수정 | FR-004 |
| 5 | PATCH | /api/tickets/:id/complete | 티켓 완료 | FR-005 |
| 6 | DELETE | /api/tickets/:id | 티켓 삭제 | FR-006 |
| 7 | PATCH | /api/tickets/reorder | 상태/순서 변경 (DnD) | FR-007 |

---

## 프론트엔드 DnD 라우팅 규칙

프론트엔드에서 드래그앤드롭 이벤트 발생 시, 대상 칼럼에 따라 호출할 API를 분기한다.

| 이동 방향 | 호출 API | 비고 |
|-----------|----------|------|
| 아무 칼럼 → Done | `PATCH /api/tickets/:id/complete` | completedAt 자동 설정 |
| Done → 다른 칼럼 | `PATCH /api/tickets/reorder` | completedAt 초기화 |
| Done 외 칼럼 간 이동 | `PATCH /api/tickets/reorder` | startedAt 규칙 적용 |
| 같은 칼럼 내 순서 변경 | `PATCH /api/tickets/reorder` | position만 변경 |

---

## 검증 스키마 (Zod)

프론트엔드 폼과 백엔드 API에서 동일한 Zod 스키마를 공유한다. 스키마는 `src/shared/validations/ticket.ts`에 정의한다.

### 생성 스키마 (CreateTicketInput)

```typescript
// "오늘"은 서버·브라우저 시간대와 관계없이 Asia/Seoul 기준 날짜(YYYY-MM-DD)로 판정한다
const getTodayInSeoul = (now: Date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);

// 달력에 실제로 있는 날짜인지 (예: 2026-02-30, 2026-13-45는 거부)
const isValidCalendarDate = (val: string) => {
  const d = new Date(`${val}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === val;
};

// 형식·타입·달력 오류 모두 같은 필드 메시지를 쓴다
const dateString = (message: string) =>
  z.string({ invalid_type_error: message })
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine(isValidCalendarDate, message);

const createTicketSchema = z.object({
  title: z.string({ required_error: '제목을 입력해주세요', invalid_type_error: '제목을 입력해주세요' })
    .min(1, '제목을 입력해주세요')
    .max(200, '제목은 200자 이내로 입력해주세요')
    .refine(val => val.trim().length > 0, '제목을 입력해주세요'),
  description: z.string({ invalid_type_error: '설명은 1000자 이내로 입력해주세요' })
    .max(1000, '설명은 1000자 이내로 입력해주세요')
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH'], {
    errorMap: () => ({ message: '우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요' }),
  }).optional(),
  plannedStartDate: dateString('시작예정일 형식이 올바르지 않습니다').optional(),
  dueDate: dateString('종료예정일 형식이 올바르지 않습니다')
    // 형식이 틀리면 이 규칙은 통과시켜 형식 메시지만 남긴다
    .refine(
      val => !isValidCalendarDate(val) || val >= getTodayInSeoul(),
      '종료예정일은 오늘 이후 날짜를 선택해주세요',
    )
    .optional(),
});
```

- 여러 필드가 동시에 틀리면 첫 번째 오류 메시지 하나만 응답한다.
- 시작예정일과 종료예정일의 순서는 검사하지 않는다.

### 수정 스키마 (UpdateTicketInput)

생성 스키마와 같은 필드 규칙(`getTodayInSeoul`, `dateString` 포함)을 쓰고, 모든 필드를 선택으로 바꾼다.
`description`·`plannedStartDate`·`dueDate`는 `null`을 보내면 삭제한다(`null`은 형식·날짜 검사를 건너뛴다).

```typescript
const updateTicketSchema = z.object({
  title: titleField.optional(),                       // 생성 스키마의 title 규칙
  description: descriptionField.nullable().optional(),
  priority: priorityField.optional(),
  plannedStartDate: dateString('시작예정일 형식이 올바르지 않습니다').nullable().optional(),
  dueDate: dueDateField.nullable().optional(),        // 형식 검사 + 오늘(Asia/Seoul) 이후
});
```

### 경로 ID 스키마

```typescript
const ID_MESSAGE = '티켓 ID가 올바르지 않습니다';

// 경로 문자열 "12"를 숫자로 바꿔 검사한다 (int4 범위)
const ticketIdSchema = z.coerce
  .number({ invalid_type_error: ID_MESSAGE })
  .int(ID_MESSAGE)
  .positive(ID_MESSAGE)
  .max(2147483647, ID_MESSAGE);
```

### 순서 변경 스키마 (ReorderTicketInput)

```typescript
const POSITION_MESSAGE = '위치 값이 올바르지 않습니다';

const reorderTicketSchema = z.object({
  ticketId: z.number({ required_error: ID_MESSAGE, invalid_type_error: ID_MESSAGE })
    .int(ID_MESSAGE)
    .positive(ID_MESSAGE)
    .max(2147483647, ID_MESSAGE),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS'], {
    errorMap: () => ({ message: '상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요' }),
  }),
  position: z.number({ required_error: POSITION_MESSAGE, invalid_type_error: POSITION_MESSAGE })
    .int(POSITION_MESSAGE)
    .min(0, POSITION_MESSAGE),                        // 대상 칼럼 내 인덱스
});
```
