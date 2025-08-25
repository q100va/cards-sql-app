import { jest } from '@jest/globals';

// Mock the sequelize module before importing the helper
jest.unstable_mockModule('../database.js', () => ({
  default: { transaction: jest.fn() },
}));

// Import mocked sequelize and the helper under test
const sequelize = (await import('../database.js')).default;
const { withTransaction } = await import('../controllers/with-transaction.js');

describe('withTransaction - hard failure paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('propagates the original callback error even if rollback throws', async () => {
    // Arrange: transaction object whose rollback itself fails
    const tx = {
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockRejectedValue(new Error('rollback failed')),
    };
    sequelize.transaction.mockResolvedValue(tx);

    const originalErr = new Error('callback failed');

    // Act + Assert
    await expect(
      withTransaction(async () => { throw originalErr; })
    ).rejects.toBe(originalErr);

    // Ensure rollback was attempted and commit was not
    expect(tx.rollback).toHaveBeenCalledTimes(1);
    expect(tx.commit).not.toHaveBeenCalled();
  });

  it('propagates the original commit error even if rollback throws', async () => {
    // Arrange: commit fails; rollback also fails
    const commitErr = new Error('commit failed');
    const tx = {
      commit: jest.fn().mockRejectedValue(commitErr),
      rollback: jest.fn().mockRejectedValue(new Error('rollback failed')),
    };
    sequelize.transaction.mockResolvedValue(tx);

    // Act + Assert
    await expect(
      withTransaction(async () => 'ok')
    ).rejects.toBe(commitErr);

    // Ensure both commit and rollback were attempted
    expect(tx.commit).toHaveBeenCalledTimes(1);
    expect(tx.rollback).toHaveBeenCalledTimes(1);
  });
});
