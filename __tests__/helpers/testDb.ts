import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { tickets } from '@/server/db/schema';

const TEST_DATABASE = 'tika_test';

type Column = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'DONE';

// 테스트 정리는 tika_test에서만 허용된다 (constitution 가드레일 "테스트 DB 예외")
export function assertTestDatabase() {
  const url = process.env.DATABASE_URL;
  const name = url ? new URL(url).pathname.replace(/^\//, '') : '';
  if (name !== TEST_DATABASE) {
    throw new Error(
      `테스트 DB 정리는 ${TEST_DATABASE}에서만 실행할 수 있습니다 (현재: ${name || '미설정'})`,
    );
  }
}

// 한 칼럼만 비운다 — 항상 WHERE status 조건이 붙는다
export async function clearColumn(status: Column) {
  assertTestDatabase();
  await db.delete(tickets).where(eq(tickets.status, status));
}

export async function clearBacklog() {
  await clearColumn('BACKLOG');
}

// 원하는 상태·시각의 티켓을 검증 없이 바로 넣는다 (테스트 준비용)
export async function insertTicket(
  values: Partial<typeof tickets.$inferInsert> = {},
) {
  assertTestDatabase();
  const [ticket] = await db
    .insert(tickets)
    .values({ title: '테스트 티켓', ...values })
    .returning();
  return ticket;
}
