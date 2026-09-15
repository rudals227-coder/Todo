import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { tickets } from '../db/schema';
import type { CreateTicketInput } from '../../shared/validations/ticket';

export async function createTicket(input: CreateTicketInput) {
  const [{ minPosition }] = await db
    .select({ minPosition: sql<number | null>`min(${tickets.position})` })
    .from(tickets)
    .where(eq(tickets.status, 'BACKLOG'));

  const position = minPosition === null ? 0 : minPosition - 1024;

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
