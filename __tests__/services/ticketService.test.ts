import { createTicket } from '@/server/services/ticketService';
import { clearBacklog } from '../helpers/testDb';

describe('ticketService.createTicket', () => {
  beforeEach(async () => {
    await clearBacklog();
  });

  it('Backlog가 비어 있으면 첫 티켓의 position은 -1024다', async () => {
    const ticket = await createTicket({ title: '첫 티켓' });

    expect(ticket.position).toBe(-1024);
  });

  it('Backlog에 티켓이 있으면 position은 기존 최솟값 - 1024다', async () => {
    await createTicket({ title: '첫 티켓' });
    const second = await createTicket({ title: '두 번째 티켓' });

    expect(second.position).toBe(-2048);
  });

  it('새 티켓은 BACKLOG·MEDIUM이며 시작일·종료일이 비어 있다', async () => {
    const ticket = await createTicket({ title: '기본값 확인' });

    expect(ticket.status).toBe('BACKLOG');
    expect(ticket.priority).toBe('MEDIUM');
    expect(ticket.startedAt).toBeNull();
    expect(ticket.completedAt).toBeNull();
  });
});
