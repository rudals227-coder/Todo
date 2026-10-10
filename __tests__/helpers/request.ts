const BASE_URL = 'http://localhost/api/tickets';

export function jsonRequest(
  method: string,
  path: string,
  body?: unknown,
): Request {
  return new Request(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// Next.js 15 Route Handler의 두 번째 인자 형식
export function routeParams(id: number | string) {
  return { params: Promise.resolve({ id: String(id) }) };
}

// 존재하지 않는 티켓 ID (int4 범위 안)
export const MISSING_ID = 2147483000;

export async function expectError(
  response: Response,
  status: number,
  code: string,
  message: string,
) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ error: { code, message } });
}

// 시각 문자열이 현재 시각과 ms 이내인지 확인한다
export function expectNearNow(isoString: string | null, ms = 10_000) {
  expect(isoString).not.toBeNull();
  const diff = Math.abs(new Date(isoString as string).getTime() - Date.now());
  expect(diff).toBeLessThan(ms);
}
