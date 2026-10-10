import { NextResponse } from 'next/server';
import { reorderTicketSchema } from '@/shared/validations/ticket';
import { reorderTicket } from '@/server/services/ticketService';
import { readJsonObject, validate } from '@/server/middleware/validate';
import { handleError } from '@/server/middleware/errorHandler';

export async function PATCH(request: Request) {
  try {
    const input = validate(reorderTicketSchema, await readJsonObject(request));

    return NextResponse.json(await reorderTicket(input));
  } catch (error) {
    return handleError(error);
  }
}
