import { PATCH } from '../../app/api/tickets/reorder/route';
import { clearColumn, insertTicket } from '../helpers/testDb';
import {
  MISSING_ID,
  expectError,
  expectNearNow,
  jsonRequest,
} from '../helpers/request';

const PAST = new Date('2020-01-01T00:00:00Z');
const STARTED = new Date('2026-01-05T00:00:00Z');

function reorder(body: unknown) {
  return PATCH(jsonRequest('PATCH', '/reorder', body));
}

async function move(ticketId: number, status: string, position: number) {
  const response = await reorder({ ticketId, status, position });
  return { status: response.status, body: await response.json() };
}

describe('TC-API-007: PATCH /api/tickets/reorder — 상태/순서 변경', () => {
  beforeEach(async () => {
    await clearColumn('BACKLOG');
    await clearColumn('TODO');
    await clearColumn('IN_PROGRESS');
  });

  it('007-1 BACKLOG에서 TODO로 이동하면 status=TODO, position이 갱신된다', async () => {
    const ticket = await insertTicket({ status: 'BACKLOG', position: 500 });

    const { status, body } = await move(ticket.id, 'TODO', 0);

    expect(status).toBe(200);
    expect(body.ticket).toMatchObject({
      id: ticket.id,
      status: 'TODO',
      position: 0,
    });
    expect(body.affected).toEqual([]);
  });

  it('007-2 같은 칼럼 내 순서 변경은 status를 유지하고 position만 바꾼다', async () => {
    const a = await insertTicket({
      status: 'TODO',
      position: 0,
      startedAt: STARTED,
    });
    await insertTicket({ status: 'TODO', position: 1024 });

    // a를 제외한 칼럼 [b]에서 인덱스 1 = b 뒤
    const { body } = await move(a.id, 'TODO', 1);

    expect(body.ticket.status).toBe('TODO');
    expect(body.ticket.position).toBe(2048);
    expect(body.ticket.startedAt).toBe(STARTED.toISOString());
  });

  it('007-3 BACKLOG에서 TODO로 이동하면 startedAt이 현재 시각으로 설정된다', async () => {
    const ticket = await insertTicket({ status: 'BACKLOG' });

    const { body } = await move(ticket.id, 'TODO', 0);

    expectNearNow(body.ticket.startedAt);
  });

  it('007-4 TODO에서 BACKLOG로 이동하면 startedAt = null', async () => {
    const ticket = await insertTicket({ status: 'TODO', startedAt: STARTED });

    const { body } = await move(ticket.id, 'BACKLOG', 0);

    expect(body.ticket.startedAt).toBeNull();
  });

  it('007-5 DONE에서 TODO로 이동하면 completedAt = null, startedAt이 설정된다', async () => {
    const ticket = await insertTicket({
      status: 'DONE',
      completedAt: new Date(),
    });

    const { body } = await move(ticket.id, 'TODO', 0);

    expect(body.ticket.status).toBe('TODO');
    expect(body.ticket.completedAt).toBeNull();
    expectNearNow(body.ticket.startedAt);
  });

  it('007-6 DONE에서 BACKLOG로 이동하면 completedAt = null, startedAt = null', async () => {
    const ticket = await insertTicket({
      status: 'DONE',
      startedAt: STARTED,
      completedAt: new Date(),
    });

    const { body } = await move(ticket.id, 'BACKLOG', 0);

    expect(body.ticket.completedAt).toBeNull();
    expect(body.ticket.startedAt).toBeNull();
  });

  it('007-7 TODO에서 IN_PROGRESS로 이동하면 startedAt은 바뀌지 않는다', async () => {
    const ticket = await insertTicket({ status: 'TODO', startedAt: STARTED });

    const { body } = await move(ticket.id, 'IN_PROGRESS', 0);

    expect(body.ticket.status).toBe('IN_PROGRESS');
    expect(body.ticket.startedAt).toBe(STARTED.toISOString());
  });

  it('007-8 중간에 삽입할 자리가 없으면 영향받은 티켓이 affected에 포함된다', async () => {
    const x = await insertTicket({ status: 'IN_PROGRESS', position: 10 });
    const y = await insertTicket({ status: 'IN_PROGRESS', position: 11 });
    const z = await insertTicket({ status: 'BACKLOG' });

    const { body } = await move(z.id, 'IN_PROGRESS', 1);

    expect(body.affected).toEqual(
      expect.arrayContaining([
        { id: x.id, position: 0 },
        { id: y.id, position: 2048 },
      ]),
    );
  });

  it('007-9 status로 DONE을 보내면 400, VALIDATION_ERROR', async () => {
    const ticket = await insertTicket({ status: 'TODO' });

    await expectError(
      await reorder({ ticketId: ticket.id, status: 'DONE', position: 0 }),
      400,
      'VALIDATION_ERROR',
      '상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요',
    );
  });

  it('007-10 잘못된 status면 400, "상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요"', async () => {
    const ticket = await insertTicket({ status: 'TODO' });

    await expectError(
      await reorder({ ticketId: ticket.id, status: 'INVALID', position: 0 }),
      400,
      'VALIDATION_ERROR',
      '상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요',
    );
  });

  it('007-11 없는 ticketId면 404, "티켓을 찾을 수 없습니다"', async () => {
    await expectError(
      await reorder({ ticketId: MISSING_ID, status: 'TODO', position: 0 }),
      404,
      'TICKET_NOT_FOUND',
      '티켓을 찾을 수 없습니다',
    );
  });

  it('007-12 이동하면 updatedAt이 갱신된다', async () => {
    const ticket = await insertTicket({ status: 'BACKLOG', updatedAt: PAST });

    const { body } = await move(ticket.id, 'TODO', 0);

    expect(new Date(body.ticket.updatedAt).getTime()).toBeGreaterThan(
      PAST.getTime(),
    );
  });

  it('007-13 IN_PROGRESS에서 BACKLOG로 이동하면 startedAt = null', async () => {
    const ticket = await insertTicket({
      status: 'IN_PROGRESS',
      startedAt: STARTED,
    });

    const { body } = await move(ticket.id, 'BACKLOG', 0);

    expect(body.ticket.startedAt).toBeNull();
  });

  it('007-14 position 10, 11 사이(인덱스 1)에 삽입하면 칼럼이 0, 1024, 2048로 재정렬된다', async () => {
    const x = await insertTicket({ status: 'IN_PROGRESS', position: 10 });
    const y = await insertTicket({ status: 'IN_PROGRESS', position: 11 });
    const z = await insertTicket({ status: 'BACKLOG' });

    const { body } = await move(z.id, 'IN_PROGRESS', 1);

    expect(body.ticket.position).toBe(1024);
    expect(body.affected).toHaveLength(2);
    expect(body.affected).toEqual(
      expect.arrayContaining([
        { id: x.id, position: 0 },
        { id: y.id, position: 2048 },
      ]),
    );
  });

  it('007-15 빈 칼럼으로 이동하면 position = 0, affected = []', async () => {
    const ticket = await insertTicket({ status: 'BACKLOG' });

    const { body } = await move(ticket.id, 'IN_PROGRESS', 3);

    expect(body.ticket.position).toBe(0);
    expect(body.affected).toEqual([]);
  });

  it.each([
    [
      { ticketId: 'x', status: 'TODO', position: 0 },
      '티켓 ID가 올바르지 않습니다',
    ],
    [{ status: 'TODO', position: 0 }, '티켓 ID가 올바르지 않습니다'],
    [
      { ticketId: 1, status: 'TODO', position: -1 },
      '위치 값이 올바르지 않습니다',
    ],
    [
      { ticketId: 1, status: 'TODO', position: 1.5 },
      '위치 값이 올바르지 않습니다',
    ],
    [{ ticketId: 1, status: 'TODO' }, '위치 값이 올바르지 않습니다'],
  ])('007-16 %j이면 400, "%s"', async (input, message) => {
    await expectError(await reorder(input), 400, 'VALIDATION_ERROR', message);
  });

  describe('position 계산 보충', () => {
    it('두 카드 사이에 정수 자리가 있으면 floor((prev + next) / 2)이고 affected = []', async () => {
      await insertTicket({ status: 'TODO', position: 0 });
      await insertTicket({ status: 'TODO', position: 1024 });
      const moving = await insertTicket({ status: 'BACKLOG' });

      const { body } = await move(moving.id, 'TODO', 1);

      expect(body.ticket.position).toBe(512);
      expect(body.affected).toEqual([]);
    });

    it('맨 앞(인덱스 0)이면 첫 카드 position - 1024', async () => {
      await insertTicket({ status: 'TODO', position: 100 });
      const moving = await insertTicket({ status: 'BACKLOG' });

      const { body } = await move(moving.id, 'TODO', 0);

      expect(body.ticket.position).toBe(-924);
    });

    it('칼럼 길이 이상의 인덱스면 맨 뒤: 마지막 카드 position + 1024', async () => {
      await insertTicket({ status: 'TODO', position: 100 });
      const moving = await insertTicket({ status: 'BACKLOG' });

      const { body } = await move(moving.id, 'TODO', 99);

      expect(body.ticket.position).toBe(1124);
    });
  });
});
