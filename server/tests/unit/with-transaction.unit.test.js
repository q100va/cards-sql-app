import { jest } from '@jest/globals';

const transactionMock = jest.fn();

jest.unstable_mockModule('../../database.js', () => ({ default: { transaction: transactionMock } }));

const { withTransaction } = await import('../../controllers/with-transaction.js');

describe('withTransaction', () => {
  beforeEach(() => {
    transactionMock.mockReset();
  });

  it('runs the callback inside a managed transaction and returns its result', async () => {
    const transaction = { id: 'test-transaction' };

    transactionMock.mockImplementationOnce(async (managedCallback) => managedCallback(transaction));

    const callback = jest.fn().mockResolvedValue(123);

    const result = await withTransaction(callback);

    expect(transactionMock).toHaveBeenCalledTimes(1);

    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function));

    expect(callback).toHaveBeenCalledTimes(1);

    expect(callback).toHaveBeenCalledWith(transaction);

    expect(result).toBe(123);
  });

  it('propagates the callback error', async () => {
    const transaction = { id: 'test-transaction' };

    transactionMock.mockImplementationOnce(async (managedCallback) => managedCallback(transaction));

    const error = new Error('callback failed');

    await expect(withTransaction(async () => {
      throw error;
    })).rejects.toBe(error);
  });

  it('propagates an error from Sequelize transaction handling', async () => {
    const error = new Error('transaction failed');

    transactionMock.mockRejectedValueOnce(error);

    const callback = jest.fn();

    await expect(withTransaction(callback)).rejects.toBe(error);

    expect(callback).not.toHaveBeenCalled();
  });
});
