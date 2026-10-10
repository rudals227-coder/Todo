import { NextResponse } from 'next/server';
import { ticketIdSchema } from '@/shared/validations/ticket';
import { completeTicket } from '@/server/services/ticketService';
import { validate } from '@/server/middleware/validate';
import { handleError } from '@/server/middleware/errorHandler';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: RouteContext) {
  try {
    const id = validate(ticketIdSchema, (await params).id);

    return NextResponse.json(await completeTicket(id));
  } catch (error) {
    return handleError(error);
  }
}
