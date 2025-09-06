// server/tests/unit/correlation-id.unit.test.js
import { jest } from '@jest/globals';

// Mock 'crypto' BEFORE importing the middleware
const cryptoMock = { randomUUID: jest.fn(() => 'uuid-fixed-0000-0000-0000-000000000000') };
jest.unstable_mockModule('crypto', () => cryptoMock);

const { correlationId } = await import('../../middlewares/correlation-id.js');

function run(headers = {}) {
  // Normalize header keys to lowercase like Node does
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );

  const req = {
    headers: lower,
    correlationId: undefined,
    // mimic Express's req.get
    get: (h) => lower[h.toLowerCase()],
    method: 'GET',
    url: '/',
    ip: '127.0.0.1',
  };
  const res = { setHeader: jest.fn() };
  const next = jest.fn();

  correlationId()(req, res, next);
  return { req, res, next };
}

describe('correlationId middleware (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers x-request-id over x-correlation-id when both provided', () => {
    const r = run({
      'x-request-id': 'req-123_ABC',
      'x-correlation-id': 'corr-ignored',
    });

    expect(r.req.correlationId).toBe('req-123_ABC');
    expect(r.res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'req-123_ABC');
    expect(r.next).toHaveBeenCalled();
  });

  it('uses x-correlation-id when x-request-id is absent', () => {
    const r = run({ 'x-correlation-id': 'corr-xyz-001' });

    expect(r.req.correlationId).toBe('corr-xyz-001');
    expect(r.res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'corr-xyz-001');
  });

  it('accepts array header, using the first element', () => {
    const r = run({ 'x-request-id': ['first-id', 'second-id'] });

    expect(r.req.correlationId).toBe('first-id');
    expect(r.res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'first-id');
  });

  it('rejects invalid header (fails ALLOWED) and generates a UUID', () => {
    const r = run({ 'x-request-id': 'bad id with spaces!' });

    expect(cryptoMock.randomUUID).toHaveBeenCalled();
    expect(r.req.correlationId).toBe('uuid-fixed-0000-0000-0000-000000000000');
    expect(r.res.setHeader).toHaveBeenCalledWith(
      'X-Request-Id',
      'uuid-fixed-0000-0000-0000-000000000000'
    );
  });
});
