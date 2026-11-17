/** @jest-environment node */

import { jest } from '@jest/globals';

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const getRequestContext = jest.fn();

jest.unstable_mockModule('../../logging/logger.js', () => ({ default: logger }));

jest.unstable_mockModule('../../middlewares/request-context.js', () => ({ getRequestContext }));

const { initAuditHooks } = await import('../../audit/audit-hooks.js');

function createModel({
  tableName = 'users',
  primaryKey = 'id',
} = {}) {
  const hooks = {};

  const Model = {
    primaryKeyAttributes: [primaryKey],
    getTableName: jest.fn(() => tableName),
    addHook: jest.fn((event, nameOrHandler, maybeHandler) => {
      const handler = typeof nameOrHandler === 'function' ? nameOrHandler : maybeHandler;

      hooks[event] = handler;
    }),
  };

  return {
    Model,
    hooks,
  };
}

function makeInstance({
  plain = {},
  changed = [],
  previous = {},
  current = {},
} = {}) {
  return {
    ...plain,
    get: jest.fn((arg) => {
      if (arg && typeof arg === 'object' && arg.plain === true) {
        return { ...plain };
      }

      if (typeof arg === 'string') {
        if (Object.prototype.hasOwnProperty.call(current, arg)) {
          return current[arg];
        }

        return plain[arg];
      }

      return undefined;
    }),
    changed: jest.fn(() => [...changed]),
    previous: jest.fn((key) => previous[key]),
  };
}

function setup({
  modelKey = 'user',
  tableName = 'users',
} = {}) {
  const AuditLog = { create: jest.fn(async () => undefined) };

  const {
    Model,
    hooks,
  } = createModel({ tableName });

  const sequelize = {
    models: {
      audit_log: AuditLog,
      [modelKey]: Model,
    },
  };

  initAuditHooks(sequelize);

  return {
    AuditLog,
    Model,
    hooks,
    sequelize,
  };
}

describe('initAuditHooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getRequestContext.mockReturnValue({
      userId: 11,
      correlationId: 'corr-123',
      ip: '10.0.0.10',
      userAgent: 'test-agent',
    });
  });

  test('disables audit hooks when AuditLog model is missing', () => {
    const { Model } = createModel();

    initAuditHooks({ models: { user: Model } });

    expect(Model.addHook).not.toHaveBeenCalled();

    expect(logger.warn).toHaveBeenCalledWith('AuditLog model not found; audit hooks are disabled');
  });

  test('registers hooks only for auditable models', () => {
    const AuditLog = { create: jest.fn() };

    const { Model: User } = createModel({ tableName: 'users' });

    const { Model: RefreshToken } = createModel({ tableName: 'refresh_tokens' });

    initAuditHooks({
      models: {
        audit_log: AuditLog,
        user: User,
        refreshToken: RefreshToken,
      },
    });

    expect(User.addHook).toHaveBeenCalledTimes(4);

    expect(RefreshToken.addHook).not.toHaveBeenCalled();

    expect(logger.info).toHaveBeenCalledWith('Audit hooks initialized');
  });

  test('writes sanitized audit data after create', async () => {
    const {
      AuditLog,
      hooks,
    } = setup();

    const transaction = { id: 'tx-create' };

    const instance = makeInstance({
      plain: {
        id: 7,
        userName: 'alice',
        password: 'secret',
        salt: 'salt',
        createdAt: 'created',
        updatedAt: 'updated',
      },
    });

    await hooks.afterCreate(instance, { transaction });

    expect(AuditLog.create).toHaveBeenCalledWith({
      action: 'create',
      model: 'user',
      entityId: '7',
      diff: {
        after: {
          id: 7,
          userName: 'alice',
          password: '***',
        },
      },
      actorUserId: 11,
      correlationId: 'corr-123',
      ip: '10.0.0.10',
      userAgent: 'test-agent',
    }, { transaction });
  });

  test('does not audit when skipAudit is true', async () => {
    const {
      AuditLog,
      hooks,
    } = setup();

    const instance = makeInstance({
      plain: {
        id: 1,
        name: 'test',
      },
    });

    await hooks.afterCreate(instance, { skipAudit: true });

    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  test('captures previous values and writes only changed fields after update', async () => {
    const {
      AuditLog,
      hooks,
    } = setup();

    const transaction = { id: 'tx-update' };

    const instance = makeInstance({
      plain: { id: 7 },
      changed: ['userName', 'password', 'updatedAt'],
      previous: {
        userName: 'alice',
        password: 'old-secret',
        updatedAt: 'old-date',
      },
      current: {
        id: 7,
        userName: 'bob',
        password: 'new-secret',
        updatedAt: 'new-date',
      },
    });

    hooks.beforeUpdate(instance, { transaction });

    await hooks.afterUpdate(instance, { transaction });

    expect(AuditLog.create).toHaveBeenCalledWith({
      action: 'update',
      model: 'user',
      entityId: '7',
      diff: {
        changed: {
          userName: ['alice', 'bob'],
          password: ['***', '***'],
        },
      },
      actorUserId: 11,
      correlationId: 'corr-123',
      ip: '10.0.0.10',
      userAgent: 'test-agent',
    }, { transaction });
  });

  test('does not write an update audit record when values did not actually change', async () => {
    const {
      AuditLog,
      hooks,
    } = setup();

    const instance = makeInstance({
      plain: { id: 7 },
      changed: ['userName'],
      previous: { userName: 'alice' },
      current: {
        id: 7,
        userName: 'alice',
      },
    });

    hooks.beforeUpdate(instance, {});

    await hooks.afterUpdate(instance, {});

    expect(AuditLog.create).not.toHaveBeenCalled();

    expect(logger.debug).toHaveBeenCalledWith(expect.objectContaining({
      model: 'user',
      id: '7',
    }), 'No audit diff on update');
  });

  test('skips model-specific fields when building update diff', async () => {
    const {
      AuditLog,
      hooks,
    } = setup({
      modelKey: 'operation',
      tableName: 'operations',
    });

    const instance = makeInstance({
      plain: { id: 3 },
      changed: ['disabled', 'access'],
      previous: {
        disabled: false,
        access: false,
      },
      current: {
        id: 3,
        disabled: true,
        access: true,
      },
    });

    hooks.beforeUpdate(instance, {});

    await hooks.afterUpdate(instance, {});

    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      diff: { changed: { access: [false, true] } },
    }), expect.any(Object));
  });

  test('writes sanitized previous state after destroy', async () => {
    const {
      AuditLog,
      hooks,
    } = setup();

    const transaction = { id: 'tx-delete' };

    const instance = makeInstance({
      plain: {
        id: 9,
        userName: 'deleted-user',
        password: 'secret',
        createdAt: 'created',
        updatedAt: 'updated',
        salt: 'salt',
      },
    });

    await hooks.afterDestroy(instance, { transaction });

    expect(AuditLog.create).toHaveBeenCalledWith({
      action: 'delete',
      model: 'user',
      entityId: '9',
      diff: {
        before: {
          id: 9,
          userName: 'deleted-user',
          password: '***',
        },
      },
      actorUserId: 11,
      correlationId: 'corr-123',
      ip: '10.0.0.10',
      userAgent: 'test-agent',
    }, { transaction });
  });

  test('does not break the data mutation when AuditLog.create fails', async () => {
    const {
      AuditLog,
      hooks,
    } = setup();

    const error = new Error('audit insert failed');

    AuditLog.create.mockRejectedValue(error);

    const instance = makeInstance({
      plain: {
        id: 10,
        name: 'test',
      },
    });

    await expect(hooks.afterCreate(instance, {})).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith({
      err: error,
      model: 'user',
    }, 'Audit afterCreate failed');
  });
});
