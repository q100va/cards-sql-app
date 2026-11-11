/** @jest-environment node */

import { jest } from '@jest/globals';

const originalRetentionDays = process.env.AUDIT_RETENTION_DAYS;

const fakeTx = { id: 'tx-audit-cleanup' };

const sequelize = {
  transaction: jest.fn(),
  query: jest.fn(),
};

const logger = { info: jest.fn() };

jest.unstable_mockModule('../../database.js', () => ({ default: sequelize }));

jest.unstable_mockModule('../../logging/logger.js', () => ({ default: logger }));

const {
  cleanupAuditLogs,
  getAuditRetentionDays,
} = await import('../../retention/audit-cleanup.js');

describe('audit cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    delete process.env.AUDIT_RETENTION_DAYS;

    sequelize.transaction.mockImplementation(async (callback) => callback(fakeTx));

    sequelize.query.mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (originalRetentionDays === undefined) {
      delete process.env.AUDIT_RETENTION_DAYS;
    } else {
      process.env.AUDIT_RETENTION_DAYS = originalRetentionDays;
    }
  });

  describe('getAuditRetentionDays', () => {
    test('uses 180 days by default', () => {
      expect(getAuditRetentionDays()).toBe(180);
    });

    test('uses a valid configured retention period', () => {
      process.env.AUDIT_RETENTION_DAYS = '90';

      expect(getAuditRetentionDays()).toBe(90);
    });

    test.each(['0', '-10', 'not-a-number', ''])('falls back to 180 for invalid value %s', (value) => {
      process.env.AUDIT_RETENTION_DAYS = value;

      expect(getAuditRetentionDays()).toBe(180);
    });
  });

  describe('cleanupAuditLogs', () => {
    test('deletes expired audit logs and updates maintenance state in one transaction', async () => {
      process.env.AUDIT_RETENTION_DAYS = '90';

      await cleanupAuditLogs();

      expect(sequelize.transaction).toHaveBeenCalledTimes(1);

      expect(sequelize.query).toHaveBeenCalledTimes(2);

      const [deleteSql, deleteOptions] = sequelize.query.mock.calls[0];

      expect(deleteSql).toContain('DELETE FROM audit_logs');

      expect(deleteSql).toContain('"createdAt"');

      expect(deleteOptions).toEqual({
        replacements: { days: '90' },
        transaction: fakeTx,
      });

      const [stateSql, stateOptions] = sequelize.query.mock.calls[1];

      expect(stateSql).toContain('INSERT INTO maintenance_state');

      expect(stateSql).toContain("'audit_cleanup'");

      expect(stateSql).toContain('ON CONFLICT');

      expect(stateOptions).toEqual({ transaction: fakeTx });

      expect(logger.info).toHaveBeenCalledWith({ days: 90 }, '[retention] audit cleanup done');
    });

    test('propagates cleanup failures and does not log success', async () => {
      const error = new Error('delete failed');

      sequelize.query.mockRejectedValueOnce(error);

      await expect(cleanupAuditLogs()).rejects.toThrow('delete failed');

      expect(sequelize.query).toHaveBeenCalledTimes(1);

      expect(logger.info).not.toHaveBeenCalled();
    });
  });
});
