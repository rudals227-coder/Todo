# Quickstart: 티켓 생성 검증 가이드

**Feature**: [spec.md](./spec.md) | 계약: [contracts/post-tickets.md](./contracts/post-tickets.md)

모든 명령은 **WSL 안에서** 프로젝트 루트(`~/projects/Todo`)에서 실행한다.

## 전제 조건

- 로컬 PostgreSQL 실행 중, `tika_dev`·`tika_test` DB 존재
- `.env.local`(tika_dev), `.env.test`(tika_test)에 `DATABASE_URL` 설정
- 마이그레이션 적용: `npm run db:migrate` (스키마 변경 없음 — 이미 적용돼 있으면 생략)
  - `npm run db:push`는 쓰지 않는다(constitution 가드레일: 사용자 확인 필요 명령)

## 1. 자동 테스트

```bash
npm test -- __tests__/api/tickets.test.ts
npm test -- __tests__/services
```

기대 결과: TC-API-001 전체와 신규 케이스(형식 오류, 빈 칼럼 −1024, KST 자정 경계, 비객체 본문,
시스템 필드 무시), position 서비스 테스트가 모두 통과.

## 2. 품질 게이트 (완료 조건)

```bash
npm test
npx tsc --noEmit
npm run lint
```

## 3. 수동 확인 (선택, 개발 서버)

```bash
npm run dev
```

다른 터미널에서:

| 시나리오 | 요청 본문 | 기대 |
|----------|-----------|------|
| 제목만 | `{"title":"테스트 할일"}` | 201, `status=BACKLOG`, `priority=MEDIUM` |
| 전체 필드 | `{"title":"a","description":"b","priority":"HIGH","plannedStartDate":"2099-01-10","dueDate":"2099-01-15"}` | 201, 값 반영 |
| 시작예정일 형식 오류 | `{"title":"a","plannedStartDate":"2026-13-45"}` | 400, "시작예정일 형식이 올바르지 않습니다" |
| 과거 종료예정일 | `{"title":"a","dueDate":"2020-01-01"}` | 400, "종료예정일은 오늘 이후 날짜를 선택해주세요" |
| 본문 깨짐 | `not-json` | 400, "제목을 입력해주세요" |

```bash
curl -s -X POST http://localhost:3000/api/tickets \
  -H 'Content-Type: application/json' \
  -d '{"title":"테스트 할일"}'
```

참고: 수동 확인은 `tika_dev`에 데이터를 남긴다. 정리가 필요하면 DB 리셋 대신 해당 id만 지우는 SQL을
사용자 승인 후 실행한다(constitution 가드레일).
