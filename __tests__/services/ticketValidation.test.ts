import {
  createTicketSchema,
  getTodayInSeoul,
} from '@/shared/validations/ticket';

function firstMessage(input: unknown): string | undefined {
  const result = createTicketSchema.safeParse(input);
  return result.success ? undefined : result.error.issues[0].message;
}

describe('getTodayInSeoul', () => {
  it('UTC 15:30은 한국 시간으로 다음 날이므로 다음 날 날짜를 반환한다', () => {
    expect(getTodayInSeoul(new Date('2026-03-10T15:30:00Z'))).toBe(
      '2026-03-11',
    );
  });

  it('UTC 14:59:59는 한국 시간으로 같은 날 23:59:59이므로 같은 날 날짜를 반환한다', () => {
    expect(getTodayInSeoul(new Date('2026-03-10T14:59:59Z'))).toBe(
      '2026-03-10',
    );
  });
});

describe('createTicketSchema — 종료예정일 "오늘" 판정 (Asia/Seoul)', () => {
  beforeEach(() => {
    // 한국 시간 2026-03-11 00:30
    jest.useFakeTimers({ now: new Date('2026-03-10T15:30:00Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('한국 시간 기준 오늘(03-11)인 종료예정일은 허용한다', () => {
    expect(
      createTicketSchema.safeParse({ title: 'a', dueDate: '2026-03-11' })
        .success,
    ).toBe(true);
  });

  it('한국 시간 기준 어제(03-10)인 종료예정일은 거부한다', () => {
    expect(firstMessage({ title: 'a', dueDate: '2026-03-10' })).toBe(
      '종료예정일은 오늘 이후 날짜를 선택해주세요',
    );
  });
});

describe('createTicketSchema — 날짜 형식과 달력 유효성', () => {
  it.each(['2026-13-45', '2026-02-30', '2026/03/01'])(
    '시작예정일 %s는 "시작예정일 형식이 올바르지 않습니다"로 거부한다',
    (plannedStartDate) => {
      expect(firstMessage({ title: 'a', plannedStartDate })).toBe(
        '시작예정일 형식이 올바르지 않습니다',
      );
    },
  );

  it('윤년 날짜 2028-02-29는 시작예정일로 허용한다', () => {
    expect(
      createTicketSchema.safeParse({
        title: 'a',
        plannedStartDate: '2028-02-29',
      }).success,
    ).toBe(true);
  });

  it('종료예정일 "내일"은 오늘 이후 메시지가 아니라 형식 메시지로 거부한다', () => {
    expect(firstMessage({ title: 'a', dueDate: '내일' })).toBe(
      '종료예정일 형식이 올바르지 않습니다',
    );
  });
});

describe('createTicketSchema — 타입 오류 메시지', () => {
  it('제목이 문자열이 아니면 "제목을 입력해주세요"로 거부한다', () => {
    expect(firstMessage({ title: 123 })).toBe('제목을 입력해주세요');
  });

  it('설명이 문자열이 아니면 "설명은 1000자 이내로 입력해주세요"로 거부한다', () => {
    expect(firstMessage({ title: 'a', description: 5 })).toBe(
      '설명은 1000자 이내로 입력해주세요',
    );
  });

  it('종료예정일이 문자열이 아니면 "종료예정일 형식이 올바르지 않습니다"로 거부한다', () => {
    expect(firstMessage({ title: 'a', dueDate: 20991231 })).toBe(
      '종료예정일 형식이 올바르지 않습니다',
    );
  });
});
