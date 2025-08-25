import { jest } from '@jest/globals';
import * as db from '../database.js';
import { withTransaction } from '../controllers/with-transaction.js';

describe('withTransaction - hard failure paths', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('propagates the original commit error even if rollback throws', async () => {
    // fresh tx per test
    const tx = {
      commit: jest.fn().mockRejectedValueOnce(new Error('commit failed')),
      rollback: jest.fn().mockRejectedValueOnce(new Error('rollback failed')),
    };

    // sequelize.transaction returns our fresh tx once
    jest.spyOn(db.default, 'transaction').mockImplementationOnce(async () => tx);

    await expect(
      withTransaction(async (_t) => {
        // callback ok -> commit will fail
        return 123;
      })
    ).rejects.toThrow('commit failed');

    // exactly once per this test
    expect(tx.commit).toHaveBeenCalledTimes(1);
    expect(tx.rollback).toHaveBeenCalledTimes(1);
  });

  it('propagates the original callback error even if rollback throws', async () => {
    const tx = {
      commit: jest.fn().mockResolvedValueOnce(undefined),
      rollback: jest.fn().mockRejectedValueOnce(new Error('rollback failed')),
    };
    jest.spyOn(db.default, 'transaction').mockImplementationOnce(async () => tx);

    await expect(
      withTransaction(async (_t) => {
        throw new Error('callback failed');
      })
    ).rejects.toThrow('callback failed');

    expect(tx.commit).not.toHaveBeenCalled();
    expect(tx.rollback).toHaveBeenCalledTimes(1);
  });
});
