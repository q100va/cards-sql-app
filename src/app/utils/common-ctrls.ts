export function toIsoRange(dates: Date[] | undefined): [string, string] | undefined {
  if (!dates || dates.length !== 2) return undefined;
  const [from, to] = dates;
  if (!from || !to) return undefined;
  return [from.toISOString(), to.toISOString()];
}

export function omitEmpty<T extends Record<string, any>>(obj?: T): T | undefined {
  if (!obj) return undefined;
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    const isEmptyArr = Array.isArray(v) && v.length === 0;
    const isEmptyStr = typeof v === 'string' && v.trim() === '';
    //const isFalsyButAllowed = v === false || v === 0;
    if (v == null || isEmptyArr || isEmptyStr) continue; // || v == undefined
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}
