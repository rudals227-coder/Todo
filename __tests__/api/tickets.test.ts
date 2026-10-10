import { POST } from '../../app/api/tickets/route';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { tickets } from '@/server/db/schema';
import { getTodayInSeoul } from '@/shared/validations/ticket';
import { clearBacklog } from '../helpers/testDb';

function createRequest(body: unknown): Request {
  return new Request('http://localhost/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createRawRequest(raw: string): Request {
  return new Request('http://localhost/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw,
  });
}

async function expectValidationError(response: Response, message: string) {
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: { code: 'VALIDATION_ERROR', message },
  });
}

// docs/TEST_CASES.md TC-API-001과 1:1로 대응한다
describe('TC-API-001: POST /api/tickets — 티켓 생성', () => {
  it('001-1 필수 필드만으로 생성하면 201, status=BACKLOG, priority=MEDIUM이다', async () => {
    const response = await POST(createRequest({ title: '테스트 할일' }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.title).toBe('테스트 할일');
    expect(body.status).toBe('BACKLOG');
    expect(body.priority).toBe('MEDIUM');
    expect(body.description).toBeNull();
    expect(body.plannedStartDate).toBeNull();
    expect(body.dueDate).toBeNull();
  });

  it('001-2 전체 필드로 생성하면 201과 함께 모든 필드가 반영된다', async () => {
    const response = await POST(
      createRequest({
        title: 'API 설계 문서 작성',
        description: 'REST API 엔드포인트와 요청/응답 형식을 정의한다',
        priority: 'HIGH',
        plannedStartDate: '2099-01-10',
        dueDate: '2099-01-15',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      title: 'API 설계 문서 작성',
      description: 'REST API 엔드포인트와 요청/응답 형식을 정의한다',
      status: 'BACKLOG',
      priority: 'HIGH',
      plannedStartDate: '2099-01-10',
      dueDate: '2099-01-15',
    });
  });

  it('001-3 제목이 누락되면 400, "제목을 입력해주세요"', async () => {
    await expectValidationError(
      await POST(createRequest({})),
      '제목을 입력해주세요',
    );
  });

  it('001-4 빈 제목이면 400, "제목을 입력해주세요"', async () => {
    await expectValidationError(
      await POST(createRequest({ title: '' })),
      '제목을 입력해주세요',
    );
  });

  it('001-5 공백만 있는 제목이면 400, "제목을 입력해주세요"', async () => {
    await expectValidationError(
      await POST(createRequest({ title: '   ' })),
      '제목을 입력해주세요',
    );
  });

  it('001-6 제목이 200자를 초과하면 400, "제목은 200자 이내로 입력해주세요"', async () => {
    await expectValidationError(
      await POST(createRequest({ title: 'a'.repeat(201) })),
      '제목은 200자 이내로 입력해주세요',
    );
  });

  it('001-7 설명이 1000자를 초과하면 400, "설명은 1000자 이내로 입력해주세요"', async () => {
    await expectValidationError(
      await POST(createRequest({ title: 'ok', description: 'a'.repeat(1001) })),
      '설명은 1000자 이내로 입력해주세요',
    );
  });

  it('001-8 잘못된 우선순위면 400, "우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요"', async () => {
    await expectValidationError(
      await POST(createRequest({ title: 'ok', priority: 'URGENT' })),
      '우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요',
    );
  });

  it('001-9 과거 종료예정일이면 400, "종료예정일은 오늘 이후 날짜를 선택해주세요"', async () => {
    await expectValidationError(
      await POST(createRequest({ title: 'ok', dueDate: '2020-01-01' })),
      '종료예정일은 오늘 이후 날짜를 선택해주세요',
    );
  });

  it('001-10 연속 2개 생성하면 나중에 생성한 티켓의 position이 더 작다 (맨 위 배치)', async () => {
    const first = await (await POST(createRequest({ title: '먼저' }))).json();
    const second = await (await POST(createRequest({ title: '나중' }))).json();

    expect(second.position).toBeLessThan(first.position);
  });

  it('001-11 정상 생성 시 startedAt=null, completedAt=null이다', async () => {
    const response = await POST(createRequest({ title: '초기값 확인' }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.startedAt).toBeNull();
    expect(body.completedAt).toBeNull();
  });

  it('001-12 시작예정일 형식이 잘못되면 400, "시작예정일 형식이 올바르지 않습니다"', async () => {
    await expectValidationError(
      await POST(
        createRequest({ title: 'ok', plannedStartDate: '2026-13-45' }),
      ),
      '시작예정일 형식이 올바르지 않습니다',
    );
  });

  it('001-13 종료예정일 형식이 잘못되면 400, "종료예정일 형식이 올바르지 않습니다"', async () => {
    await expectValidationError(
      await POST(createRequest({ title: 'ok', dueDate: '내일' })),
      '종료예정일 형식이 올바르지 않습니다',
    );
  });

  describe('001-14 빈 Backlog', () => {
    beforeEach(async () => {
      await clearBacklog();
    });

    it('001-14 Backlog가 비어 있으면 첫 티켓은 201, position=-1024다', async () => {
      const response = await POST(createRequest({ title: '첫 티켓' }));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.position).toBe(-1024);
    });
  });

  describe('001-15 한국 시간 기준 "오늘" (현재 시각 UTC 2026-03-10T15:30 = KST 03-11 00:30)', () => {
    beforeEach(() => {
      // DB 통신에 쓰이는 타이머는 그대로 두고 현재 시각(Date)만 고정한다
      jest.useFakeTimers({
        now: new Date('2026-03-10T15:30:00Z'),
        doNotFake: [
          'hrtime',
          'nextTick',
          'performance',
          'queueMicrotask',
          'setImmediate',
          'clearImmediate',
          'setInterval',
          'clearInterval',
          'setTimeout',
          'clearTimeout',
        ],
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('001-15 종료예정일 2026-03-11(한국 시간 오늘)은 허용한다', async () => {
      const response = await POST(
        createRequest({ title: 'ok', dueDate: '2026-03-11' }),
      );

      expect(response.status).toBe(201);
    });

    it('001-15 종료예정일 2026-03-10(한국 시간 어제)은 400, "종료예정일은 오늘 이후 날짜를 선택해주세요"', async () => {
      await expectValidationError(
        await POST(createRequest({ title: 'ok', dueDate: '2026-03-10' })),
        '종료예정일은 오늘 이후 날짜를 선택해주세요',
      );
    });
  });

  it.each([
    ['not-json', 'not-json'],
    ['null', 'null'],
    ['[]', '[]'],
    ['"hello"', '"hello"'],
  ])('001-16 본문이 %s이면 400, "제목을 입력해주세요"', async (_name, raw) => {
    await expectValidationError(
      await POST(createRawRequest(raw)),
      '제목을 입력해주세요',
    );
  });

  it('001-17 시스템 필드(status, position, startedAt, completedAt)를 보내도 무시한다', async () => {
    const response = await POST(
      createRequest({
        title: 'ok',
        status: 'DONE',
        position: 5,
        startedAt: '2026-01-01T00:00:00Z',
        completedAt: '2026-01-01T00:00:00Z',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.status).toBe('BACKLOG');
    expect(body.position).not.toBe(5);
    expect(body.startedAt).toBeNull();
    expect(body.completedAt).toBeNull();
  });
});

// TEST_CASES.md에 없는 보충 검증 — specs/001-create-ticket/spec.md 기준
describe('TC-API-001 보충: spec 001 추가 검증', () => {
  it('제목 정확히 200자와 설명 정확히 1000자는 허용한다 (경계값)', async () => {
    const response = await POST(
      createRequest({ title: 'a'.repeat(200), description: 'b'.repeat(1000) }),
    );

    expect(response.status).toBe(201);
  });

  it('거부된 요청은 티켓을 저장하지 않는다 (FR-012)', async () => {
    const title = `거부-${Date.now()}`;

    await POST(createRequest({ title, priority: 'URGENT' }));
    const saved = await db
      .select({ id: tickets.id })
      .from(tickets)
      .where(eq(tickets.title, title));

    expect(saved).toHaveLength(0);
  });

  it('생성된 티켓의 id, position, createdAt, updatedAt을 함께 반환한다 (FR-011)', async () => {
    const response = await POST(createRequest({ title: '응답 필드 확인' }));
    const body = await response.json();
    const isoTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

    expect(response.status).toBe(201);
    expect(typeof body.id).toBe('number');
    expect(typeof body.position).toBe('number');
    expect(body.createdAt).toMatch(isoTimestamp);
    expect(body.updatedAt).toMatch(isoTimestamp);
  });

  it('한국 시간 기준 오늘 날짜의 종료예정일은 허용한다 (실제 현재 시각)', async () => {
    const dueDate = getTodayInSeoul();

    const response = await POST(createRequest({ title: 'ok', dueDate }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.dueDate).toBe(dueDate);
  });

  it('과거 날짜의 시작예정일은 허용한다', async () => {
    const response = await POST(
      createRequest({ title: 'ok', plannedStartDate: '2020-01-01' }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.plannedStartDate).toBe('2020-01-01');
  });

  it('시작예정일이 종료예정일보다 늦어도 허용한다 (FR-014)', async () => {
    const response = await POST(
      createRequest({
        title: 'ok',
        plannedStartDate: '2099-03-20',
        dueDate: '2099-03-10',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.plannedStartDate).toBe('2099-03-20');
    expect(body.dueDate).toBe('2099-03-10');
  });
});
