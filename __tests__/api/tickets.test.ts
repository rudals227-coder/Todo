import { POST } from '../../app/api/tickets/route';

function createRequest(body: unknown): Request {
  return new Request('http://localhost/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tickets', () => {
  it('모든 필드를 포함하면 201과 함께 모든 필드가 반영된 티켓을 반환한다', async () => {
    const response = await POST(
      createRequest({
        title: 'API 설계 문서 작성',
        description: 'REST API 엔드포인트와 요청/응답 형식을 정의한다',
        priority: 'HIGH',
        plannedStartDate: '2099-01-10',
        dueDate: '2099-01-15',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      title: 'API 설계 문서 작성',
      description: 'REST API 엔드포인트와 요청/응답 형식을 정의한다',
      status: 'BACKLOG',
      priority: 'HIGH',
      plannedStartDate: '2099-01-10',
      dueDate: '2099-01-15',
      startedAt: null,
      completedAt: null,
    });
    expect(body.id).toBeDefined();
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it('제목만으로 생성하면 201과 함께 priority가 MEDIUM인 티켓을 반환한다', async () => {
    const response = await POST(createRequest({ title: '테스트 할일' }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.title).toBe('테스트 할일');
    expect(body.status).toBe('BACKLOG');
    expect(body.priority).toBe('MEDIUM');
    expect(body.description).toBeNull();
    expect(body.plannedStartDate).toBeNull();
    expect(body.dueDate).toBeNull();
    expect(body.startedAt).toBeNull();
    expect(body.completedAt).toBeNull();
  });

  it('제목이 없으면 400과 "제목을 입력해주세요" 에러를 반환한다', async () => {
    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('제목을 입력해주세요');
  });

  it('제목이 200자를 초과하면 400과 "제목은 200자 이내로 입력해주세요" 에러를 반환한다', async () => {
    const response = await POST(createRequest({ title: 'a'.repeat(201) }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('제목은 200자 이내로 입력해주세요');
  });

  it('종료예정일이 과거이면 400과 "종료예정일은 오늘 이후 날짜를 선택해주세요" 에러를 반환한다', async () => {
    const response = await POST(
      createRequest({ title: 'ok', dueDate: '2020-01-01' }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe(
      '종료예정일은 오늘 이후 날짜를 선택해주세요',
    );
  });

  it('우선순위 값이 잘못되면 400과 "우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요" 에러를 반환한다', async () => {
    const response = await POST(
      createRequest({ title: 'ok', priority: 'URGENT' }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe(
      '우선순위는 LOW, MEDIUM, HIGH 중 선택해주세요',
    );
  });
});
