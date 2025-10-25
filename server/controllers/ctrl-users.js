import { Op, literal } from 'sequelize';

/** Pure: build search string from the hydrated user record */
export function createSearchString(u) {
  let s = [
    u.userName,
    u?.role?.name,
    u.firstName,
    u.patronymic || '',
    u.lastName,
    u.comment || '',
    u.isRestricted ? 'заблокирован с blocked from' : 'активен active',
    u.dateOfRestriction ? safeDate(u.dateOfRestriction) : '',
    u.causeOfRestriction || '',
    safeDate(u.dateOfStart),
  ]
    .filter(Boolean)
    .join(' ');

  // Contacts (not restricted)
  for (const c of (u.contacts ?? [])) {
    if (!c.isRestricted && c.content) s += ` ${c.content}`;
  }

  // First non-restricted address
  const addr = (u.addresses ?? []).find((a) => !a.isRestricted);
  if (addr) {
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

  return s.trim();
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

//TODO: Add date in format dd.mm.yyyy
/** ISOString */
function safeDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(+dt) ? '' : dt.toISOString().slice(0, 10);
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

/** Clause for SearchUser by words + exact flag */
export function buildSearchContentWhere(value, exact) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return undefined;
  const clauses = words.map(w => ({ content: { [Op.iLike]: `%${w}%` } }));
  return exact ? { [Op.and]: clauses } : { [Op.or]: clauses };
}

/** Build contact filter via subquery for strong/weak mode */
export function buildContactUserIdSubquery(types, onlyActual, strong) {
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
        WHERE ${onlyActual ? `"isRestricted" = false AND` : ''} type IN (${list}))`
    );
  }
  // strong: must have ALL distinct selected types
  return literal(
    `(SELECT DISTINCT "userId" FROM "user-contacts"
      WHERE ${onlyActual ? `"isRestricted" = false AND` : ''} type IN (${list})
      GROUP BY "userId"
      HAVING COUNT(DISTINCT type) = ${types.length})`
  );
}

/** Build address filter via subquery (weak/strong) */
export function buildAddressUserIdSubquery(addr, onlyActual, strong) {
  const parts = [];
  if (addr.countries?.length) parts.push(`"countryId" IN (${addr.countries.map(id => +id).join(',')})`);
  if (addr.regions?.length) parts.push(`"regionId" IN (${addr.regions.map(id => +id).join(',')})`);
  if (addr.districts?.length) parts.push(`"districtId" IN (${addr.districts.map(id => +id).join(',')})`);
  if (addr.localities?.length) parts.push(`"localityId" IN (${addr.localities.map(id => +id).join(',')})`);

  if (!parts.length) return undefined;
  const whereCombo = parts.join(' OR ');
  const restrict = onlyActual ? `"isRestricted" = false AND` : '';

  if (!strong) {
    // any of the location levels
    return literal(
      `(SELECT DISTINCT "userId" FROM "user-addresses"
        WHERE ${restrict} (${whereCombo}))`
    );
  }

  // strong mode: require presence across each selected level (counts per column)
  const counts = [];
  if (addr.countries?.length) counts.push(`COUNT(DISTINCT "countryId") = ${addr.countries.length}`);
  if (addr.regions?.length) counts.push(`COUNT(DISTINCT "regionId") = ${addr.regions.length}`);
  if (addr.districts?.length) counts.push(`COUNT(DISTINCT "districtId") = ${addr.districts.length}`);
  if (addr.localities?.length) counts.push(`COUNT(DISTINCT "localityId") = ${addr.localities.length}`);
  const having = counts.join(' AND ') || '1=1';

  return literal(
    `(SELECT "userId" FROM "user-addresses"
      WHERE ${restrict} (${whereCombo})
      GROUP BY "userId"
      HAVING ${having})`
  );
}
