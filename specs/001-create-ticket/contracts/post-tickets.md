# Contract: POST /api/tickets

**기준 문서**: `docs/API_SPEC.md` §1 — 이 계약은 그 내용에 spec 결정(FR-006, FR-008, FR-013)과 research §4를
반영한 것이다. docs 수정(research D1~D5)이 끝나면 두 문서는 같아야 한다.

## Request

- Method / Path: `POST /api/tickets`
- Content-Type: `application/json`
- 인증: 없음

| 필드 | 타입 | 필수 | 제약 | 기본값 |
|------|------|------|------|--------|
| title | string | O | 1~200자, 공백만 불가 | - |
| description | string | X | ≤ 1000자 | `null` |
| priority | string | X | `LOW` \| `MEDIUM` \| `HIGH` | `MEDIUM` |
| plannedStartDate | string | X | `YYYY-MM-DD`, 달력상 존재 | `null` |
| dueDate | string | X | `YYYY-MM-DD`, 달력상 존재, ≥ 오늘(Asia/Seoul) | `null` |

- 위 목록에 없는 키(`status`, `position`, `startedAt`, `completedAt`, `id` 등)는 무시한다.
- 본문이 JSON으로 파싱되지 않거나 객체가 아니면 `{}`로 간주한다.

## Response 201 Created

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

- `status`는 항상 `"BACKLOG"`, `startedAt`·`completedAt`은 항상 `null`.
- `position`: Backlog가 비어 있으면 `-1024`, 아니면 `min(Backlog.position) - 1024`.
- 날짜는 `YYYY-MM-DD` 문자열, 타임스탬프는 ISO 8601 문자열.

## Error Responses

형식은 항상 `{ "error": { "code": string, "message": string } }` (constitution III).

| 상태 | code | 조건 | message |
|------|------|------|---------|
| 400 | VALIDATION_ERROR | 제목 누락 / 빈 문자열 / 공백만 / 본문 파싱 불가·비객체 | 제목을 입력해주세요 |
| 400 | VALIDATION_ERROR | 제목 200자 초과 | 제목은 200자 이내로 입력해주세요 |
| 400 | VALIDATION_ERROR | 설명 1000자 초과 | 설명은 1000자 이내로 입력해주세요 |
| 400 | VALIDATION_ERROR | 허용되지 않는 우선순위 | 우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요 |
| 400 | VALIDATION_ERROR | 시작예정일 형식 오류 | 시작예정일 형식이 올바르지 않습니다 |
| 400 | VALIDATION_ERROR | 종료예정일 형식 오류 | 종료예정일 형식이 올바르지 않습니다 |
| 400 | VALIDATION_ERROR | 종료예정일 < 오늘(Asia/Seoul) | 종료예정일은 오늘 이후 날짜를 선택해주세요 |
| 500 | INTERNAL_ERROR | 저장 실패 등 예기치 못한 오류 | 서버 내부 오류 |

- 여러 조건이 겹치면 하나의 message만 반환한다.
- 500 응답에는 스택 트레이스·SQL·드라이버 메시지를 넣지 않는다.
