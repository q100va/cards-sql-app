/** @jest-environment node */

import { jest } from '@jest/globals';

const sequelize = { query: jest.fn() };

const cleanupAuditLogs = jest.fn();

jest.unstable_mockModule('../../database.js', () => ({ default: sequelize }));

jest.unstable_mockModule('../../retention/audit-cleanup.js', () => ({ cleanupAuditLogs }));

const { runAuditCleanupCatchUp } = await import('../../retention/startup-catchup.js');

describe('runAuditCleanupCatchUp', () => {
  const now = Date.UTC(2026, 10, 11, 12, 0, 0);

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(Date, 'now').mockReturnValue(now);

    cleanupAuditLogs.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('creates maintenance state table before checking last cleanup', async () => {
    sequelize.query.mockResolvedValueOnce(undefined).mockResolvedValueOnce([
      [
        {
          last_run: new Date(now - 60 * 60 * 1000),
        },
      ],
    ]);

    await runAuditCleanupCatchUp();

    const [createStateSql] = sequelize.query.mock.calls[0];

    expect(createStateSql).toContain('CREATE TABLE IF NOT EXISTS maintenance_state');

    const [selectSql] = sequelize.query.mock.calls[1];

    expect(selectSql).toContain('SELECT last_run');

    expect(selectSql).toContain("key = 'audit_cleanup'");
  });

  test('runs cleanup when no previous cleanup exists', async () => {
    sequelize.query.mockResolvedValueOnce(undefined).mockResolvedValueOnce([[]]);

    await runAuditCleanupCatchUp();

    expect(cleanupAuditLogs).toHaveBeenCalledTimes(1);
  });

  test('does not run cleanup when last cleanup was less than 24 hours ago', async () => {
    const recent = new Date(now - 23 * 60 * 60 * 1000);

    sequelize.query.mockResolvedValueOnce(undefined).mockResolvedValueOnce([[{ last_run: recent }]]);

    await runAuditCleanupCatchUp();

    expect(cleanupAuditLogs).not.toHaveBeenCalled();
  });

  test('runs cleanup when last cleanup was exactly 24 hours ago', async () => {
    const old = new Date(now - 24 * 60 * 60 * 1000);

    sequelize.query.mockResolvedValueOnce(undefined).mockResolvedValueOnce([[{ last_run: old }]]);

    await runAuditCleanupCatchUp();

    expect(cleanupAuditLogs).toHaveBeenCalledTimes(1);
  });

  test('runs cleanup when stored last_run is invalid', async () => {
    sequelize.query.mockResolvedValueOnce(undefined).mockResolvedValueOnce([
      [
        {
          last_run: 'not-a-date',
        },
      ],
    ]);

    await runAuditCleanupCatchUp();

    expect(cleanupAuditLogs).toHaveBeenCalledTimes(1);
  });

  test('propagates database errors and does not start cleanup', async () => {
    sequelize.query.mockRejectedValue(new Error('state query failed'));

    await expect(runAuditCleanupCatchUp()).rejects.toThrow('state query failed');

    expect(cleanupAuditLogs).not.toHaveBeenCalled();
  });
});
