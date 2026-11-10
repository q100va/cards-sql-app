import logger from '../logging/logger.js';
import {
  getRequestContext,
} from '../middlewares/request-context.js';

const EXCLUDE_MODELS = new Set([
  'audit_logs',
  'audit_log',
  'sequelizemeta',
  'refresh_tokens',
  'refresh_token',
  'user-search',
  'user-searches',
  'volunteer-search',
  'volunteer-searches',
  'partner-search',
  'partner-searches',
  'home-search',
  'home-searches',
  'senior-search',
  'senior-searches',
]);

const EXCLUDE_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'salt',
]);

const SENSITIVE_FIELDS = new Set([
  'password',
]);

const SKIP_FIELDS_BY_MODEL = {
  operation: new Set([
    'disabled',
  ]),
};

function toPlain(instance) {
  if (instance?.get) {
    return instance.get({
      plain: true,
    });
  }

  return instance ?? {};
}

function isSensitiveField(field) {
  return SENSITIVE_FIELDS.has(
    String(field).toLowerCase(),
  );
}

function isExcludedField(field) {
  return EXCLUDE_FIELDS.has(
    String(field),
  );
}

function stripExcludedFields(
  obj = {},
) {
  const result = {
    ...obj,
  };

  for (const field of EXCLUDE_FIELDS) {
    delete result[field];
  }

  return result;
}

function maskSensitive(
  obj = {},
) {
  const result = {
    ...obj,
  };

  for (const key of Object.keys(result)) {
    if (isSensitiveField(key)) {
      result[key] = '***';
    }
  }

  return result;
}

function equal(
  value1,
  value2,
) {
  if (
    value1 instanceof Date &&
    value2 instanceof Date
  ) {
    return (
      value1.getTime() ===
      value2.getTime()
    );
  }

  return (
    JSON.stringify(value1) ===
    JSON.stringify(value2)
  );
}

function buildChanged(
  before,
  after,
) {
  const oldValues =
    stripExcludedFields(before);

  const newValues =
    stripExcludedFields(after);

  const keys = new Set([
    ...Object.keys(oldValues),
    ...Object.keys(newValues),
  ]);

  const changed = {};

  for (const key of keys) {
    const oldValue =
      key in oldValues
        ? oldValues[key]
        : null;

    const newValue =
      key in newValues
        ? newValues[key]
        : null;

    if (equal(oldValue, newValue)) {
      continue;
    }

    if (isSensitiveField(key)) {
      changed[key] = [
        '***',
        '***',
      ];

      continue;
    }

    changed[key] = [
      oldValue,
      newValue,
    ];
  }

  return changed;
}

function isFieldSkipped(
  modelKey,
  field,
) {
  const model =
    String(modelKey).toLowerCase();

  const fieldName =
    String(field).toLowerCase();

  return (
    SKIP_FIELDS_BY_MODEL[
      model
    ]?.has(fieldName) === true
  );
}

function isAuditSkipped(
  options,
) {
  return (
    options?.skipAudit === true
  );
}

function getPrimaryKey(
  Model,
  instance,
) {
  const primaryKeyAttribute =
    Model.primaryKeyAttributes?.[0] ??
    Model.primaryKeyAttribute ??
    'id';

  return (
    instance.get?.(
      primaryKeyAttribute,
    ) ??
    instance[
      primaryKeyAttribute
    ] ??
    null
  );
}

function getEntityId(
  Model,
  instance,
) {
  const value =
    getPrimaryKey(
      Model,
      instance,
    );

  return value == null
    ? null
    : String(value);
}

function getChangedKeys(
  instance,
  options,
  modelKey,
) {
  const changed =
    Array.isArray(
      instance.changed?.(),
    )
      ? instance.changed()
      : [];

  const fields =
    Array.isArray(
      options?.fields,
    )
      ? options.fields
      : [];

  return (
    changed.length
      ? changed
      : fields
  ).filter(
    (field) =>
      !isExcludedField(field) &&
      !isFieldSkipped(
        modelKey,
        field,
      ),
  );
}

/**
 * Initializes global Sequelize audit hooks.
 *
 * Must be called after all models are registered
 * and before the application starts processing requests.
 *
 * Audit records use the same transaction as the
 * corresponding data mutation when a transaction exists.
 */
export function initAuditHooks(
  sequelize,
) {
  const {
    models,
  } = sequelize;

  const AuditLog =
    models.audit_log ??
    models.audit_logs ??
    models.AuditLog ??
    models.AuditLogs;

  if (!AuditLog) {
    logger.warn(
      'AuditLog model not found; audit hooks are disabled',
    );

    return;
  }

  for (
    const [
      modelKey,
      Model,
    ] of Object.entries(models)
  ) {
    const tableName =
      typeof Model.getTableName ===
      'function'
        ? Model.getTableName()
        : modelKey;

    const tableKey =
      typeof tableName === 'string'
        ? tableName
        : tableName?.tableName;

    const normalizedModelKey =
      String(
        modelKey,
      ).toLowerCase();

    const normalizedTableKey =
      tableKey
        ? String(
            tableKey,
          ).toLowerCase()
        : null;

    if (
      Model === AuditLog ||
      EXCLUDE_MODELS.has(
        normalizedModelKey,
      ) ||
      (
        normalizedTableKey &&
        EXCLUDE_MODELS.has(
          normalizedTableKey,
        )
      )
    ) {
      continue;
    }

    /*
     * Stores previous values between beforeUpdate
     * and afterUpdate.
     *
     * WeakMap prevents stale Sequelize instances
     * from being retained in memory.
     */
    const previousValues =
      new WeakMap();

    //
    // CREATE
    //

    Model.addHook(
      'afterCreate',
      async (
        instance,
        options,
      ) => {
        if (
          isAuditSkipped(options)
        ) {
          return;
        }

        const ctx =
          getRequestContext();

        const after =
          toPlain(instance);

        try {
          await AuditLog.create(
            {
              action: 'create',
              model: modelKey,
              entityId:
                getEntityId(
                  Model,
                  instance,
                ),
              diff: {
                after:
                  maskSensitive(
                    stripExcludedFields(
                      after,
                    ),
                  ),
              },
              actorUserId:
                ctx.userId ??
                null,
              correlationId:
                ctx.correlationId ??
                null,
              ip:
                ctx.ip ??
                null,
              userAgent:
                ctx.userAgent ??
                null,
            },
            {
              transaction:
                options?.transaction,
            },
          );
        } catch (error) {
          logger.error(
            {
              err: error,
              model: modelKey,
            },
            'Audit afterCreate failed',
          );
        }
      },
    );

    //
    // UPDATE
    //

    Model.addHook(
      'beforeUpdate',
      'auditSnapshot',
      (
        instance,
        options,
      ) => {
        if (
          isAuditSkipped(options)
        ) {
          return;
        }

        try {
          const keys =
            getChangedKeys(
              instance,
              options,
              modelKey,
            );

          if (
            keys.length === 0
          ) {
            return;
          }

          const previous = {};

          for (
            const key of keys
          ) {
            previous[key] =
              typeof instance.previous ===
              'function'
                ? instance.previous(
                    key,
                  )
                : instance
                    ._previousDataValues?.[
                    key
                  ];
          }

          previousValues.set(
            instance,
            previous,
          );

          logger.debug(
            {
              model: modelKey,
              id:
                getEntityId(
                  Model,
                  instance,
                ),
              keys,
            },
            'Audit beforeUpdate snapshot',
          );
        } catch (error) {
          logger.warn(
            {
              err: error,
              model: modelKey,
            },
            'Failed to take audit snapshot',
          );
        }
      },
    );

    Model.addHook(
      'afterUpdate',
      'auditDiff',
      async (
        instance,
        options,
      ) => {
        if (
          isAuditSkipped(options)
        ) {
          return;
        }

        const ctx =
          getRequestContext();

        const previous =
          previousValues.get(
            instance,
          ) ?? {};

        previousValues.delete(
          instance,
        );

        const keys =
          getChangedKeys(
            instance,
            options,
            modelKey,
          );

        if (
          keys.length === 0
        ) {
          return;
        }

        const before = {};
        const after = {};

        for (
          const key of keys
        ) {
          const previousValue =
            Object.prototype
              .hasOwnProperty.call(
                previous,
                key,
              )
              ? previous[key]
              : typeof instance.previous ===
                  'function'
                ? instance.previous(
                    key,
                  )
                : undefined;

          const currentValue =
            typeof instance.get ===
            'function'
              ? instance.get(
                  key,
                )
              : undefined;

          before[key] =
            previousValue ??
            null;

          after[key] =
            currentValue ??
            null;
        }

        const changed =
          buildChanged(
            before,
            after,
          );

        if (
          Object.keys(
            changed,
          ).length === 0
        ) {
          logger.debug(
            {
              model: modelKey,
              id:
                getEntityId(
                  Model,
                  instance,
                ),
              keys,
            },
            'No audit diff on update',
          );

          return;
        }

        try {
          await AuditLog.create(
            {
              action: 'update',
              model: modelKey,
              entityId:
                getEntityId(
                  Model,
                  instance,
                ),
              diff: {
                changed,
              },
              actorUserId:
                ctx.userId ??
                null,
              correlationId:
                ctx.correlationId ??
                null,
              ip:
                ctx.ip ??
                null,
              userAgent:
                ctx.userAgent ??
                null,
            },
            {
              transaction:
                options?.transaction,
            },
          );
        } catch (error) {
          logger.error(
            {
              err: error,
              model: modelKey,
            },
            'Audit afterUpdate failed',
          );
        }
      },
    );

    //
    // DELETE
    //

    Model.addHook(
      'afterDestroy',
      async (
        instance,
        options,
      ) => {
        if (
          isAuditSkipped(options)
        ) {
          return;
        }

        const ctx =
          getRequestContext();

        const before =
          toPlain(instance);

        try {
          await AuditLog.create(
            {
              action: 'delete',
              model: modelKey,
              entityId:
                getEntityId(
                  Model,
                  instance,
                ),
              diff: {
                before:
                  maskSensitive(
                    stripExcludedFields(
                      before,
                    ),
                  ),
              },
              actorUserId:
                ctx.userId ??
                null,
              correlationId:
                ctx.correlationId ??
                null,
              ip:
                ctx.ip ??
                null,
              userAgent:
                ctx.userAgent ??
                null,
            },
            {
              transaction:
                options?.transaction,
            },
          );
        } catch (error) {
          logger.error(
            {
              err: error,
              model: modelKey,
            },
            'Audit afterDestroy failed',
          );
        }
      },
    );
  }

  logger.info(
    'Audit hooks initialized',
  );
}
