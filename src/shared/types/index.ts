// --- 상태 및 우선순위 ---
export const TICKET_STATUS = {
  BACKLOG: 'BACKLOG',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const TICKET_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type TicketPriority =
  (typeof TICKET_PRIORITY)[keyof typeof TICKET_PRIORITY];

// --- 칼럼 순서 정의 ---
export const COLUMN_ORDER: TicketStatus[] = [
  TICKET_STATUS.BACKLOG,
  TICKET_STATUS.TODO,
  TICKET_STATUS.IN_PROGRESS,
  TICKET_STATUS.DONE,
];

export const COLUMN_LABELS: Record<TicketStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'TODO',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

// --- 티켓 타입 ---
export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  position: number;
  plannedStartDate: string | null; // YYYY-MM-DD, 시작예정일
  dueDate: string | null; // YYYY-MM-DD, 종료예정일
  startedAt: Date | null; // 시작일 (상태 이동 시 시스템 설정)
  completedAt: Date | null; // 종료일 (완료 시 시스템 설정)
  createdAt: Date;
  updatedAt: Date;
}

// 파생 필드 포함 (조회 응답용)
export interface TicketWithMeta extends Ticket {
  isOverdue: boolean; // dueDate < 오늘(Asia/Seoul) && status !== DONE
}

// PATCH /api/tickets/reorder — DONE은 허용하지 않음
export type ReorderableStatus = Exclude<
  TicketStatus,
  typeof TICKET_STATUS.DONE
>;

// --- 보드 데이터 구조 ---
export type BoardData = Record<TicketStatus, TicketWithMeta[]>;

// --- API 요청 타입 (Zod 스키마에서 추론) ---
export type {
  CreateTicketInput,
  UpdateTicketInput,
  ReorderTicketInput,
} from '@/shared/validations/ticket';
