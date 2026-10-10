import { NextResponse } from 'next/server';
import { ValidationError } from '@/server/middleware/validate';

export class NotFoundError extends Error {
  constructor(message = '티켓을 찾을 수 없습니다') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export function handleError(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: error.message } },
      { status: 400 },
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: { code: 'TICKET_NOT_FOUND', message: error.message } },
      { status: 404 },
    );
  }

  console.error(error);

  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: '서버 내부 오류' } },
    { status: 500 },
  );
}
