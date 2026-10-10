import type { z } from 'zod';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validate<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message);
  }

  return result.data;
}

// 파싱할 수 없거나 객체가 아닌 본문은 빈 객체로 간주한다 (API_SPEC 처리 규칙)
export async function readJsonObject(request: Request): Promise<unknown> {
  try {
    const body: unknown = await request.json();
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? body
      : {};
  } catch {
    return {};
  }
}
