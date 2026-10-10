import { NextResponse } from 'next/server';
import {
  ticketIdSchema,
  updateTicketSchema,
} from '@/shared/validations/ticket';
import {
  deleteTicket,
  getTicket,
  updateTicket,
} from '@/server/services/ticketService';
import { readJsonObject, validate } from '@/server/middleware/validate';
import { handleError } from '@/server/middleware/errorHandler';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const id = validate(ticketIdSchema, (await params).id);

    return NextResponse.json(await getTicket(id));
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const id = validate(ticketIdSchema, (await params).id);
    const input = validate(updateTicketSchema, await readJsonObject(request));

    return NextResponse.json(await updateTicket(id, input));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const id = validate(ticketIdSchema, (await params).id);
    await deleteTicket(id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
