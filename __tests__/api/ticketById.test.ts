import { GET, PATCH, DELETE } from '../../app/api/tickets/[id]/route';
import { insertTicket } from '../helpers/testDb';
import {
  MISSING_ID,
  expectError,
  jsonRequest,
  routeParams,
} from '../helpers/request';

const PAST = new Date('2020-01-01T00:00:00Z');

function get(id: number | string) {
  return GET(jsonRequest('GET', `/${id}`), routeParams(id));
}

function patch(id: number | string, body: unknown) {
  return PATCH(jsonRequest('PATCH', `/${id}`, body), routeParams(id));
}

function remove(id: number | string) {
  return DELETE(jsonRequest('DELETE', `/${id}`), routeParams(id));
}

describe('TC-API-003: GET /api/tickets/:id — 티켓 상세 조회', () => {
  it('003-1 존재하는 티켓이면 200과 전체 필드를 반환한다', async () => {
    const ticket = await insertTicket({
      title: '상세 조회',
      description: '설명',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      plannedStartDate: '2099-02-10',
      dueDate: '2099-02-15',
    });

    const response = await get(ticket.id);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: ticket.id,
      title: '상세 조회',
      description: '설명',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      position: ticket.position,
      plannedStartDate: '2099-02-10',
      dueDate: '2099-02-15',
      startedAt: null,
      completedAt: null,
    });
    expect(body.createdAt).toEqual(expect.any(String));
    expect(body.updatedAt).toEqual(expect.any(String));
  });

  it('003-2 없는 티켓이면 404, "티켓을 찾을 수 없습니다"', async () => {
    await expectError(
      await get(MISSING_ID),
      404,
      'TICKET_NOT_FOUND',
      '티켓을 찾을 수 없습니다',
    );
  });

  it.each(['abc', '0', '-1', '1.5'])(
    '003-3 id가 %s이면 400, "티켓 ID가 올바르지 않습니다"',
    async (id) => {
      await expectError(
        await get(id),
        400,
        'VALIDATION_ERROR',
        '티켓 ID가 올바르지 않습니다',
      );
    },
  );

  it('003-4 isOverdue 파생 필드를 포함한다', async () => {
    const ticket = await insertTicket({
      status: 'TODO',
      dueDate: '2020-01-01',
    });

    const body = await (await get(ticket.id)).json();

    expect(body.isOverdue).toBe(true);
  });
});

describe('TC-API-004: PATCH /api/tickets/:id — 티켓 수정', () => {
  it('004-1 제목만 수정하면 제목만 바뀌고 나머지는 유지된다', async () => {
    const ticket = await insertTicket({
      title: '이전 제목',
      description: '유지',
      priority: 'HIGH',
    });

    const response = await patch(ticket.id, { title: '새 제목' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      title: '새 제목',
      description: '유지',
      priority: 'HIGH',
    });
  });

  it('004-2 우선순위를 변경한다', async () => {
    const ticket = await insertTicket({ priority: 'HIGH' });

    const body = await (await patch(ticket.id, { priority: 'LOW' })).json();

    expect(body.priority).toBe('LOW');
  });

  it('004-3 description: null이면 설명을 삭제한다', async () => {
    const ticket = await insertTicket({ description: '지울 설명' });

    const body = await (await patch(ticket.id, { description: null })).json();

    expect(body.description).toBeNull();
  });

  it('004-4 dueDate: null이면 종료예정일을 삭제한다', async () => {
    const ticket = await insertTicket({ dueDate: '2099-01-01' });

    const body = await (await patch(ticket.id, { dueDate: null })).json();

    expect(body.dueDate).toBeNull();
  });

  it('004-5 시작예정일을 수정한다', async () => {
    const ticket = await insertTicket();

    const body = await (
      await patch(ticket.id, { plannedStartDate: '2026-03-01' })
    ).json();

    expect(body.plannedStartDate).toBe('2026-03-01');
  });

  it('004-6 plannedStartDate: null이면 시작예정일을 삭제한다', async () => {
    const ticket = await insertTicket({ plannedStartDate: '2099-01-01' });

    const body = await (
      await patch(ticket.id, { plannedStartDate: null })
    ).json();

    expect(body.plannedStartDate).toBeNull();
  });

  it('004-7 없는 티켓을 수정하면 404, "티켓을 찾을 수 없습니다"', async () => {
    await expectError(
      await patch(MISSING_ID, { title: '새 제목' }),
      404,
      'TICKET_NOT_FOUND',
      '티켓을 찾을 수 없습니다',
    );
  });

  it('004-8 수정하면 updatedAt이 갱신된다', async () => {
    const ticket = await insertTicket({ updatedAt: PAST });

    const body = await (await patch(ticket.id, { title: '갱신' })).json();

    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(PAST.getTime());
  });

  it('004-9 status 등 시스템 필드는 보내도 바뀌지 않는다', async () => {
    const ticket = await insertTicket({ status: 'TODO', position: 77 });

    const response = await patch(ticket.id, {
      status: 'DONE',
      position: 1,
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:00:00Z',
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'TODO',
      position: 77,
      startedAt: null,
      completedAt: null,
    });
  });

  it('004 보충: 응답에 isOverdue가 포함된다', async () => {
    const ticket = await insertTicket({ status: 'TODO' });

    const body = await (await patch(ticket.id, { title: '보충' })).json();

    expect(body.isOverdue).toBe(false);
  });

  it.each([
    [{ title: '' }, '제목을 입력해주세요'],
    [{ title: 'a'.repeat(201) }, '제목은 200자 이내로 입력해주세요'],
    [{ description: 'a'.repeat(1001) }, '설명은 1000자 이내로 입력해주세요'],
    [{ priority: 'URGENT' }, '우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요'],
    [{ dueDate: '2020-01-01' }, '종료예정일은 오늘 이후 날짜를 선택해주세요'],
    [{ dueDate: '내일' }, '종료예정일 형식이 올바르지 않습니다'],
    [{ plannedStartDate: '2026-13-45' }, '시작예정일 형식이 올바르지 않습니다'],
  ])('004 보충: %j이면 400, "%s"', async (input, message) => {
    const ticket = await insertTicket();

    await expectError(
      await patch(ticket.id, input),
      400,
      'VALIDATION_ERROR',
      message,
    );
  });

  it('004 보충: id가 abc이면 400, "티켓 ID가 올바르지 않습니다"', async () => {
    await expectError(
      await patch('abc', { title: 'x' }),
      400,
      'VALIDATION_ERROR',
      '티켓 ID가 올바르지 않습니다',
    );
  });
});

describe('TC-API-006: DELETE /api/tickets/:id — 티켓 삭제', () => {
  it('006-1 정상 삭제하면 204이고 재조회 시 404다', async () => {
    const ticket = await insertTicket();

    const response = await remove(ticket.id);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect((await get(ticket.id)).status).toBe(404);
  });

  it('006-2 없는 티켓을 삭제하면 404, "티켓을 찾을 수 없습니다"', async () => {
    await expectError(
      await remove(MISSING_ID),
      404,
      'TICKET_NOT_FOUND',
      '티켓을 찾을 수 없습니다',
    );
  });

  it('006 보충: id가 abc이면 400, "티켓 ID가 올바르지 않습니다"', async () => {
    await expectError(
      await remove('abc'),
      400,
      'VALIDATION_ERROR',
      '티켓 ID가 올바르지 않습니다',
    );
  });
});
