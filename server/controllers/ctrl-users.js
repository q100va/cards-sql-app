import { Op, literal } from 'sequelize';
import {
  Region, District, Locality
} from "../models/index.js";


// --- helpers ---------------------------------------------

/** dd.MM.yyyy (from parts) */
function fmtDMYparts(y, m, d) {
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${dd}.${mm}.${y}`;
}

/** MM/dd/yyyy (from parts) */
function fmtMDYparts(y, m, d) {
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${mm}/${dd}/${y}`;
}

/** Returns ISO (YYYY-MM-DD), dd.MM.yyyy, MM/dd/yyyy — TZ-safe */
function dateVariants(d) {
  if (!d) return [];

  // Case 1: plain ISO date string -> parse manually (no TZ)
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number);
    const iso = `${String(y)}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return [iso, fmtDMYparts(y, m, day), fmtMDYparts(y, m, day)];
  }

  // Case 2: Date / other string -> use UTC components to avoid local shift
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(+dt)) return [];

  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  const day = dt.getUTCDate();

  const iso = `${String(y)}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return [iso, fmtDMYparts(y, m, day), fmtMDYparts(y, m, day)];
}


/** Safe string token (skips empty/null/undefined) */
function t(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return s ? s : '';
}

// --- main -------------------------------------------------

/**
 * Builds a flat searchable string for a user.
 * Includes: identity, role, status, dates (ISO + dd.MM.yyyy + MM/dd/yyyy),
 * contacts (only non-restricted), first non-restricted address.
 */
export function createSearchString(u) {
  const tokens = [];

  // basic fields
  tokens.push(
    t(u?.userName),
    t(u?.role?.name),
    t(u?.firstName),
    t(u?.patronymic),
    t(u?.lastName),
    t(u?.comment)
  );

  // status (both ru/en keywords as before)
  tokens.push(u?.isRestricted ? 'заблокирован blocked from' : 'активен active');

  // restriction date
  tokens.push(...dateVariants(u?.dateOfRestriction));

  // cause of restriction
  tokens.push(t(u?.causeOfRestriction));

  // start date
  tokens.push(...dateVariants(u?.dateOfStart));

  // contacts (only not restricted)
  for (const c of (u?.contacts ?? [])) {
    if (!c?.isRestricted && c?.content) tokens.push(t(c.content));
  }

  // first non-restricted address
  const addr = (u?.addresses ?? []).find((a) => !a?.isRestricted);
  if (addr) {
    tokens.push(
      t(addr.country?.name),
      t(addr.region?.name ?? addr.region?.shortName),
      t(addr.district?.name ?? addr.district?.shortName),
      t(addr.locality?.name ?? addr.locality?.shortName)
    );
  }

  // collapse consecutive spaces and trim
  return tokens.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/** Pure: build search string from the hydrated user record for outdated data*/
export function createOutdatedSearchString(u) {
  let s = '';
  // Restricted contacts
  for (const c of (u.contacts ?? [])) {
    if (c.isRestricted && c.content) s += ` ${c.content}`;
  }
  // Restricted addresses
  const addresses = (u.addresses ?? []).filter((a) => a.isRestricted);
  if (addresses.length > 0) {
    for (const addr of addresses) {
      s += [
        addr.country?.name || '',
        addr.region?.name || '',
        addr.district?.name || '',
        addr.locality?.name || '',
      ]
        .filter(Boolean)
        .map((x) => ` ${x}`)
        .join('');
    }
  }
  //Outdated names
  const outdatedNames = u.outdatedNames
    .flatMap(i => [i.firstName, i.patronymic, i.lastName, i.userName])
    .filter((v) => !!v && v.length > 0)
    .join(' ');
  s += outdatedNames;
  return s.trim();
}

/** Non nullable data*/
export const pruneNulls = (obj) => {
  if (!obj) return obj;
  const out = { ...obj };
  for (const k of Object.keys(out)) if (out[k] === null) delete out[k];
  return out;
};

/** Transform user to User*/
export function transformUserData(rawUserData) {
  const user = { ...rawUserData };

  // roleName
  user.roleName = user.role?.name;
  delete user.role;

  // contacts → orderedContacts/outdatedData.contacts
  const orderedContacts = {};
  const outdatedContacts = {};

  for (let c of user.contacts ?? []) {
    const isTelegram = [
      'telegramNickname',
      'telegramPhoneNumber',
      'telegramId'].includes(c.type);

    if (!c.isRestricted) {
      if (isTelegram) {
        (orderedContacts['telegram'] ||= []).push({ id: c.id, content: c.content });
      }
      (orderedContacts[c.type] ||= []).push({ id: c.id, content: c.content });
    } else {
      (outdatedContacts[c.type] ||= []).push({ id: c.id, content: c.content });
    }
  }

  user.orderedContacts = orderedContacts;
  const outdatedData = { contacts: outdatedContacts, addresses: [], names: [], userNames: [] };
  delete user.contacts;

  // addresses → user.address + outdatedData.addresses
  const ref = (o, key = 'name') =>
    o ? { id: o.id, [key]: o[key] } : null;

  const allAddrs = user.addresses ?? [];
  const actual = allAddrs.filter(a => !a.isRestricted);
  const outdatedAddresses = allAddrs
    .filter(a => a.isRestricted)
    .map(a => ({
      country: ref(a.country, 'name'),
      region: ref(a.region, 'shortName'),
      district: ref(a.district, 'shortName'),
      locality: ref(a.locality, 'shortName'),
      isRecoverable: a.isRecoverable,
      id: a.id,
    }));
  outdatedData.addresses = outdatedAddresses;

  const a = actual[0];
  user.address = a
    ? {
      country: ref(a.country, 'name'),
      region: ref(a.region, 'shortName'),
      district: ref(a.district, 'shortName'),
      locality: ref(a.locality, 'shortName'),
      id: a.id,
    }
    : { country: null, region: null, district: null, locality: null };
  delete user.addresses;


  // outdatedNames → outdatedData.names/userNames
  if (user.outdatedNames?.length) {
    outdatedData.names = user.outdatedNames
      .filter(n => n.firstName !== null)
      .map(n => ({ firstName: n.firstName, patronymic: n.patronymic, lastName: n.lastName, id: n.id }));
    outdatedData.userNames = user.outdatedNames
      .filter(n => n.userName !== null)
      .map(n => ({ userName: n.userName, id: n.id }));
  }
  delete user.outdatedNames;

  user.outdatedData = outdatedData;

  // console.log('transformed user data:', user.orderedContacts.email);

  return user;
}

/** Build default-safe order array */
export function buildOrder(sort) {
  if (!sort?.length) return [['userName', 'ASC']];
  // only first sort key for now (extend if needed)
  const [{ field, direction }] = sort;
  if (field === 'role') {
    // order by joined role.name
    return [[literal(`(SELECT "name" FROM "roles" WHERE "roles"."id" = "user"."roleId")`), direction.toUpperCase()]];
  }
  return [[field, direction.toUpperCase()]];
}

/** Convert ISO tuple [from,to] into Sequelize where with < next-day for inclusive upper bound */
export function betweenDatesInclusive([fromISO, toISO]) {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  // inclusive end: add 1 day and use < bound
  const endExclusive = new Date(to.getTime() + 24 * 60 * 60 * 1000);
  return { [Op.gte]: from, [Op.lt]: endExclusive };
}

/** Clause for UserSearch by words + exact flag */
export function buildSearchContentWhere(value, exact) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return undefined;
  const clauses = words.map(w => ({ content: { [Op.iLike]: `%${w}%` } }));
  return exact ? { [Op.and]: clauses } : { [Op.or]: clauses };
}

/** Build contact filter via subquery for strong/weak mode */
export function buildContactUserIdSubquery(types, includeOutdated, strong) {
  if (!types.length) return undefined;
  let list = '';
  for (let item of types) {
    list += `'` + item + `', `;
  }
  list = list.slice(0, -2);
  if (!strong) {
    // any of the types
    return literal(
      `(SELECT DISTINCT "userId" FROM "user-contacts"
        WHERE ${!includeOutdated ? `"isRestricted" = false AND` : ''} type IN (${list}))`
    );
  }
  // strong: must have ALL distinct selected types
  return literal(
    `(SELECT DISTINCT "userId" FROM "user-contacts"
      WHERE ${!includeOutdated ? `"isRestricted" = false AND` : ''} type IN (${list})
      GROUP BY "userId"
      HAVING COUNT(DISTINCT type) = ${types.length})`
  );
}

export async function buildAddressUserIdSubquery(addresses, includeOutdated, strictAddressMode) {
  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getParentId = async (ToponymModel, id, parentKey) => {
    const row = await ToponymModel.findOne({
      where: { id },
      attributes: [parentKey],
      raw: true,
    });
    return row?.[parentKey] ?? null;
  };

  const dropParent = (parentType, parentId) => {
    if (!parentId) return;
    const arr = addresses[parentType] ?? [];
    addresses[parentType] = arr.filter((i) => i !== parentId);
  };

  const idsToSqlList = (ids) =>
    ids && ids.length ? `(${ids.map((id) => `'${id}'`).join(', ')})` : '';

  const buildIdsList = async (
    type,
    ToponymModel,
    parentKey,
    parentType,
  ) => {
    const selected = addresses[type] ?? [];
    if (!selected.length) return '';

    for (const id of selected) {
      const p1 = parentKey ? await getParentId(ToponymModel, id, parentKey) : null;
      if (parentType) dropParent(parentType, p1);
      if (type === 'localities') {
        const p2 = p1 ? await getParentId(District, p1, 'regionId') : null;
        dropParent('regions', p2);
        const p3 = p2 ? await getParentId(Region, p2, 'countryId') : null;
        dropParent('countries', p3);
      } else if (type === 'districts') {
        const p2 = p1 ? await getParentId(Region, p1, 'countryId') : null;
        dropParent('countries', p2);
      } else if (type === 'regions') {
        dropParent('countries', p1);
      }
    }

    return idsToSqlList(selected);
  };

  // ── Build lists ──────────────────────────────────────────────────────────────
  const listOfLocalitiesIds = await buildIdsList('localities', Locality, 'districtId', 'districts');
  const listOfDistrictsIds = await buildIdsList('districts', District, 'regionId', 'regions');
  const listOfRegionsIds = await buildIdsList('regions', Region, 'countryId', 'countries');

  const countriesAmount = addresses.countries.length;
  const regionsAmount = addresses.regions?.length ?? 0;
  const districtsAmount = addresses.districts?.length ?? 0;
  const localitiesAmount = addresses.localities?.length ?? 0;

  const listOfCountriesIds = idsToSqlList(addresses.countries);

  // ── OR-where ───────────────────────────────────────────────
  const parts = [];
  if (listOfCountriesIds) parts.push(`"countryId" IN ${listOfCountriesIds}`);
  if (listOfRegionsIds) parts.push(`"regionId" IN ${listOfRegionsIds}`);
  if (listOfDistrictsIds) parts.push(`"districtId" IN ${listOfDistrictsIds}`);
  if (listOfLocalitiesIds) parts.push(`"localityId" IN ${listOfLocalitiesIds}`);

  const whereString = parts.join(' OR ');
  const sub = (!strictAddressMode) ? literal(
    `(SELECT DISTINCT "userId" FROM "user-addresses"
            WHERE ${!includeOutdated ? '"isRestricted" = false AND' : ''} (${whereString}))`
  ) : literal(
    `(SELECT DISTINCT "userId" FROM "user-addresses"
            WHERE ${!includeOutdated ? '"isRestricted" = false AND' : ''} (${whereString})
            GROUP BY "userId"
            HAVING
            ${countriesAmount ? `COUNT(DISTINCT "countryId")=${countriesAmount}` : ''}
            ${countriesAmount && (regionsAmount || districtsAmount || localitiesAmount) ? ' AND ' : ''}
              ${regionsAmount ? `COUNT(DISTINCT "regionId")=${regionsAmount}` : ''}
              ${regionsAmount && (districtsAmount || localitiesAmount) ? ' AND ' : ''}
              ${districtsAmount ? `COUNT(DISTINCT "districtId")=${districtsAmount}` : ''}
              ${districtsAmount && localitiesAmount ? ' AND ' : ''}
              ${localitiesAmount ? `COUNT(DISTINCT "localityId")=${localitiesAmount}` : ''}
          )`);
  console.log('sub', sub);
  return sub;

}
