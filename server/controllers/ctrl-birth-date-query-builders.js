import { Op, fn, col, where } from 'sequelize';

/* type NullableInt = number | null;
type RangeTuple = [NullableInt, NullableInt];

type BirthPartsRanges = {
  dateRange?: RangeTuple;  // day of month: 1..31
  monthRange?: RangeTuple; // 1..12 (may wrap: [11,2])
  yearRange?: RangeTuple;  // e.g. 1945..1954 (must be ascending if both set)
}; */

// --- helpers ----------------------------------------------------

function normalizeInt(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/* function isEmptyRange([a, b]) {
  return a == null && b == null;
}
 */
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
  part,// 'day' | 'month' | 'year'
  range,
  opts = {}
) {
  let [start, end] = range;

  // optional clamping (keeps "within reasonable bounds")
  if (opts.clampTo) {
    if (start != null) start = clamp(start, opts.clampTo[0], opts.clampTo[1]);
    if (end != null) end = clamp(end, opts.clampTo[0], opts.clampTo[1]);
  }

  const expr = fn('DATE_PART', part, col('birthDate'));

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
 *    dateRange: [1, 15],
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
  ranges
) {
  const { dateRange, monthRange, yearRange } = ranges;

  pushAnd(whereSenior, { birthDate: { [Op.not]: null } });

  if (dateRange) {
    assertAscendingRange('dateRange', dateRange);
    pushAnd(whereSenior, buildPartRangeCondition('day', dateRange, { clampTo: [1, 31] }));
  }
  if (monthRange)
    pushAnd(whereSenior, buildPartRangeCondition('month', monthRange, { allowWrap: true, clampTo: [1, 12] }));
  if (yearRange) {
    assertAscendingRange('yearRange', yearRange);
    pushAnd(whereSenior, buildPartRangeCondition('year', yearRange, { clampTo: [1910, 2026] }));
  }
}



/* export function buildBirthDatePartsWhere(
  ranges,
  options = {}
) {
  const dateRange = ranges.dateRange
    ? [normalizeInt(ranges.dateRange[0]), normalizeInt(ranges.dateRange[1])]
    : undefined;

  const monthRange = ranges.monthRange
    ? [normalizeInt(ranges.monthRange[0]), normalizeInt(ranges.monthRange[1])]
    : undefined;

  const yearRange = ranges.yearRange
    ? [normalizeInt(ranges.yearRange[0]), normalizeInt(ranges.yearRange[1])]
    : undefined;

  // Validate ascending constraints (only where you required it)
  if (dateRange && !isEmptyRange(dateRange)) assertAscendingRange('dateRange', dateRange);
  if (yearRange && !isEmptyRange(yearRange)) assertAscendingRange('yearRange', yearRange);

  const and = [];

  // If you want to EXCLUDE null birthDate by default (typical for filtering)
  if (!options.includeNullBirthDate) {
    and.push({ birthDate: { [Op.not]: null } });
  }

  if (dateRange && !isEmptyRange(dateRange)) {
    and.push(
      buildPartRangeCondition('day', dateRange, { clampTo: [1, 31] })
    );
  }

  if (monthRange && !isEmptyRange(monthRange)) {
    and.push(
      buildPartRangeCondition('month', monthRange, { allowWrap: true, clampTo: [1, 12] })
    );
  }

  if (yearRange && !isEmptyRange(yearRange)) {
    // "reasonable bounds" — поставь свои (например 1850..2100)
    and.push(
      buildPartRangeCondition('year', yearRange, { clampTo: [1910, 2026] })
    );
  }

  // Remove nulls (if any)
  const filtered = and.filter(Boolean);

  // If no conditions besides maybe null-filter, return something sane
  if (filtered.length === 0) return {};

  return { [Op.and]: filtered };
} */
