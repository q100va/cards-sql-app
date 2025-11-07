
import { Op } from 'sequelize';

// ---------- helpers ----------
function pad2(n) { return String(n).padStart(2, '0'); }
function fmtDMY(y, m, d) { return `${pad2(d)}.${pad2(m)}.${y}`; }
function fmtMDY(y, m, d) { return `${pad2(m)}/${pad2(d)}/${y}`; }

/** Returns [YYYY-MM-DD, dd.MM.yyyy, MM/dd/yyyy] — TZ-safe */
export function dateVariants(d) {
  if (!d) return [];
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, dd] = d.split('-').map(Number);
    const iso = `${y}-${pad2(m)}-${pad2(dd)}`;
    return [iso, fmtDMY(y, m, dd), fmtMDY(y, m, dd)];
  }
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(+dt)) return [];
  const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, dd = dt.getUTCDate();
  const iso = `${y}-${pad2(m)}-${pad2(dd)}`;
  return [iso, fmtDMY(y, m, dd), fmtMDY(y, m, dd)];
}

export function t(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return s || '';
}

function pushAddressTokens(tokens, addr) {
  if (!addr) return;
  tokens.push(
    t(addr.country?.name),
    t(addr.region?.name ?? addr.region?.shortName),
    t(addr.district?.name ?? addr.district?.shortName),
    t(addr.locality?.name ?? addr.locality?.shortName),
  );
}

function normalizeSpace(s) {
  return s.split(/\s+/).filter(Boolean).join(' ').trim();
}

// ---------- CONFIG per owner kind ----------
const OWNER_CONFIG = {
  user: {
    basicTokens: (u) => [
      t(u?.userName),
      t(u?.role?.name),
      t(u?.firstName), t(u?.patronymic), t(u?.lastName),
      t(u?.comment),
      u?.isRestricted ? 'заблокирован blocked from' : 'активен active',
      ...dateVariants(u?.dateOfRestriction),
      t(u?.causeOfRestriction),
      ...dateVariants(u?.dateOfStart),
    ],
    contacts: (u) => u?.contacts ?? [],
    addresses: (u) => u?.addresses ?? [],
    firstNonRestrictedAddress: (u) => (u?.addresses ?? []).find(a => !a?.isRestricted),
    outdatedNames: (u) =>
      (u?.outdatedNames ?? [])
        .flatMap(i => [i.firstName, i.patronymic, i.lastName, i.userName])
        .filter(Boolean)
        .join(' '),
  },

  partner: {
    basicTokens: (p) => [
      t(p?.firstName), t(p?.patronymic), t(p?.lastName),
      t(p?.affiliation), // volunteerCoordinator/homeRepresentative/foundationStaff
      t(p?.position),
      t(p?.comment),
      p?.isRestricted ? 'бывший former' : 'действующий active',
      ...dateVariants(p?.dateOfRestriction),
      t(p?.causeOfRestriction),
      ...dateVariants(p?.dateOfStart),
    ],
    contacts: (p) => p?.contacts ?? [],
    addresses: (p) => p?.addresses ?? [],
    firstNonRestrictedAddress: (p) => (p?.addresses ?? []).find(a => !a?.isRestricted),
    outdatedNames: (p) =>
      (p?.outdatedNames ?? [])
        .flatMap(i => [i.firstName, i.patronymic, i.lastName])
        .filter(Boolean)
        .join(' '),
    //houses: (p) => p?.name ?? [],
  },
};

// ---------- Public API ----------
/** Actual Search String*/
export function createSearchStringFor(kind, record) {
  const C = OWNER_CONFIG[kind];
  if (!C) throw new Error(`Unsupported owner kind: ${kind}`);

  const tokens = [];
  tokens.push(...C.basicTokens(record));

  // contacts (only not restricted)
  for (const c of C.contacts(record)) {
    if (!c?.isRestricted && c?.content) tokens.push(t(c.content));
  }

  // first non-restricted address
  const addr = C.firstNonRestrictedAddress(record);
  pushAddressTokens(tokens, addr);

  return normalizeSpace(tokens.join(' '));
}

/** Outdated Search String */
export function createOutdatedSearchStringFor(kind, record) {
  const C = OWNER_CONFIG[kind];
  if (!C) throw new Error(`Unsupported owner kind: ${kind}`);

  const parts = [];

  // Restricted contacts
  for (const c of C.contacts(record)) {
    if (c?.isRestricted && c?.content) parts.push(t(c.content));
  }

  // Restricted addresses
  const restricted = C.addresses(record).filter(a => a?.isRestricted);
  for (const a of restricted) pushAddressTokens(parts, a);

  // Outdated names
  const names = C.outdatedNames(record);
  if (names) parts.push(names);

  return normalizeSpace(parts.join(' '));
}
