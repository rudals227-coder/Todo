import { PATCH } from '../../app/api/tickets/[id]/complete/route';
import { clearColumn, insertTicket } from '../helpers/testDb';
import {
  MISSING_ID,
  expectError,
  expectNearNow,
  jsonRequest,
  routeParams,
} from '../helpers/request';

const PAST = new Date('2020-01-01T00:00:00Z');

function complete(id: number | string) {
  return PATCH(jsonRequest('PATCH', `/${id}/complete`), routeParams(id));
}

describe('TC-API-005: PATCH /api/tickets/:id/complete — 티켓 완료', () => {
  beforeEach(async () => {
    await clearColumn('DONE');
  });

  it('005-1 정상 완료 처리하면 200, status=DONE, completedAt이 설정된다', async () => {
    const ticket = await insertTicket({ status: 'IN_PROGRESS' });

    const response = await complete(ticket.id);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(ticket.id);
    expect(body.status).toBe('DONE');
    expect(body.completedAt).not.toBeNull();
  });

  it('005-2 completedAt은 현재 시각으로 설정된다', async () => {
    const ticket = await insertTicket({ status: 'TODO' });

    const body = await (await complete(ticket.id)).json();

    expectNearNow(body.completedAt);
  });

  it('005-3 Done 칼럼 맨 위 position이 할당된다 (빈 칼럼이면 -1024, 다음은 -2048)', async () => {
    const first = await insertTicket({ status: 'TODO' });
    const second = await insertTicket({ status: 'TODO' });

    const firstBody = await (await complete(first.id)).json();
    const secondBody = await (await complete(second.id)).json();

    expect(firstBody.position).toBe(-1024);
    expect(secondBody.position).toBe(-2048);
  });

  it('005-4 없는 티켓을 완료하면 404, "티켓을 찾을 수 없습니다"', async () => {
    await expectError(
      await complete(MISSING_ID),
      404,
      'TICKET_NOT_FOUND',
      '티켓을 찾을 수 없습니다',
    );
  });

  it('005-5 완료하면 updatedAt이 갱신된다', async () => {
    const ticket = await insertTicket({ status: 'TODO', updatedAt: PAST });

    const body = await (await complete(ticket.id)).json();

    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(PAST.getTime());
  });

  it('005 보충: startedAt은 바뀌지 않는다', async () => {
    const startedAt = new Date('2026-01-05T00:00:00Z');
    const ticket = await insertTicket({ status: 'IN_PROGRESS', startedAt });

    const body = await (await complete(ticket.id)).json();

    expect(body.startedAt).toBe(startedAt.toISOString());
  });

  it('005 보충: id가 abc이면 400, "티켓 ID가 올바르지 않습니다"', async () => {
    await expectError(
      await complete('abc'),
      400,
      'VALIDATION_ERROR',
      '티켓 ID가 올바르지 않습니다',
    );
  });
});
