import { z } from 'zod';
import { TIMEZONE } from '@/shared/constants';

const ID_MESSAGE = '티켓 ID가 올바르지 않습니다';
const POSITION_MESSAGE = '위치 값이 올바르지 않습니다';
const INT4_MAX = 2147483647;

// "오늘"은 서버·브라우저 시간대와 관계없이 Asia/Seoul 기준 날짜(YYYY-MM-DD)로 판정한다
export function getTodayInSeoul(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// 달력에 실제로 있는 날짜인지 (예: 2026-02-30, 2026-13-45는 거부)
function isValidCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

// 형식·타입·달력 오류 모두 같은 필드 메시지를 쓴다
function dateString(message: string) {
  return z
    .string({ invalid_type_error: message })
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine(isValidCalendarDate, message);
}

// --- 생성·수정 공용 필드 규칙 ---

const titleField = z
  .string({
    required_error: '제목을 입력해주세요',
    invalid_type_error: '제목을 입력해주세요',
  })
  .min(1, '제목을 입력해주세요')
  .max(200, '제목은 200자 이내로 입력해주세요')
  .refine((val) => val.trim().length > 0, '제목을 입력해주세요');

const descriptionField = z
  .string({ invalid_type_error: '설명은 1000자 이내로 입력해주세요' })
  .max(1000, '설명은 1000자 이내로 입력해주세요');

const priorityField = z.enum(['LOW', 'MEDIUM', 'HIGH'], {
  errorMap: () => ({
    message: '우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요',
  }),
});

const plannedStartDateField = dateString('시작예정일 형식이 올바르지 않습니다');

const dueDateField = dateString('종료예정일 형식이 올바르지 않습니다')
  // 형식이 틀리면 이 규칙은 통과시켜 형식 메시지만 남긴다
  .refine(
    (val) => !isValidCalendarDate(val) || val >= getTodayInSeoul(),
    '종료예정일은 오늘 이후 날짜를 선택해주세요',
  );

// --- 스키마 ---

export const createTicketSchema = z.object({
  title: titleField,
  description: descriptionField.optional(),
  priority: priorityField.optional(),
  plannedStartDate: plannedStartDateField.optional(),
  dueDate: dueDateField.optional(),
});

// null은 삭제를 뜻하며 형식·날짜 검사를 건너뛴다
export const updateTicketSchema = z.object({
  title: titleField.optional(),
  description: descriptionField.nullable().optional(),
  priority: priorityField.optional(),
  plannedStartDate: plannedStartDateField.nullable().optional(),
  dueDate: dueDateField.nullable().optional(),
});

// 경로 문자열 "12"를 숫자로 바꿔 검사한다 (int4 범위)
export const ticketIdSchema = z.coerce
  .number({ invalid_type_error: ID_MESSAGE })
  .int(ID_MESSAGE)
  .positive(ID_MESSAGE)
  .max(INT4_MAX, ID_MESSAGE);

export const reorderTicketSchema = z.object({
  ticketId: z
    .number({ required_error: ID_MESSAGE, invalid_type_error: ID_MESSAGE })
    .int(ID_MESSAGE)
    .positive(ID_MESSAGE)
    .max(INT4_MAX, ID_MESSAGE),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS'], {
    errorMap: () => ({
      message: '상태는 BACKLOG, TODO, IN_PROGRESS 중 선택해주세요',
    }),
  }),
  // 대상 칼럼 내 인덱스 (0부터, 이동 티켓 제외)
  position: z
    .number({
      required_error: POSITION_MESSAGE,
      invalid_type_error: POSITION_MESSAGE,
    })
    .int(POSITION_MESSAGE)
    .min(0, POSITION_MESSAGE),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type ReorderTicketInput = z.infer<typeof reorderTicketSchema>;
