// server/logging/audit-hooks.js
import logger from './logger.js';
import { getRequestContext } from '../middlewares/request-context.js';

//
// Config
//
const EXCLUDE_MODELS = new Set(['audit_logs', 'audit_log', 'SequelizeMeta']); // models/tables to skip
const EXCLUDE_FIELDS = new Set(['createdAt', 'updatedAt', 'password', 'salt']); // fields not stored in diff

//
// Helpers
//
const toPlain = (inst) => (inst?.get ? inst.get({ plain: true }) : inst || {});

function sanitize(obj) {
  // Shallow copy and remove sensitive/boring fields
  const out = { ...(obj || {}) };
  for (const k of EXCLUDE_FIELDS) delete out[k];
  return out;
}

function equal(v1, v2) {
  // Basic deep-ish equality: good enough for primitive/JSON-ish values
  if (v1 instanceof Date && v2 instanceof Date) return v1.getTime() === v2.getTime();
  return JSON.stringify(v1) === JSON.stringify(v2);
}

function buildChanged(before, after) {
  // Build a { field: [old, new] } map, excluding unchanged fields
  const a = sanitize(before);
  const b = sanitize(after);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const changed = {};
  for (const k of keys) {
    const v1 = k in a ? a[k] : null;
    const v2 = k in b ? b[k] : null;
    if (!equal(v1, v2)) changed[k] = [v1, v2];
  }
  return changed;
}

/**
 * Initialize global Sequelize audit hooks.
 * Must be called AFTER all models are registered and BEFORE sync().
 * Ensures audit records are written in the SAME transaction as the mutation.
 */
export function initAuditHooks(sequelize) {
  const { models } = sequelize;

  // Try to resolve the AuditLog model (support common naming variants)
  const AuditLog =
    models.audit_log || models.audit_logs || models.AuditLog || models.AuditLogs;

  if (!AuditLog) {
    logger.warn('AuditLog model not found; audit hooks are disabled');
    return;
  }

  const SKIP_FIELDS_BY_MODEL = {
    operation: new Set(['disabled']),
    // user: new Set(['lastLoginAt']),
  };

  const isFieldSkipped = (modelKey, field) => {
    const mk = String(modelKey).toLowerCase();
    const fk = String(field).toLowerCase();
    const set = SKIP_FIELDS_BY_MODEL[mk];
    return set?.has(fk) === true;
  };

  const SKIP = {
    /*  create: new Set(['operation']), // don't audit Operation creates
    update: new Set(['operation']), // don't audit Operation updates
    delete: new Set(['operation']), // don't audit Operation deletes  */
  };

  const isSkipped = (action, modelKey, options) =>
    SKIP[action]?.has(String(modelKey).toLowerCase()) || options?.skipAudit === true;

  for (const [modelKey, Model] of Object.entries(models)) {
    // Skip the audit table itself and Sequelize meta tables
    const tableName =
      typeof Model.getTableName === 'function' ? Model.getTableName() : modelKey;
    const tableKey = typeof tableName === 'string' ? tableName : tableName?.tableName;

    if (
      Model === AuditLog ||
      EXCLUDE_MODELS.has(modelKey) ||
      (tableKey && EXCLUDE_MODELS.has(tableKey))
    ) {
      continue;
    }

    const auditPrevByKey = new Map();

    const snapshotKey = (instance, options) => {
      const pkAttr =
        Model.primaryKeyAttributes?.[0] ??
        Model.primaryKeyAttribute ??
        'id';

      const pk = instance.get?.(pkAttr) ?? instance[pkAttr];
      const ctx = getRequestContext() || {};
      const cid = ctx.correlationId || 'noCid';
      const txId = options?.transaction?.id || 'noTx';
      return `${modelKey}:${String(pk)}:${txId}:${cid}`;
    };

    //
    // CREATE
    //
    Model.addHook('afterCreate', async (instance, options) => {
      if (isSkipped('create', modelKey, options)) return;
      const ctx = getRequestContext();
      const after = toPlain(instance);

      try {
        await AuditLog.create(
          {
            action: 'create',
            model: modelKey,
            entityId: String(after.id ?? after.uuid ?? ''),
            diff: { after: sanitize(after) },
            actorUserId: ctx.userId ?? null,
            correlationId: ctx.correlationId ?? null,
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
          { transaction: options?.transaction }
        );
      } catch (err) {
        logger.error({ err, model: modelKey }, 'audit afterCreate failed');
      }
    });

    //
    // UPDATE
    //
    // ── BEFORE UPDATE ──
    Model.addHook('beforeUpdate', 'auditSnapshot', (instance, options) => {
      if (isSkipped('update', modelKey, options)) return;
      try {
        const changed = Array.isArray(instance.changed?.()) ? instance.changed() : [];
        const fieldsOpt = Array.isArray(options?.fields) ? options.fields : [];
        const keys = (changed.length ? changed : fieldsOpt)
          .filter(k => !EXCLUDE_FIELDS.has(k) && !isFieldSkipped(modelKey, k));
        const prev = {};
        for (const k of keys) {
          prev[k] = typeof instance.previous === 'function'
            ? instance.previous(k)
            : (instance._previousDataValues ? instance._previousDataValues[k] : undefined);
        }

        const key = snapshotKey(instance, options);
        auditPrevByKey.set(key, prev);
        logger.debug({ model: modelKey, id: instance.get?.('id'), keys, prev }, 'beforeUpdate snapshot');
      } catch (e) {
        logger.warn({ e, model: modelKey }, 'failed to take audit snapshot');
      }
    });

    // ── AFTER UPDATE ──
    Model.addHook('afterUpdate', 'auditDiff', async (instance, options) => {
      if (isSkipped('update', modelKey, options)) return;
      const ctx = getRequestContext();

      const key = snapshotKey(instance, options);
      const prev = auditPrevByKey.get(key) || {};
      auditPrevByKey.delete(key); // уборка

      const changedKeys = Array.isArray(instance.changed?.()) ? instance.changed() : [];
      const fieldsOpt = Array.isArray(options?.fields) ? options.fields : [];
      const keys = (changedKeys.length ? changedKeys : fieldsOpt)
        .filter(k => !EXCLUDE_FIELDS.has(k) && !isFieldSkipped(modelKey, k));
      if (keys.length === 0) return;

      const before = {};
      const after = {};
      for (const k of keys) {
        const prevVal = Object.prototype.hasOwnProperty.call(prev, k)
          ? prev[k]
          : (typeof instance.previous === 'function' ? instance.previous(k) : undefined);

        const nextVal = typeof instance.get === 'function' ? instance.get(k) : undefined;

        before[k] = prevVal ?? null;
        after[k] = nextVal ?? null;
      }

      const changed = buildChanged(before, after);
      if (Object.keys(changed).length === 0) {
        logger.debug({ model: modelKey, id: instance.get?.('id'), keys }, 'no diff on update');
        return;
      }

      try {
        await AuditLog.create({
          action: 'update',
          model: modelKey,
          entityId: String(instance.get?.('id') ?? ''),
          diff: { changed },
          actorUserId: ctx.userId ?? null,
          correlationId: ctx.correlationId ?? null,
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        }, { transaction: options?.transaction });
      } catch (err) {
        logger.error({ err, model: modelKey }, 'audit afterUpdate failed');
      }
    });

    //
    // DELETE (per-row; requires individualHooks: true for bulk destroys)
    //
    Model.addHook('afterDestroy', async (instance, options) => {
      if (isSkipped('delete', modelKey, options)) return;
      const ctx = getRequestContext();
      const before = toPlain(instance);

      try {
        await AuditLog.create(
          {
            action: 'delete',
            model: modelKey,
            entityId: String(before.id ?? instance.get('id') ?? ''),
            diff: { before: sanitize(before) },
            actorUserId: ctx.userId ?? null,
            correlationId: ctx.correlationId ?? null,
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
          { transaction: options?.transaction }
        );
      } catch (err) {
        logger.error({ err, model: modelKey }, 'audit afterDestroy failed');
      }
    });

    //
    // Fallbacks for bulk operations when individualHooks are not enabled.
    // These do NOT contain per-row diffs — only WHERE/fields meta.
    //
    /* Model.addHook('afterBulkUpdate', async (options) => {
       if (isSkipped('update', modelKey, options)) return;
      const ctx = getRequestContext();
      try {
        await AuditLog.create(
          {
            action: 'update',
            model: modelKey,
            entityId: null, // unknown per-row ids in bulk mode
            diff: { where: options.where, fields: options.fields },
            actorUserId: ctx.userId ?? null,
            correlationId: ctx.correlationId ?? null,
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
          { transaction: options?.transaction }
        );
      } catch (err) {
        logger.error({ err, model: modelKey }, 'audit afterBulkUpdate failed');
      }
    });

    Model.addHook('afterBulkDestroy', async (options) => {
      if (isSkipped('delete', modelKey, options)) return;
      const ctx = getRequestContext();
      try {
        await AuditLog.create(
          {
            action: 'delete',
            model: modelKey,
            entityId: null,
            diff: { where: options.where },
            actorUserId: ctx.userId ?? null,
            correlationId: ctx.correlationId ?? null,
            ip: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          },
          { transaction: options?.transaction }
        );
      } catch (err) {
        logger.error({ err, model: modelKey }, 'audit afterBulkDestroy failed');
      }
    }); */
  }

  logger.info('Audit hooks initialized');
}
//TODO: добавим небольшой индекс на audit_logs (model, entity_id, created_at) и retention-очистку старых записей
