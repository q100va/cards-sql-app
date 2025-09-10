// server/tests/int/with-transaction.int.test.js
import { v4 as uuid } from 'uuid';
import app, { initInfrastructure } from '../../app.js'; // ensures models are initialized
import sequelize from '../../database.js';
import { Role } from '../../models/index.js';
import { withTransaction } from '../../controllers/with-transaction.js';

describe('withTransaction (integration)', () => {
  beforeAll(async () => {
    // initialize DB/models once for int tests
    await initInfrastructure();
  });

  beforeEach(async () => {
    // keep test isolated (truncate is fine since maxWorkers=1 in your int Jest config)
    await Role.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
  });

  it('commits on success and returns callback result', async () => {
    const name = `role-${uuid()}`;
    const result = await withTransaction(async (t) => {
      await Role.create({ name, description: 'Valid description' }, { transaction: t });
      return 123;
    });

    expect(result).toBe(123);

    const found = await Role.findOne({ where: { name } });
    expect(found).toBeTruthy();
    expect(found?.name).toBe(name);
  });

  it('rolls back on error and rethrows the original error', async () => {
    const name = `role-${uuid()}`;
    let caught;
    try {
      await withTransaction(async (t) => {
        await Role.create({ name, description: 'Valid description' }, { transaction: t });
        // Force failure after the insert
        throw new Error('boom');
      });
    } catch (e) {
      caught = e;
    }

    // Original error is rethrown
    expect(caught).toBeInstanceOf(Error);
    expect(caught.message).toBe('boom');

    // Nothing persisted
    const found = await Role.findOne({ where: { name } });
    expect(found).toBeNull();
  });

  it('passes a usable transaction to model calls (sanity check)', async () => {
    // If someone forgets to pass { transaction: t }, this would persist even on failure.
    // This test ensures the intended usage works as expected.
    const name = `role-${uuid()}`;
    await withTransaction(async (t) => {
      const created = await Role.create(
        { name, description: 'Valid description' },
        { transaction: t }
      );
      // still inside the transaction: selecting with the same t should see it
      const within = await Role.findOne({ where: { name }, transaction: t });
      expect(within?.id).toBe(created.id);
    });

    // After commit, it’s visible outside the tx
    const after = await Role.findOne({ where: { name } });
    expect(after).toBeTruthy();
  });
});
