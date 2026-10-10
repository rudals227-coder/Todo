import { GET } from '../../app/api/tickets/route';
import { getTodayInSeoul } from '@/shared/validations/ticket';
import { insertTicket } from '../helpers/testDb';

const HOUR = 60 * 60 * 1000;
const COLUMNS = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'] as const;

type BoardTicket = {
  id: number;
  status: string;
  position: number;
  isOverdue: boolean;
  [key: string]: unknown;
};
type BoardResponse = {
  board: Record<(typeof COLUMNS)[number], BoardTicket[]>;
  total: number;
};

async function getBoard(): Promise<{ status: number; body: BoardResponse }> {
  const response = await GET();
  return { status: response.status, body: await response.json() };
}

function findTicket(body: BoardResponse, id: number) {
  for (const column of COLUMNS) {
    const ticket = body.board[column].find((t) => t.id === id);
    if (ticket) return { column, ticket };
  }
  return undefined;
}

describe('TC-API-002: GET /api/tickets — 보드 조회', () => {
  it('002-1 응답에 4개 칼럼 키가 항상 배열로 존재한다', async () => {
    const { status, body } = await getBoard();

    expect(status).toBe(200);
    expect(Object.keys(body.board).sort()).toEqual([...COLUMNS].sort());
    for (const column of COLUMNS) {
      expect(Array.isArray(body.board[column])).toBe(true);
    }
  });

  it('002-2 여러 상태의 티켓이 상태별 칼럼으로 그룹화된다', async () => {
    const created = await Promise.all([
      insertTicket({ status: 'BACKLOG' }),
      insertTicket({ status: 'TODO' }),
      insertTicket({ status: 'IN_PROGRESS' }),
      insertTicket({ status: 'DONE', completedAt: new Date() }),
    ]);

    const { body } = await getBoard();

    for (const ticket of created) {
      expect(findTicket(body, ticket.id)?.column).toBe(ticket.status);
    }
    for (const column of COLUMNS) {
      expect(body.board[column].every((t) => t.status === column)).toBe(true);
    }
  });

  it('002-3 같은 칼럼 안에서는 position 오름차순으로 정렬된다', async () => {
    await insertTicket({ status: 'TODO', position: 300 });
    await insertTicket({ status: 'TODO', position: 100 });
    await insertTicket({ status: 'TODO', position: 200 });

    const { body } = await getBoard();
    const positions = body.board.TODO.map((t) => t.position);

    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('002-4 total은 응답에 포함된 전체 티켓 수와 같다', async () => {
    await insertTicket({ status: 'BACKLOG' });

    const { body } = await getBoard();
    const count = COLUMNS.reduce((sum, c) => sum + body.board[c].length, 0);

    expect(body.total).toBe(count);
  });

  it('002-5 completedAt이 24시간 이내인 DONE 티켓은 Done 칼럼에 포함된다', async () => {
    const recent = await insertTicket({
      status: 'DONE',
      completedAt: new Date(Date.now() - 1 * HOUR),
    });

    const { body } = await getBoard();

    expect(body.board.DONE.some((t) => t.id === recent.id)).toBe(true);
  });

  it('002-6 completedAt이 24시간 이전인 DONE 티켓은 Done 칼럼에서 제외된다', async () => {
    const old = await insertTicket({
      status: 'DONE',
      completedAt: new Date(Date.now() - 25 * HOUR),
    });

    const { body } = await getBoard();

    expect(findTicket(body, old.id)).toBeUndefined();
  });

  it('002-7 모든 티켓에 boolean isOverdue가 포함된다', async () => {
    await insertTicket({ status: 'TODO' });

    const { body } = await getBoard();

    for (const column of COLUMNS) {
      for (const ticket of body.board[column]) {
        expect(typeof ticket.isOverdue).toBe('boolean');
      }
    }
  });

  it('002-8 모든 날짜 필드(plannedStartDate, dueDate, startedAt, completedAt)가 포함된다', async () => {
    const ticket = await insertTicket({
      status: 'TODO',
      plannedStartDate: '2099-01-01',
      dueDate: '2099-01-02',
      startedAt: new Date(),
    });

    const { body } = await getBoard();
    const found = findTicket(body, ticket.id)?.ticket;

    expect(found).toMatchObject({
      plannedStartDate: '2099-01-01',
      dueDate: '2099-01-02',
      completedAt: null,
    });
    expect(found?.startedAt).toEqual(expect.any(String));
  });
});

describe('TC-API-008: isOverdue 필드 계산', () => {
  it('008-1 dueDate < 오늘이고 status=TODO이면 isOverdue = true', async () => {
    const ticket = await insertTicket({
      status: 'TODO',
      dueDate: '2020-01-01',
    });

    const { body } = await getBoard();

    expect(findTicket(body, ticket.id)?.ticket.isOverdue).toBe(true);
  });

  it('008-2 dueDate < 오늘이어도 status=DONE이면 isOverdue = false', async () => {
    const ticket = await insertTicket({
      status: 'DONE',
      dueDate: '2020-01-01',
      completedAt: new Date(),
    });

    const { body } = await getBoard();

    expect(findTicket(body, ticket.id)?.ticket.isOverdue).toBe(false);
  });

  it('008 보충: 종료예정일이 오늘(Asia/Seoul)이거나 없으면 isOverdue = false', async () => {
    const today = await insertTicket({
      status: 'TODO',
      dueDate: getTodayInSeoul(),
    });
    const none = await insertTicket({ status: 'TODO' });

    const { body } = await getBoard();

    expect(findTicket(body, today.id)?.ticket.isOverdue).toBe(false);
    expect(findTicket(body, none.id)?.ticket.isOverdue).toBe(false);
  });
});
