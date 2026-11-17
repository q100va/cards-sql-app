import { Op, fn, col, where } from 'sequelize';

// --- helpers ----------------------------------------------------

function assertAscendingRange(name, [a, b]) {
  if (a != null && b != null && a > b) {
    throw new Error(`${name} must be ascending (start <= end). Got [${a}, ${b}]`);
  }
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Builds a Sequelize condition for DATE_PART(part, birthDate)
 * - If both bounds present:
 *    - allowWrap=false: BETWEEN start AND end (expects start<=end)
 *    - allowWrap=true : if start<=end -> BETWEEN; else -> (>=start OR <=end)
 * - If only one bound present: >= start OR <= end
 */
function buildPartRangeCondition(
  part, // 'day' | 'month' | 'year'
  range,
  opts = {}
) {
  let [start, end] = range;

  // optional clamping (keeps "within reasonable bounds")
  if (opts.clampTo) {
    if (start != null) start = clamp(start, opts.clampTo[0], opts.clampTo[1]);
    if (end != null) end = clamp(end, opts.clampTo[0], opts.clampTo[1]);
  }

  const expr = fn('DATE_PART', part, col('senior.birthDate'));

  // open ended
  if (start != null && end == null) {
    return where(expr, { [Op.gte]: start });
  }
  if (start == null && end != null) {
    return where(expr, { [Op.lte]: end });
  }
  if (start == null && end == null) return null;

  // both ends
  const allowWrap = !!opts.allowWrap;
  if (!allowWrap || start <= end) {
    return where(expr, { [Op.between]: [start, end] });
  }

  // wrap-around (only for month)
  return {
    [Op.or]: [
      where(expr, { [Op.gte]: start }),
      where(expr, { [Op.lte]: end }),
    ],
  };
}

// --- main -------------------------------------------------------

/**
 * Builds where for birthDate parts. Returns an object you can merge into an existing where.
 *
 * Example:
 *  buildBirthDatePartsWhere({
 *    dayRange: [1, 15],
 *    monthRange: [11, 2],  // wraps
 *    yearRange: [1945, 1954]
 *  })
 */
function pushAnd(whereObj, cond) {
  if (!cond) return;
  if (!whereObj[Op.and]) whereObj[Op.and] = [];
  whereObj[Op.and].push(cond);
}

export function applyBirthDatePartsFilters(
  whereSenior,
  hideWithoutYear,
  ranges
) {
  const { dayRange, monthRange, yearRange } = ranges;
  const currentYear = new Date().getFullYear();

  pushAnd(whereSenior, { birthDate: { [Op.not]: null } });

  if (dayRange) {
    assertAscendingRange('dayRange', dayRange);
    pushAnd(
      whereSenior,
      buildPartRangeCondition(
        'day',
        dayRange,
        { clampTo: [1, 31] })
    );
  }
  if (monthRange)
    pushAnd(
      whereSenior,
      buildPartRangeCondition(
        'month',
        monthRange,
        { allowWrap: true, clampTo: [1, 12] })
    );
  if (yearRange) {
    assertAscendingRange('yearRange', yearRange);
    pushAnd(
      whereSenior,
      buildPartRangeCondition(
        'year',
        yearRange,
        { clampTo: [1917, currentYear] })
    );
  } else if (hideWithoutYear) {
    pushAnd(
      whereSenior,
      where(
        fn('DATE_PART', 'year', col('senior.birthDate')),
        { [Op.not]: 1800 }
      )
    );
  }
}
