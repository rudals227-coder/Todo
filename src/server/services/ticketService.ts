import { and, asc, eq, gte, ne, or, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { tickets } from '@/server/db/schema';
import { NotFoundError } from '@/server/middleware/errorHandler';
import { POSITION_GAP } from '@/shared/constants';
import {
  COLUMN_ORDER,
  TICKET_STATUS,
  type BoardData,
  type Ticket,
  type TicketStatus,
  type TicketWithMeta,
} from '@/shared/types';
import {
  getTodayInSeoul,
  type CreateTicketInput,
  type ReorderTicketInput,
  type UpdateTicketInput,
} from '@/shared/validations/ticket';

type TicketRow = typeof tickets.$inferSelect;
type ColumnItem = { id: number; position: number };

const DONE_VISIBLE_MS = 24 * 60 * 60 * 1000;

// 종료예정일이 오늘(Asia/Seoul)보다 이전이고 완료되지 않았으면 오버듀 (저장하지 않는 파생 필드)
function isOverdue(ticket: TicketRow, today: string): boolean {
  return (
    ticket.dueDate !== null &&
    ticket.status !== TICKET_STATUS.DONE &&
    ticket.dueDate < today
  );
}

function withMeta(ticket: TicketRow, today = getTodayInSeoul()) {
  return { ...(ticket as Ticket), isOverdue: isOverdue(ticket, today) };
}

// 칼럼(이동 티켓 제외)의 index 자리에 놓일 position. 사이에 정수가 없으면 null(재정렬 필요)
function positionAt(column: ColumnItem[], index: number): number | null {
  const prev = column[index - 1];
  const next = column[index];

  if (!prev && !next) return 0;
  if (!prev) return next.position - POSITION_GAP;
  if (!next) return prev.position + POSITION_GAP;
  if (next.position - prev.position < 2) return null;
  return Math.floor((prev.position + next.position) / 2);
}

export async function createTicket(input: CreateTicketInput) {
  const [{ minPosition }] = await db
    .select({ minPosition: sql<number | null>`min(${tickets.position})` })
    .from(tickets)
    .where(eq(tickets.status, TICKET_STATUS.BACKLOG));

  const position = (minPosition ?? 0) - POSITION_GAP;

  const [ticket] = await db
    .insert(tickets)
    .values({
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      position,
      plannedStartDate: input.plannedStartDate ?? null,
      dueDate: input.dueDate ?? null,
    })
    .returning();

  return ticket;
}

export async function getBoard(): Promise<{ board: BoardData; total: number }> {
  // Done 칼럼은 completedAt 기준 24시간 이내만 (서버 측 필터)
  const doneCutoff = new Date(Date.now() - DONE_VISIBLE_MS);
  const rows = await db
    .select()
    .from(tickets)
    .where(
      or(
        ne(tickets.status, TICKET_STATUS.DONE),
        gte(tickets.completedAt, doneCutoff),
      ),
    )
    .orderBy(asc(tickets.position), asc(tickets.id));

  const today = getTodayInSeoul();
  const board = Object.fromEntries(
    COLUMN_ORDER.map((status) => [status, [] as TicketWithMeta[]]),
  ) as BoardData;

  let total = 0;
  for (const row of rows) {
    const column = board[row.status as TicketStatus];
    if (!column) continue;
    column.push(withMeta(row, today));
    total += 1;
  }

  return { board, total };
}

export async function getTicket(id: number) {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
  if (!ticket) throw new NotFoundError();

  return withMeta(ticket);
}

export async function updateTicket(id: number, input: UpdateTicketInput) {
  const [ticket] = await db
    .update(tickets)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(tickets.id, id))
    .returning();
  if (!ticket) throw new NotFoundError();

  return withMeta(ticket);
}

export async function completeTicket(id: number) {
  return db.transaction(async (tx) => {
    const [{ minPosition }] = await tx
      .select({ minPosition: sql<number | null>`min(${tickets.position})` })
      .from(tickets)
      .where(and(eq(tickets.status, TICKET_STATUS.DONE), ne(tickets.id, id)));

    const now = new Date();
    const [ticket] = await tx
      .update(tickets)
      .set({
        status: TICKET_STATUS.DONE,
        position: (minPosition ?? 0) - POSITION_GAP,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(tickets.id, id))
      .returning();
    if (!ticket) throw new NotFoundError();

    return ticket;
  });
}

export async function deleteTicket(id: number) {
  const [deleted] = await db
    .delete(tickets)
    .where(eq(tickets.id, id))
    .returning({ id: tickets.id });
  if (!deleted) throw new NotFoundError();
}

export async function reorderTicket(input: ReorderTicketInput) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(tickets)
      .where(eq(tickets.id, input.ticketId))
      .for('update');
    if (!current) throw new NotFoundError();

    const column = await tx
      .select({ id: tickets.id, position: tickets.position })
      .from(tickets)
      .where(and(eq(tickets.status, input.status), ne(tickets.id, current.id)))
      .orderBy(asc(tickets.position), asc(tickets.id));

    const index = Math.min(input.position, column.length);
    const affected: ColumnItem[] = [];
    let position = positionAt(column, index);

    // 사이에 정수 자리가 없으면 칼럼 전체를 0, 1024, 2048, … 으로 재정렬
    if (position === null) {
      const ordered = [
        ...column.slice(0, index),
        { id: current.id, position: 0 },
        ...column.slice(index),
      ];
      for (const [i, item] of ordered.entries()) {
        const target = i * POSITION_GAP;
        if (item.id === current.id) {
          position = target;
        } else if (item.position !== target) {
          await tx
            .update(tickets)
            .set({ position: target })
            .where(eq(tickets.id, item.id));
          affected.push({ id: item.id, position: target });
        }
      }
    }

    // 상태가 바뀔 때만 시작일·종료일 규칙 적용
    const now = new Date();
    const statusChanged = current.status !== input.status;
    const timestamps: Partial<Pick<TicketRow, 'startedAt' | 'completedAt'>> =
      {};
    if (statusChanged && input.status === TICKET_STATUS.TODO) {
      timestamps.startedAt = now;
    }
    if (statusChanged && input.status === TICKET_STATUS.BACKLOG) {
      timestamps.startedAt = null;
    }
    if (current.status === TICKET_STATUS.DONE) {
      timestamps.completedAt = null;
    }

    const [ticket] = await tx
      .update(tickets)
      .set({
        status: input.status,
        position: position as number,
        ...timestamps,
        updatedAt: now,
      })
      .where(eq(tickets.id, current.id))
      .returning();

    return { ticket, affected };
  });
}
