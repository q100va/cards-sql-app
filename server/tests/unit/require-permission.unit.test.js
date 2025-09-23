// tests/unit/require-permission.unit.test.js
// ESM-style Jest spec (package.json: { "type": "module" })
import { requireAny, requireAll, requireOperation } from '../../middlewares/require-permission.js';
import {RolePermission} from '../../models/index.js';
import { jest } from "@jest/globals";

describe('require-permission middlewares', () => {
  const makeReq = (roleId) =>
    roleId == null ? { user: undefined } : { user: { roleId } };
  const res = {}; // not used by middleware
  const makeNext = () => {
    const fn = jest.fn();
    return fn;
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------- requireAny ----------
  describe('requireAny(...)', () => {
    it('401 when no req.user/roleId', async () => {
      const mw = requireAny('A', 'B');
      const next = makeNext();

      await mw(makeReq(undefined), res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(Error);
      expect(err.status).toBe(401);
      expect(err.code).toBe('ERRORS.UNAUTHORIZED');
    });

    it('passes when at least one permission is granted (count >= 1)', async () => {
      const mw = requireAny('ADD', 'EDIT');
      const next = makeNext();

      const spy = jest.spyOn(RolePermission, 'count').mockResolvedValue(2);

      await mw(makeReq(7), res, next);

      // count called with roleId=7
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ roleId: 7 }),
        }),
      );
      // success path: next without error (undefined)
      expect(next).toHaveBeenCalledWith();
    });

    it('forbidden when none granted (count = 0)', async () => {
      const mw = requireAny('ADD', 'EDIT');
      const next = makeNext();

      jest.spyOn(RolePermission, 'count').mockResolvedValue(0);

      await mw(makeReq(2), res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(Error);
      expect(err.status).toBe(403);
      expect(err.code).toBe('ERRORS.FORBIDDEN');
      // middleware кладёт детали requiredAny
      expect(err.details).toEqual({ requiredAny: ['ADD', 'EDIT'] });
    });

    it('forbidden with ACCESS.CHECK_FAILED when DB throws', async () => {
      const mw = requireAny('X');
      const next = makeNext();

      jest
        .spyOn(RolePermission, 'count')
        .mockRejectedValue(new Error('db is down'));

      await mw(makeReq(5), res, next);

      const err = next.mock.calls[0][0];
      expect(err.status).toBe(403);
      expect(err.code).toBe('ERRORS.FORBIDDEN');
      expect(err.details?.error).toBe('ACCESS.CHECK_FAILED');
      expect(err.details?.cause).toMatch(/db is down/);
    });
  });

  // ---------- requireAll ----------
  describe('requireAll(...)', () => {
    it('401 when no roleId', async () => {
      const mw = requireAll('A');
      const next = makeNext();

      await mw(makeReq(null), res, next);

      const err = next.mock.calls[0][0];
      expect(err.status).toBe(401);
      expect(err.code).toBe('ERRORS.UNAUTHORIZED');
    });

    it('passes when all requested permissions are present', async () => {
      const mw = requireAll('ADD', 'EDIT', 'DELETE');
      const next = makeNext();

      // findAll вернёт строки с name для всех трёх кодов
      const rows = ['ADD', 'EDIT', 'DELETE'].map((name) => ({ name }));
      const spy = jest
        .spyOn(RolePermission, 'findAll')
        .mockResolvedValue(rows);

      await mw(makeReq(9), res, next);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ roleId: 9 }),
          attributes: ['name'],
          raw: true,
        }),
      );
      expect(next).toHaveBeenCalledWith(); // success
    });

    it('forbidden with missing list when at least one is absent', async () => {
      const mw = requireAll('ADD', 'EDIT', 'DELETE');
      const next = makeNext();

      // вернём только ADD, EDIT → DELETE отсутствует
      jest
        .spyOn(RolePermission, 'findAll')
        .mockResolvedValue([{ name: 'ADD' }, { name: 'EDIT' }]);

      await mw(makeReq(3), res, next);

      const err = next.mock.calls[0][0];
      expect(err.status).toBe(403);
      expect(err.code).toBe('ERRORS.FORBIDDEN');
      expect(err.details).toEqual({
        requiredAll: ['ADD', 'EDIT', 'DELETE'],
        missing: ['DELETE'],
      });
    });

    it('forbidden with ACCESS.CHECK_FAILED when DB throws', async () => {
      const mw = requireAll('VIEW');
      const next = makeNext();

      jest
        .spyOn(RolePermission, 'findAll')
        .mockRejectedValue(new Error('boom'));

      await mw(makeReq(1), res, next);

      const err = next.mock.calls[0][0];
      expect(err.status).toBe(403);
      expect(err.code).toBe('ERRORS.FORBIDDEN');
      expect(err.details?.error).toBe('ACCESS.CHECK_FAILED');
      expect(err.details?.cause).toMatch(/boom/);
    });
  });

  // ---------- sugar: requireOperation(op) = requireAll(op) ----------
  describe('requireOperation(op)', () => {
    it('delegates to requireAll and succeeds when op is present', async () => {
      const mw = requireOperation('VIEW_USER');
      const next = makeNext();

      jest
        .spyOn(RolePermission, 'findAll')
        .mockResolvedValue([{ name: 'VIEW_USER' }]);

      await mw(makeReq(4), res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('delegates to requireAll and forbids when op is missing', async () => {
      const mw = requireOperation('EDIT_USER');
      const next = makeNext();

      jest.spyOn(RolePermission, 'findAll').mockResolvedValue([]); // nothing

      await mw(makeReq(4), res, next);

      const err = next.mock.calls[0][0];
      expect(err.status).toBe(403);
      expect(err.code).toBe('ERRORS.FORBIDDEN');
      expect(err.details?.missing).toEqual(['EDIT_USER']);
    });
  });
});
