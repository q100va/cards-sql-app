import { jest } from "@jest/globals";
import request from 'supertest';
import { makeTestApp } from "./makeApp.js";

// До импортов роутера
const loggerMock = {
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),  // реальный мок — переопределим ниже
  },
};
jest.unstable_mockModule('../logging/logger.js', () => loggerMock);

const { default: router } = await import('../routes/client-logs.js');
const { default: logger } = await import('../logging/logger.js');

// 4) Валидный батч (под твою схему)
const goodBatch = {
  app: 'cards-sql-app',
  env: 'development',
  items: [
    {
      ts: new Date().toISOString(),
      level: 'error',
      message: 'boom',
      pageUrl: '/x',
      route: '/x',
      userId: 1,
      sessionId: 's123456789',
      userAgent: 'UA',
      stack: 'stack',
      context: { a: 1 },
    },
    {
      ts: new Date().toISOString(),
      level: 'warn',
      message: 'minor issue',
      pageUrl: '/x',
      route: '/x',
      userId: 1,
      sessionId: 'sess-123456789',
      userAgent: 'UA',
      context: { a: 1 },
    },
  ],
};

describe('POST /api/client-logs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts a valid batch and logs each item with proper level (204)', async () => {
    const res = await request(makeTestApp(router, '/'))
      .post('/')
      .set('Content-Type', 'application/json') // не строго нужно, но полезно
      .set('Accept', 'application/json')
      .send(goodBatch);

    expect(res.status).toBe(204);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        client: true,
        app: 'cards-sql-app',
        env: 'development',
        sessionId: 'sess-123456789',
      }),
      'minor issue'
    );

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        client: true,
        app: 'cards-sql-app',
        env: 'development',
        sessionId: 's123456789'
      }),
      'boom'
    );
  });

  it('returns 400 (via validateRequest) on invalid payload', async () => {
    const res = await request(makeTestApp(router, '/'))
      .post('/')
      .set('Content-Type', 'application/json')
      .send({}); // заведомо невалидно

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/i);
    expect(res.body).toMatchObject({
      message: 'Неверный формат данных запроса.',
    });
  });

  it('bubbles up internal errors to error handler (500 + user message)', async () => {
    // первый вызов logger.error упадёт внутри роутера,
    // но внутри handleError — уже НЕ упадёт
    logger.error
      .mockImplementationOnce(() => { throw new Error('logger down'); })
      .mockImplementation(() => { });

    const res = await request(makeTestApp(router, '/'))
      .post('/')
      .send(goodBatch); // env: 'development'

    expect(res.status).toBe(500);
    expect(res.headers['content-type']).toMatch(/application\/json/i);
    expect(res.body).toMatchObject({
      message: 'Не удалось принять логи клиента.',
      code: null,
    });
  });
});
