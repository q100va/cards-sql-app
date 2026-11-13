export function toIsoRange(
  dates: Date[] | undefined,
): [string, string] | undefined {
  if (!dates || dates.length !== 2) return undefined;
  const [from, to] = dates;
  if (!from || !to) return undefined;
  return [from.toISOString(), to.toISOString()];
}

export function buildSearch(value: string, exact: boolean): { value: string; exact?: true } | undefined {
  // Only test emptiness here; meaningful text keeps the caller's normalization.
  if (!value.trim()) return undefined;
  return exact ? { value, exact: true } : { value };
}

export function omitEmpty<T extends object>(
  obj?: T,
): Partial<T> | undefined {
  if (!obj) return undefined;
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    const v = obj[k];
    const isEmptyArr = Array.isArray(v) && v.length === 0;
    const isEmptyStr = typeof v === 'string' && v.trim() === '';
    if (v == null || isEmptyArr || isEmptyStr) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export function omitEmptyAndFalse<T extends object>(
  obj?: T,
): Partial<T> | undefined {
  if (!obj) return undefined;
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    const v = obj[k];
    const isEmptyArr = Array.isArray(v) && v.length === 0;
    const isEmptyStr = typeof v === 'string' && v.trim() === '';
    if (v === false || v == null || isEmptyArr || isEmptyStr) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

