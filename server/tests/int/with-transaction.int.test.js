let Role;
let withTransaction;

beforeAll(async () => {
  ({ Role } = await import('../../models/index.js'));
  ({ withTransaction } = await import('../../controllers/with-transaction.js'));
});

describe('withTransaction', () => {
  test('commits transaction and returns callback result', async () => {
    const result = await withTransaction(async (transaction) => {
      await Role.create(
        { name: 'Committed Role', description: 'Transaction test' },
        { transaction },
      );

      return 123;
    });

    expect(result).toBe(123);

    const role = await Role.findOne({ where: { name: 'Committed Role' } });

    expect(role).not.toBeNull();
  });

  test('rolls back transaction and rethrows error', async () => {
    await expect(
      withTransaction(async (transaction) => {
        await Role.create(
          { name: 'Rolled Back Role', description: 'Transaction test' },
          { transaction },
        );

        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    const role = await Role.findOne({ where: { name: 'Rolled Back Role' } });

    expect(role).toBeNull();
  });
});
