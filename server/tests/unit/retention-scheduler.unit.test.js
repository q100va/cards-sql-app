/** @jest-environment node */

import { jest } from '@jest/globals';

const scheduledTask = { stop: jest.fn() };

const cron = { schedule: jest.fn() };

const cleanupAuditLogs = jest.fn();

const logger = { error: jest.fn() };

jest.unstable_mockModule('node-cron', () => ({ default: cron }));

jest.unstable_mockModule('../../retention/audit-cleanup.js', () => ({ cleanupAuditLogs }));

jest.unstable_mockModule('../../logging/logger.js', () => ({ default: logger }));

const { scheduleAuditCleanup } = await import('../../retention/scheduler.js');

describe('scheduleAuditCleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    cron.schedule.mockReturnValue(scheduledTask);

    cleanupAuditLogs.mockResolvedValue(undefined);
  });

  test('schedules audit cleanup every day at 03:15 New York time', () => {
    const result = scheduleAuditCleanup();

    expect(result).toBe(scheduledTask);

    expect(cron.schedule).toHaveBeenCalledTimes(1);

    expect(cron.schedule).toHaveBeenCalledWith('15 3 * * *', expect.any(Function), {
      timezone: 'America/New_York',
    });
  });

  test('runs audit cleanup when scheduled callback fires', async () => {
    scheduleAuditCleanup();

    const callback = cron.schedule.mock.calls[0][1];

    await callback();

    expect(cleanupAuditLogs).toHaveBeenCalledTimes(1);

    expect(logger.error).not.toHaveBeenCalled();
  });

  test('logs scheduled cleanup failures without throwing', async () => {
    const error = new Error('cleanup failed');

    cleanupAuditLogs.mockRejectedValue(error);

    scheduleAuditCleanup();

    const callback = cron.schedule.mock.calls[0][1];

    await expect(callback()).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith({ err: error }, '[retention] scheduled audit cleanup failed');
  });
});
