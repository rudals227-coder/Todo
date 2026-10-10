import { z } from 'zod';
import { validate, ValidationError } from '@/server/middleware/validate';

const schema = z.object({
  title: z
    .string({ required_error: '제목을 입력해주세요' })
    .min(1, '제목을 입력해주세요'),
  count: z.number().max(3, '개수는 3 이하로 입력해주세요').optional(),
});

describe('validate', () => {
  it('검증에 성공하면 스키마로 파싱된 데이터를 반환한다', () => {
    const result = validate(schema, { title: '할 일', count: 1, extra: true });

    expect(result).toEqual({ title: '할 일', count: 1 });
  });

  it('검증에 실패하면 ValidationError를 던진다', () => {
    expect(() => validate(schema, {})).toThrow(ValidationError);
  });

  it('ValidationError의 메시지는 Zod 첫 번째 issue의 메시지다', () => {
    expect.assertions(2);
    try {
      validate(schema, { count: 5 });
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).toBe('제목을 입력해주세요');
    }
  });
});
