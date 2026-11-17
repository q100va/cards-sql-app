/** @jest-environment node */

import { jest } from '@jest/globals';

const AuditLog = { create: jest.fn() };

const logger = { error: jest.fn() };

jest.unstable_mockModule('../../models/index.js', () => ({ AuditLog }));

jest.unstable_mockModule('../../logging/logger.js', () => ({ default: logger }));

const { auditAuthEvent } = await import('../../audit/audit-auth.js');

function makeReq({
  ip = '10.0.0.1',
  correlationId = 'corr-1',
  id = 'req-1',
  body = { userName: 'alice' },
  userAgent = 'test-agent',
} = {}) {
  return {
    ip,
    correlationId,
    id,
    body,
    get: jest.fn((header) => header === 'user-agent' ? userAgent : undefined),
  };
}

describe('auditAuthEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    AuditLog.create.mockResolvedValue(undefined);
  });

  test('writes an authentication audit event', async () => {
    const req = makeReq();

    await auditAuthEvent(req, {
      event: 'login_failed',
      userId: 7,
      entityId: 'custom-entity',
      reason: 'bad_password',
      details: { attemptsLeft: 3 },
    });

    expect(AuditLog.create).toHaveBeenCalledWith({
      action: 'auth',
      model: 'session',
      entityId: 'custom-entity',
      diff: {
        event: 'login_failed',
        reason: 'bad_password',
        details: { attemptsLeft: 3 },
      },
      actorUserId: 7,
      correlationId: 'corr-1',
      ip: '10.0.0.1',
      userAgent: 'test-agent',
    });
  });

  test('uses userId as entityId when explicit entityId is absent', async () => {
    const req = makeReq();

    await auditAuthEvent(req, {
      event: 'login_success',
      userId: 42,
    });

    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      entityId: '42',
      actorUserId: 42,
      diff: { event: 'login_success' },
    }));
  });

  test.each([
    [
      {
        body: { userName: 'alice' },
        ip: '10.0.0.1',
      },
      'alice',
    ],
    [
      {
        body: {},
        ip: '10.0.0.1',
      },
      '10.0.0.1',
    ],
    [
      {
        body: {},
        ip: null,
      },
      'unknown',
    ],
  ])('falls back to username, IP or unknown for entityId', async (reqOverrides, expectedEntityId) => {
    const req = makeReq(reqOverrides);

    await auditAuthEvent(req, { event: 'login_failed' });

    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      entityId: expectedEntityId,
      actorUserId: null,
    }));
  });

  test('falls back to req.id when correlationId is absent', async () => {
    const req = makeReq({
      correlationId: null,
      id: 'request-123',
    });

    await auditAuthEvent(req, { event: 'refresh_failed' });

    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      correlationId: 'request-123',
    }));
  });

  test('limits user-agent to 1024 characters', async () => {
    const longUserAgent = 'x'.repeat(1500);

    const req = makeReq({ userAgent: longUserAgent });

    await auditAuthEvent(req, {
      event: 'login_success',
      userId: 1,
    });

    const [auditRecord] = AuditLog.create.mock.calls[0];

    expect(auditRecord.userAgent).toHaveLength(1024);

    expect(auditRecord.userAgent).toBe(longUserAgent.slice(0, 1024));
  });

  test('does not throw when audit persistence fails', async () => {
    const error = new Error('audit database down');

    AuditLog.create.mockRejectedValue(error);

    const req = makeReq();

    await expect(auditAuthEvent(req, { event: 'login_failed' })).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith({ error }, 'Failed to write authentication audit log');
  });
});
