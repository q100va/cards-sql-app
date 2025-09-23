// server/controllers/apply-all-ops-rule.ts
import sequelize from '../database.js';
import {RolePermission} from '../models/index.js';
import { OPERATIONS } from '../shared/operations.js';

function groupOpsByObject() {
  return OPERATIONS.reduce((acc, op) => {
    (acc[op.object] ??= []).push(op);
    return acc;
  }, {});
}

function pickCodes(ops) {
  const all = ops.find(o => o.accessToAllOps)?.operation;
  const full = ops.find(o => o.flag === 'FULL')?.operation;
  const limited = ops.find(o => o.flag === 'LIMITED')?.operation;
  const others = ops
    .filter(o => o.operation !== all && o.operation !== full && o.operation !== limited)
    .map(o => o.operation);
  return { all, full, limited, others, allCodes: ops.map(o => o.operation) };
}

/**
 * Применить правила к одной «группе» (объекту), приводя к согласованному состоянию.
 * Идемпотентно. Вызывает UPDATE только если есть изменения.
 */
async function normalizeObjectOps(roleId, codes) {
  const { all, full, limited, others, allCodes } = codes;

  // Подтягиваем все записи по объекту
  const recs = await RolePermission.findAll({
    where: { roleId: roleId, name: allCodes },
    raw: true,
  });
  const byCode = new Map(recs.map(r => [r.name, r]));

  // Хелпер для "получить текущее значение или дефолт false"
  const get = (code) => (code ? byCode.get(code) : undefined);

  const allRec = get(all);
  const fullRec = get(full);
  const limRec = get(limited);
  const otherRecs = others.map(c => byCode.get(c)).filter(Boolean);

  // Собираем патчи
  const patches = [];

  const set = (code, data) => {
    if (!code) return;
    const curr = byCode.get(code);
    const next = { ...(curr ?? {}), ...data };
    // Добавляем патч только если есть изменения
    if (!curr || curr.access !== next.access || curr.disabled !== next.disabled) {
      patches.push({ code, data });
      // локально обновим, чтобы последующие правила опирались на «будущее» состояние
      byCode.set(code, next);
    }
  };

  // === 1) Если ALL_OPS включен сейчас → силой включаем всё,
  // FULL.disabled=false, LIMITED.disabled=true
  /*   if (allRec?.access === true) {
      for (const code of allCodes) set(code, { access: true });
      if (full) set(full, { disabled: false });
      if (limited) set(limited, { disabled: true });

    } else { */
  // применяем зависимости FULL/LIMITED
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
   // console.log('LIMITED', patches);
  }
/*   if (fullRec) {
    if (fullRec.access === true) {
      if (limited) set(limited, { disabled: true });
      set(full, { disabled: false });
    } else {
      if (limited) set(limited, { disabled: false });
    }
    console.log('Full', patches);
  } */
  // Другие операции (не FULL/LIMITED) остаются как есть — правил для них нет.
  // }

  // === 3) Пересчитать факт "все access=true?"
  const effectiveAll = allCodes
    .filter(c => c !== all) // считаем по всем кроме ALL_OPS
    .every(c => (byCode.get(c)?.access ?? false) === true);

  // === 4) Проставить ALL_OPС в соответствии с фактом
  if (all) {
    if (effectiveAll && allRec?.access !== true) {
      set(all, { access: true });
      // При переходе в ALL_OPS=true — зафиксируем нужные disabled для FULL/LIMITED
      if (full) set(full, { disabled: false });
      if (limited) set(limited, { disabled: true });
      // и гарантируем access=true у всех (на случай рассинхронизации)
      for (const code of allCodes) if (code !== all) set(code, { access: true });
    }
    /* console.log('effectiveAll', effectiveAll);
    console.log('allRec?.access', allRec?.access); */
    if (!effectiveAll && allRec?.access !== false) {

      //console.log('LIMITED', patches);
      set(all, { access: false });
    }
  }

  // === 5) Применяем изменения минимальными апдейтами
  for (const p of patches) {
    await RolePermission.update(p.data, {
      where: { roleId: roleId, name: p.code },
    });
  }
}

/** Применить правила для всех объектов */
export async function applyAllOpsRule(roleId) {
  const byObject = groupOpsByObject();
  // Транзакция, чтобы привести группу целиком «атомарно»
  await sequelize.transaction(async (t) => {
    for (const ops of Object.values(byObject)) {
      const codes = pickCodes(ops);
      await normalizeObjectOps(roleId, codes);
    }
  });
}
