// utils/transform-owner.js

// --- Helpers ---------------------------------------------------------------

const TELEGRAM_TYPES = new Set(['telegramNickname', 'telegramPhoneNumber', 'telegramId']);

/** Safe toponym ref: { id, name|shortName } or null */
function ref(t, key = 'name') {
  return t ? { id: t.id, [key]: t[key] } : null;
}

/** Split contacts into ordered (actual) and outdated buckets */
function splitContacts(contacts) {
  const ordered = {};
  const outdated = {};

  for (const c of contacts ?? []) {
    if (!c) continue;
    const row = { id: c.id, content: c.content };

    if (!c.isRestricted) {
      // Merge telegram types into a unified "telegram" bucket
      if (TELEGRAM_TYPES.has(c.type)) {
        (ordered.telegram ||= []).push(row);
      }
      (ordered[c.type] ||= []).push(row);
    } else {
      (outdated[c.type] ||= []).push(row);
    }
  }
  return { orderedContacts: ordered, outdatedContacts: outdated };
}

/** Build current address (first non-restricted) and list of outdated addresses */
function splitAddresses(addresses) {
  const all = addresses ?? [];
  const actual = all.filter(a => !a?.isRestricted);
  const a = actual[0];

  const address = a
    ? {
        country: ref(a.country, 'name'),
        region: ref(a.region, 'shortName'),
        district: ref(a.district, 'shortName'),
        locality: ref(a.locality, 'shortName'),
        id: a.id,
      }
    : { country: null, region: null, district: null, locality: null };

  const outdatedAddresses = all
    .filter(a => a?.isRestricted)
    .map(a => ({
      country: ref(a.country, 'name'),
      region: ref(a.region, 'shortName'),
      district: ref(a.district, 'shortName'),
      locality: ref(a.locality, 'shortName'),
      isRecoverable: !!a.isRecoverable,
      id: a.id,
    }));

  return { address, outdatedAddresses };
}

/** Map outdated names for User: split into names[] and userNames[] */
function splitNamesUser(list) {
  const names = (list ?? [])
    .filter(n => n && n.firstName !== null)
    .map(n => ({ id: n.id, firstName: n.firstName, patronymic: n.patronymic, lastName: n.lastName }));

  const userNames = (list ?? [])
    .filter(n => n && n.userName !== null)
    .map(n => ({ id: n.id, userName: n.userName }));

  return { names, userNames };
}

/** Map outdated names for Partner: only FIO list */
function splitNamesPartner(list) {
  const names = (list ?? [])
    .filter(n => n && n.firstName !== null)
    .map(n => ({ id: n.id, firstName: n.firstName, patronymic: n.patronymic, lastName: n.lastName }));
  return { names };
}

/**
 * Extract partner homes and outdated homes.
 * Expects either:
 *   - raw.coordinatedHomes / raw.outdatedCoordinatedHomes
 *   - or raw.homes / raw.outdatedHomes
 */
function splitHomesForPartner(raw) {
  const homesSource = raw.coordinatedHomes ?? raw.homes ?? [];
  const outdatedSource = raw.outdatedCoordinatedHomes ?? raw.outdatedHomes ?? [];

  const homes = homesSource.map(h => ({
    id: h.id,
    homeId: h.homeId,
    homeName: h.homeName,
    homeRegionName: h.homeRegionName,
  }));

  const outdatedHomes = outdatedSource.map(h => ({
    id: h.id,
    homeId: h.homeId,
    homeName: h.homeName,
    homeRegionName: h.homeRegionName,
    isRecoverable: !!h.isRecoverable,
  }));

  return { homes, outdatedHomes };
}

// --- Public API ------------------------------------------------------------

/**
 * Universal transformer for owner data.
 * kind: 'user' | 'partner'
 * Returns a shallow-cloned, view-ready object:
 *  - orderedContacts
 *  - address
 *  - outdatedData: { contacts, addresses, names [, userNames] [, homes] }
 *  - user.roleName (for user)
 *  - partner.homes (for partner)
 */
export function transformOwnerData(kind, raw) {
  const o = { ...raw }; // do not mutate input

  // 1) Contacts
  const { orderedContacts, outdatedContacts } = splitContacts(o.contacts);
  o.orderedContacts = orderedContacts;
  delete o.contacts;

  // 2) Addresses
  const { address, outdatedAddresses } = splitAddresses(o.addresses);
  o.address = address;
  delete o.addresses;

  // 3) Outdated names (differs for user vs partner)
  const outdatedData = { contacts: outdatedContacts, addresses: outdatedAddresses, names: [] };

  if (kind === 'user') {
    // Pull role name onto root and drop original relation
    o.roleName = o.role?.name;
    delete o.role;

    const { names, userNames } = splitNamesUser(o.outdatedNames);
    outdatedData.names = names;
    outdatedData.userNames = userNames;
    delete o.outdatedNames;

  } else if (kind === 'partner') {
    const { names } = splitNamesPartner(o.outdatedNames);
    outdatedData.names = names;
    delete o.outdatedNames;

    // 4) Homes (actual + outdated)
    const { homes, outdatedHomes } = splitHomesForPartner(raw);
    o.homes = homes;
    outdatedData.homes = outdatedHomes;
  } else {
    throw new Error(`Unsupported kind: ${kind}`);
  }

  o.outdatedData = outdatedData;
  return o;
}
