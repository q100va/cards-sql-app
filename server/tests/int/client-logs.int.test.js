function makeItem(overrides = {}) {
  return {
    ts: new Date().toISOString(),
    level: 'warn',
    message: 'Client warning',
    sessionId: 'session-123',
    ...overrides,
  };
}

function makeBatch(overrides = {}) {
  return { app: 'cards-sql-app', env: 'development', items: [makeItem()], ...overrides };
}

describe('POST /api/client-logs', () => {
  test('accepts a valid warning log batch', async () => {
    const res = await global.api.post('/api/client-logs').send(makeBatch());

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
  });

  test('accepts a valid error log with optional fields', async () => {
    const res = await global.api
      .post('/api/client-logs')
      .send(
        makeBatch({
          env: 'production',
          items: [
            makeItem({
              level: 'error',
              message: 'Client error',
              stack: 'Error: test failure',
              pageUrl: 'http://localhost/orders',
              route: '/orders',
              userId: 42,
              sessionId: 'session-456',
              corrId: 'corr-123',
              userAgent: 'Jest integration test',
              context: { source: 'integration-test', nested: { value: 'test' } },
            }),
          ],
        }),
      );

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
  });

  test('returns 422 when the request body fails validation', async () => {
    const res = await global.api
      .post('/api/client-logs')
      .send({ app: 'wrong-app', env: 'development', items: [] });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
    expect(res.body).toHaveProperty('correlationId');
  });

  test('returns 429 when the client exceeds the log rate limit', async () => {
    const oversizedInvalidBatch = {
      app: 'cards-sql-app',
      env: 'development',
      items: Array.from({ length: 200 }, () => ({})),
    };

    const first = await global.api.post('/api/client-logs').send(oversizedInvalidBatch);

    expect(first.status).toBe(422);

    const second = await global.api.post('/api/client-logs').send(oversizedInvalidBatch);

    expect(second.status).toBe(429);
  });
});
