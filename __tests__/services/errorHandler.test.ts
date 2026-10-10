import { handleError, NotFoundError } from '@/server/middleware/errorHandler';
import { ValidationError } from '@/server/middleware/validate';

describe('handleError', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('ValidationError는 400과 VALIDATION_ERROR 응답으로 바꾼다', async () => {
    const response = handleError(new ValidationError('제목을 입력해주세요'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: '제목을 입력해주세요' },
    });
  });

  it('NotFoundError는 404와 TICKET_NOT_FOUND "티켓을 찾을 수 없습니다" 응답으로 바꾼다', async () => {
    const response = handleError(new NotFoundError());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: 'TICKET_NOT_FOUND', message: '티켓을 찾을 수 없습니다' },
    });
  });

  it('그 외 오류는 500과 INTERNAL_ERROR "서버 내부 오류"로 바꾸고 내부 정보를 노출하지 않는다', async () => {
    const error = new Error('relation "tickets" does not exist');

    const response = handleError(error);
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(text)).toEqual({
      error: { code: 'INTERNAL_ERROR', message: '서버 내부 오류' },
    });
    expect(text).not.toContain('relation');
    expect(text).not.toContain(error.stack ?? 'stack');
  });

  it('Error가 아닌 값이 던져져도 500 INTERNAL_ERROR로 바꾼다', async () => {
    const response = handleError('예상치 못한 값');

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: '서버 내부 오류' },
    });
  });
});
