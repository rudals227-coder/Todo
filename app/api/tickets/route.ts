import { NextResponse } from 'next/server';
import { createTicketSchema } from '@/shared/validations/ticket';
import { createTicket, getBoard } from '@/server/services/ticketService';
import { readJsonObject, validate } from '@/server/middleware/validate';
import { handleError } from '@/server/middleware/errorHandler';

export async function GET() {
  try {
    return NextResponse.json(await getBoard());
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = validate(createTicketSchema, await readJsonObject(request));
    const ticket = await createTicket(input);

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
