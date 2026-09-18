import { Op, literal } from 'sequelize';
import {
  District,
  Home,
  HomeAddress,
  Locality,
  Region,
} from '../models/index.js';
import CustomError from '../shared/customError.js';

// ── CONFIG per owner ───────────────────────────────────────────────────────────
const OWNER_CONFIG = {
  user: {
    idField: 'userId',
    contactsTable: 'user-contacts',
    addressesTable: 'user-addresses',
    defaultOrderField: 'userName',
    // Custom sort keys mapped to fields, literals, or association paths.
    orderKeys: {
      role: () =>
        literal(
          `(SELECT "name" FROM "roles" WHERE "roles"."id" = "user"."roleId")`,
        ),
      name: () => "firstName",
    },
  },
  partner: {
    idField: 'partnerId',
    contactsTable: 'partner-contacts',
    addressesTable: 'partner-addresses',
    defaultOrderField: 'firstName',
    orderKeys: {
      name: () => "firstName",
    },
  },
  volunteer: {
    idField: 'volunteerId',
    contactsTable: 'volunteer-contacts',
    addressesTable: 'volunteer-addresses',
    defaultOrderField: 'firstName',
    orderKeys: {
      name: () => "firstName",
      dateOfLastOrder: () => "firstName", // TODO:
    },
  },
  home: {
    idField: 'homeId',
    contactsTable: 'home-contacts',
    addressesTable: 'home-addresses',
    defaultOrderField: 'homeName',
    orderKeys: {
      name: () => "homeName",
      regionName: () => [
        { model: HomeAddress, as: 'activeAddress' },
        { model: Region, as: 'region' },
        'name',
      ],
      dateOfLastUpdate: () =>
        literal(
          `(SELECT "date" FROM "home-update-dates" AS "updateDate" WHERE "updateDate"."homeId" = "home"."id" AND "updateDate"."isLatest" = true)`,
        ),
    },
  },
  senior: {
    idField: 'homeId',
    addressesTable: 'home-addresses',
    as: 'activeAddress',
    defaultOrderField: 'lastName',
    orderKeys: {
      name: () => "lastName",
      status: () => "isRestricted",
      home: () =>
        literal(
          `(SELECT "homeName" FROM "homes" AS "home" WHERE "home"."id" = "senior"."homeId")`,
        ),
      regionName: () => [
        { model: Home, as: 'home' },
        { model: HomeAddress, as: 'activeAddress' },
        { model: Region, as: 'region' },
        'name',
      ],
    },
  },
};

// ── Sorting  ────────────────────────────────────────────────────────────────

/** Build default-safe order array for a given owner kind */
export function buildOrderFor(kind, sort) {
  const config = OWNER_CONFIG[kind];
  if (!config) throw new CustomError('ERRORS.UNSUPPORTED_TYPE', 500);

  if (!sort?.length) return [[config.defaultOrderField, 'ASC']];

  const [{ field, direction }] = sort;
  const normalizedDirection = String(direction ?? 'ASC').toUpperCase();
  const orderDirection = normalizedDirection === 'DESC' ? 'DESC' : 'ASC';

  const orderKeyResolver = config.orderKeys?.[field];

  if (orderKeyResolver) {
    const orderKey = orderKeyResolver();

    // 1) order-path: [ {model, as}, {model, as}, 'col' ]
    if (Array.isArray(orderKey)) {
      return [[...orderKey, orderDirection]];
    }

    // 2) literal / fn / string field
    return [[orderKey, orderDirection]];
  }

  return [[field, orderDirection]];
}

// ── Date and content search helpers ────────────────────────────────────────────────────

/** Convert ISO tuple [from,to] into Sequelize where with < next-day for inclusive upper bound */
export function betweenDatesInclusive([fromISO, toISO]) {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  const endExclusive = new Date(to.getTime() + 24 * 60 * 60 * 1000);
  return { [Op.gte]: from, [Op.lt]: endExclusive };
}

/** Clause for Search by words + exact flag (works for any owner) */
export function buildSearchContentWhere(value, exact) {
  const words = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return undefined;

  const clauses = words.map((word) => ({
    content: {
      [Op.iLike]: `%${word}%`,
    },
  }));

  return exact ? { [Op.and]: clauses } : { [Op.or]: clauses };
}

// ── Contact owner ID subqueries ─────────────────────────────────────────

/**
 * Builds an owner ID subquery for contact filtering
 * in strong or weak mode.
 */
export function buildContactOwnerIdSubquery(
  kind,
  types = [],
  includeOutdated = false,
  strong = false,
) {
  const config = OWNER_CONFIG[kind];
  if (!config) throw new CustomError('ERRORS.UNSUPPORTED_TYPE', 500);
  if (!types.length) return undefined;

  // Contact types are predefined enum values, not raw user input.
  const typesSqlList = `(${types
    .map((type) => `'${type}'`)
    .join(', ')})`;

  const restrictedCondition = includeOutdated
    ? ''
    : `"isRestricted" = false AND`;

  if (!strong) {
    // any of the types
    return literal(
      `(SELECT DISTINCT "${config.idField}" FROM "${config.contactsTable}"
        WHERE ${restrictedCondition} type IN ${typesSqlList})`,
    );
  }
  // strong: must have ALL distinct selected types
  return literal(
    `(SELECT DISTINCT "${config.idField}" FROM "${config.contactsTable}"
      WHERE ${restrictedCondition} type IN ${typesSqlList}
      GROUP BY "${config.idField}"
      HAVING COUNT(DISTINCT type) = ${types.length})`,
  );
}

// ── Address owner ID subqueries ──────────────────────────────────────────

/**
 * Build address ownerId subquery by selected toponyms.
 * addresses = { countries:[], regions:[], districts:[], localities:[] }
 */
export async function buildAddressOwnerIdSubquery(
  kind,
  addresses,
  includeOutdated = false,
  strictAddressMode = false,
) {
  const config = OWNER_CONFIG[kind];
  if (!config) throw new CustomError('ERRORS.UNSUPPORTED_TYPE', 500);

  // ── Helpers ───────────────────────────────────────────────
  const getParentId = async (ToponymModel, id, parentKey) => {
    if (!id) return null;

    const row = await ToponymModel.findOne({
      where: { id },
      attributes: [parentKey],
      raw: true,
    });

    return row?.[parentKey] ?? null;
  };

  const selectedAddresses = {
    countries: [...(addresses?.countries ?? [])],
    regions: [...(addresses?.regions ?? [])],
    districts: [...(addresses?.districts ?? [])],
    localities: [...(addresses?.localities ?? [])],
  };

  const dropParent = (parentType, parentId) => {
    if (!parentId) return;

    const selectedParentIds = selectedAddresses[parentType] ?? [];

    selectedAddresses[parentType] = selectedParentIds.filter(
      (selectedId) => selectedId !== parentId,
    );
  };

  const idsToSqlList = (ids) =>
    ids && ids.length ? `(${ids.map((id) => `'${id}'`).join(', ')})` : '';

  const buildIdsList = async (
    type,
    ToponymModel,
    parentKey,
    parentType,
  ) => {
    const selected = selectedAddresses[type] ?? [];
    if (!selected.length) return '';

    for (const selectedId of selected) {
      const parentId = parentKey
        ? await getParentId(ToponymModel, selectedId, parentKey)
        : null;

      if (parentType) {
        dropParent(parentType, parentId);
      }

      if (type === 'localities') {
        const districtId = parentId;

        const regionId = districtId
          ? await getParentId(District, districtId, 'regionId')
          : null;

        dropParent('regions', regionId);

        const countryId = regionId
          ? await getParentId(Region, regionId, 'countryId')
          : null;

        dropParent('countries', countryId);
      } else if (type === 'districts') {
        const regionId = parentId;

        const countryId = regionId
          ? await getParentId(Region, regionId, 'countryId')
          : null;

        dropParent('countries', countryId);
      } else if (type === 'regions') {
        const countryId = parentId;

        dropParent('countries', countryId);
      }
    }

    return idsToSqlList(selected);
  };

  // ── Build lists ───────────────────────────────────────────
  const listOfLocalitiesIds = await buildIdsList(
    'localities',
    Locality,
    'districtId',
    'districts',
  );
  const listOfDistrictsIds = await buildIdsList(
    'districts',
    District,
    'regionId',
    'regions',
  );
  const listOfRegionsIds = await buildIdsList(
    'regions',
    Region,
    'countryId',
    'countries',
  );
  const listOfCountriesIds = idsToSqlList(selectedAddresses.countries);

  const countriesAmount = selectedAddresses.countries?.length ?? 0;
  const regionsAmount = selectedAddresses.regions?.length ?? 0;
  const districtsAmount = selectedAddresses.districts?.length ?? 0;
  const localitiesAmount = selectedAddresses.localities?.length ?? 0;

  const parts = [];
  if (listOfCountriesIds) parts.push(`"countryId"  IN ${listOfCountriesIds}`);
  if (listOfRegionsIds) parts.push(`"regionId"   IN ${listOfRegionsIds}`);
  if (listOfDistrictsIds) {
    parts.push(`"districtId" IN ${listOfDistrictsIds}`);
  }
  if (listOfLocalitiesIds) {
    parts.push(`"localityId" IN ${listOfLocalitiesIds}`);
  }

  // Prevent matching all records when no address filters are present.
  const whereString = parts.join(' OR ') || '1=0';
  const restrictedCondition = includeOutdated
    ? ''
    : `"isRestricted" = false AND`;
  const aliasSql = config.as ? `AS "${config.as}"` : '';

  if (!strictAddressMode) {
    return literal(
      `(SELECT DISTINCT "${config.idField}" FROM "${config.addressesTable}" ${aliasSql}
        WHERE ${restrictedCondition} (${whereString}))`,
    );
  }

  // Strict mode requires all selected address values to be present.
  const havingParts = [];

  if (countriesAmount) {
    havingParts.push(
      `COUNT(
      DISTINCT CASE
        WHEN "countryId" IN ${listOfCountriesIds}
        THEN "countryId"
      END
    ) = ${countriesAmount}`,
    );
  }

  if (regionsAmount) {
    havingParts.push(
      `COUNT(
      DISTINCT CASE
        WHEN "regionId" IN ${listOfRegionsIds}
        THEN "regionId"
      END
    ) = ${regionsAmount}`,
    );
  }

  if (districtsAmount) {
    havingParts.push(
      `COUNT(
      DISTINCT CASE
        WHEN "districtId" IN ${listOfDistrictsIds}
        THEN "districtId"
      END
    ) = ${districtsAmount}`,
    );
  }

  if (localitiesAmount) {
    havingParts.push(
      `COUNT(
      DISTINCT CASE
        WHEN "localityId" IN ${listOfLocalitiesIds}
        THEN "localityId"
      END
    ) = ${localitiesAmount}`,
    );
  }

  const havingString = havingParts.join(' AND ') || '1=1';

  return literal(
    `(SELECT DISTINCT "${config.idField}"
    FROM "${config.addressesTable}" ${aliasSql}
    WHERE ${restrictedCondition} (${whereString})
    GROUP BY "${config.idField}"
    HAVING ${havingString}
  )`,
  );
}
