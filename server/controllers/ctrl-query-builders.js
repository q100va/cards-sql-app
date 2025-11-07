// utils/query-builders.js
import { Op, literal } from 'sequelize';
import { Region, District, Locality } from '../models/index.js';

// ── CONFIG per owner ───────────────────────────────────────────────────────────
const OWNER = {
  user: {
    idField: 'userId',
    contactsTable: 'user-contacts',
    addressesTable: 'user-addresses',
    defaultOrderField: 'userName',
    // спец-ключи сортировки → expression-or-[field]
    orderKeys: {
      role: () =>
        literal(`(SELECT "name" FROM "roles" WHERE "roles"."id" = "user"."roleId")`)
    },
  },
  partner: {
    idField: 'partnerId',
    contactsTable: 'partner-contacts',
    addressesTable: 'partner-addresses',
    defaultOrderField: 'lastName', // можно поменять на firstName, как тебе удобнее
    orderKeys: {
      affiliation: () => literal(`"partner"."affiliation"`),
      position:    () => literal(`"partner"."position"`),
    },
  },
};

// ── сортировка ────────────────────────────────────────────────────────────────

/** Build default-safe order array for a given owner kind */
export function buildOrderFor(kind, sort) {
  const C = OWNER[kind];
  if (!C) throw new Error(`Unsupported kind: ${kind}`);

  if (!sort?.length) return [[C.defaultOrderField, 'ASC']];

  const [{ field, direction }] = sort;
  const dir = String(direction || 'ASC').toUpperCase();

  // спец-ключи (role / affiliation / position и т.п.)
  if (C.orderKeys[field]) {
    return [[C.orderKeys[field](), dir]];
  }
  // обычные поля
  return [[field, dir]];
}

// ── даты/поиск по контенту ────────────────────────────────────────────────────

/** Convert ISO tuple [from,to] into Sequelize where with < next-day for inclusive upper bound */
export function betweenDatesInclusive([fromISO, toISO]) {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  const endExclusive = new Date(to.getTime() + 24 * 60 * 60 * 1000);
  return { [Op.gte]: from, [Op.lt]: endExclusive };
}

/** Clause for Search by words + exact flag (works for any owner) */
export function buildSearchContentWhere(value, exact) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return undefined;
  const clauses = words.map(w => ({ content: { [Op.iLike]: `%${w}%` } }));
  return exact ? { [Op.and]: clauses } : { [Op.or]: clauses };
}

// ── контакты: подзапрос id владельцев ─────────────────────────────────────────

/**
 * Build contact filter via subquery for strong/weak mode (user|partner)
 * @param {'user'|'partner'} kind
 * @param {string[]} types
 * @param {boolean} includeOutdated include restricted
 * @param {boolean} strong require ALL selected types
 */
export function buildContactOwnerIdSubquery(kind, types = [], includeOutdated = false, strong = false) {
  const C = OWNER[kind];
  if (!C) throw new Error(`Unsupported kind: ${kind}`);
  if (!types.length) return undefined;

  // простое экранирование списка строк (значения ключей — константы перечисления, не user input)
  const list = `(${types.map(t => `'${t}'`).join(', ')})`;
  const restricted = includeOutdated ? '' : `"isRestricted" = false AND`;

  if (!strong) {
    // any of the types
    return literal(
      `(SELECT DISTINCT "${C.idField}" FROM "${C.contactsTable}"
        WHERE ${restricted} type IN ${list})`
    );
  }
  // strong: must have ALL distinct selected types
  return literal(
    `(SELECT DISTINCT "${C.idField}" FROM "${C.contactsTable}"
      WHERE ${restricted} type IN ${list}
      GROUP BY "${C.idField}"
      HAVING COUNT(DISTINCT type) = ${types.length})`
  );
}

// ── адреса: подзапрос id владельцев ──────────────────────────────────────────

/**
 * Build address ownerId subquery by selected toponyms.
 * addresses = { countries:[], regions:[], districts:[], localities:[] }
 */
export async function buildAddressOwnerIdSubquery(kind, addresses, includeOutdated = false, strictAddressMode = false) {
  const C = OWNER[kind];
  if (!C) throw new Error(`Unsupported kind: ${kind}`);
  addresses = addresses || { countries: [], regions: [], districts: [], localities: [] };

  // ── Helpers ───────────────────────────────────────────────
  const getParentId = async (ToponymModel, id, parentKey) => {
    if (!id) return null;
    const row = await ToponymModel.findOne({ where: { id }, attributes: [parentKey], raw: true });
    return row?.[parentKey] ?? null;
  };

  const dropParent = (parentType, parentId) => {
    if (!parentId) return;
    const arr = addresses[parentType] ?? [];
    addresses[parentType] = arr.filter((i) => i !== parentId);
  };

  const idsToSqlList = (ids) =>
    ids && ids.length ? `(${ids.map((id) => `'${id}'`).join(', ')})` : '';

  const buildIdsList = async (type, ToponymModel, parentKey, parentType) => {
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

  // ── Build lists ───────────────────────────────────────────
  const listOfLocalitiesIds = await buildIdsList('localities', Locality, 'districtId', 'districts');
  const listOfDistrictsIds = await buildIdsList('districts', District, 'regionId', 'regions');
  const listOfRegionsIds   = await buildIdsList('regions',   Region,   'countryId', 'countries');
  const listOfCountriesIds = idsToSqlList(addresses.countries);

  const countriesAmount = addresses.countries?.length ?? 0;
  const regionsAmount   = addresses.regions?.length ?? 0;
  const districtsAmount = addresses.districts?.length ?? 0;
  const localitiesAmount= addresses.localities?.length ?? 0;

  const parts = [];
  if (listOfCountriesIds)  parts.push(`"countryId"  IN ${listOfCountriesIds}`);
  if (listOfRegionsIds)    parts.push(`"regionId"   IN ${listOfRegionsIds}`);
  if (listOfDistrictsIds)  parts.push(`"districtId" IN ${listOfDistrictsIds}`);
  if (listOfLocalitiesIds) parts.push(`"localityId" IN ${listOfLocalitiesIds}`);

  const whereString = parts.join(' OR ') || '1=0'; // чтобы не вернуть всех, если пусто
  const restricted = includeOutdated ? '' : `"isRestricted" = false AND`;

  if (!strictAddressMode) {
    return literal(
      `(SELECT DISTINCT "${C.idField}" FROM "${C.addressesTable}"
        WHERE ${restricted} (${whereString}))`
    );
  }

  // strict: требуем наличие ВСЕХ выбранных уровней (по количеству distinct)
  return literal(
    `(SELECT DISTINCT "${C.idField}" FROM "${C.addressesTable}"
      WHERE ${restricted} (${whereString})
      GROUP BY "${C.idField}"
      HAVING
        ${countriesAmount   ? `COUNT(DISTINCT "countryId")  = ${countriesAmount}`   : '1=1'}
        ${countriesAmount && (regionsAmount || districtsAmount || localitiesAmount) ? ' AND ' : ''}
        ${regionsAmount     ? `COUNT(DISTINCT "regionId")   = ${regionsAmount}`     : (districtsAmount || localitiesAmount ? '1=1' : '')}
        ${(regionsAmount && (districtsAmount || localitiesAmount)) ? ' AND ' : ''}
        ${districtsAmount   ? `COUNT(DISTINCT "districtId") = ${districtsAmount}`   : (localitiesAmount ? '1=1' : '')}
        ${districtsAmount && localitiesAmount ? ' AND ' : ''}
        ${localitiesAmount  ? `COUNT(DISTINCT "localityId") = ${localitiesAmount}`  : '1=1'}
    )`
  );
}
