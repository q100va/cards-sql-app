import sequelize from '../database.js';
import { RolePermission } from '../models/index.js';
import { OPERATIONS } from '../shared/operations.js';

function groupOpsByObject() {
  return OPERATIONS.reduce((acc, op) => {
    (acc[op.object] ??= []).push(op);
    return acc;
  }, {});
}

function pickCodes(ops) {
  const all =
    ops.find((op) => op.accessToAllOps)?.operation;

  const full =
    ops.find((op) => op.flag === 'FULL')?.operation;

  const limited =
    ops.find((op) => op.flag === 'LIMITED')?.operation;

  return {
    all,
    full,
    limited,
    allCodes: ops.map((op) => op.operation),
  };
}

/**
 * Normalizes permissions for one object group.
 * Updates only values that are out of sync.
 */
async function normalizeObjectOps(roleId, codes, transaction) {
  const { all, full, limited, allCodes } = codes;

  const recs = await RolePermission.findAll({
    where: { roleId: roleId, name: allCodes },
    raw: true,
    transaction
  });
  const byCode = new Map(recs.map(r => [r.name, r]));

  const get = (code) => (code ? byCode.get(code) : undefined);

  const allRec = get(all);
  const fullRec = get(full);
  const limRec = get(limited);

  const patches = [];

  const set = (code, data) => {
    if (!code) return;
    const curr = byCode.get(code);
    const next = { ...(curr ?? {}), ...data };
    if (!curr || curr.access !== next.access || curr.disabled !== next.disabled) {
      patches.push({ code, data });
      byCode.set(code, next);
    }
  };

  // Apply FULL/LIMITED dependency rules.
  if (limRec) {
    if (limRec.access === false) {
      set(limited, { disabled: false });
      if (full) set(full, { access: false, disabled: true });
    } else {
      if (full) {
        if (fullRec.access === true) {
          set(limited, { disabled: true });
          set(full, { disabled: false });
        } else {
          set(limited, { disabled: false });
          set(full, { disabled: false });
        }
      }
    }
  }

  // Check whether every operation except ALL_OPS is enabled.
  // A newly added operation remains disabled by default.
  // If not all operations are enabled, ALL_OPS is turned off.
  const effectiveAll = allCodes
    .filter(c => c !== all)
    .every(c => (byCode.get(c)?.access ?? false) === true);

  // Keep ALL_OPS consistent with the effective permission state.
  if (all) {
    if (effectiveAll && allRec?.access !== true) {
      set(all, { access: true });
      if (full) set(full, { disabled: false });
      if (limited) set(limited, { disabled: true });
      for (const code of allCodes) if (code !== all) set(code, { access: true });
    }

    if (!effectiveAll && allRec?.access !== false) {
      set(all, { access: false });
    }
  }

  for (const p of patches) {
    await RolePermission.update(
      p.data,
      {
        where: {
          roleId,
          name: p.code,
        },
        transaction,
      },
    );
  }
}

export async function applyAllOpsRule(
  roleId,
  transaction = null,
) {
  const byObject = groupOpsByObject();

  const apply = async (activeTransaction) => {
    for (const ops of Object.values(byObject)) {
      const codes = pickCodes(ops);

      await normalizeObjectOps(
        roleId,
        codes,
        activeTransaction,
      );
    }
  };

  if (transaction) {
    await apply(transaction);
    return;
  }

  await sequelize.transaction(apply);
}
