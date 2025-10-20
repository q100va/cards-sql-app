import { Country, Region, District, Locality } from "../models/index.js";
import { Op, fn, col, where as sqlWhere } from 'sequelize';
import { correctCountryName, correctDistrictName, correctLocalityName, correctRegionName } from './correct-toponym-name.js';
import CustomError from "../shared/customError.js";

export const MAPS = {
  countries: 'country',
  regions: 'region',
  districts: 'district',
  localities: 'locality',
};

// Query metadata for each toponym type.
export const MAP = {
  country: {
    Model: Country,
    ChildModel: Region,
    needs: ['name'],
    needParent: '',
    parentWhere: (_q) => ({}),
    attributes: ['id', 'name'],
    searchFields: ['name'],
    include: (_q = null) => [],
    where: (q) => ({
      isRestricted: false,
      ...(q.countries.length ? { id: { [Op.in]: q.countries } } : null),
    }),
    order: (q) => [['name', q.sortDir.toUpperCase()]],
  },
  region: {
    Model: Region,
    ChildModel: District,
    needs: ['name', 'countryId', 'shortName'],
    needParent: 'countryId',
    parentWhere: (q) => ({ countryId: q.countryId }),
    attributes: ['id', 'name', 'shortName'],
    searchFields: ['name', 'shortName', '$country.name$'],
    include: (q = null) => {
      return q === null ?
        [{
          model: Country,
          attributes: ['id']
        }] :
        [{
          model: Country, as: 'country',
          attributes: ['id', 'name'],
          required: true,
        }]
    },
    where: (q) => ({
      isRestricted: false,
      ...(q.regions.length ? { id: { [Op.in]: q.regions } } : null),
      ...(q.countries.length ? { countryId: { [Op.in]: q.countries } } : null),
    }),
    order: (q) => (q.sortBy === 'country'
      ? [[{ model: Country, as: 'country' }, 'name', q.sortDir.toUpperCase()]]
      : [[q.sortBy, q.sortDir.toUpperCase()]]),
  },
  district: {
    Model: District,
    ChildModel: Locality,
    needs: ['name', 'regionId', 'shortName', 'postName', 'shortPostName'],
    needParent: 'regionId',
    parentWhere: (q) => ({ regionId: q.regionId }),
    attributes: ['id', 'name', 'shortName', 'postName', 'shortPostName'],
    searchFields: ['name', 'shortName', '$region.name$', '$region.shortName$', '$region.country.name$'],
    include: (q = null) => {
      return q === null ?
        [{
          model: Region,
          attributes: ['id'],
          include: [{ model: Country, attributes: ['id'] }]
        }] :
        [{
          model: Region, as: 'region',
          attributes: ['id', 'name'], required: true,
          include: [{
            model: Country, as: 'country', attributes: ['id', 'name'], required: true,
            where: q.countries.length ? { id: { [Op.in]: q.countries } } : undefined,
          }]
        }]
    },
    where: (q) => ({
      isRestricted: false,
      ...(q.districts.length ? { id: { [Op.in]: q.districts } } : null),
      ...(q.regions.length ? { regionId: { [Op.in]: q.regions } } : null),
    }),
    order: (q) => {
      const dir = q.sortDir.toUpperCase();
      if (q.sortBy === 'region')
        return [[{ model: Region, as: 'region' }, 'name', dir]];
      if (q.sortBy === 'country')
        return [[{ model: Region, as: 'region' }, { model: Country, as: 'country' }, 'name', dir]];
      return [[q.sortBy, dir]]; // name | shortName/postName
    },
  },

  locality: {
    Model: Locality,
    needs: ['name', 'districtId', 'shortName', 'isFederalCity', 'isCapitalOfRegion', 'isCapitalOfDistrict'],
    needParent: 'districtId',
    parentWhere: (q) => ({ districtId: q.districtId }),
    attributes: ['id', 'name', 'shortName', 'isFederalCity', 'isCapitalOfRegion', 'isCapitalOfDistrict'],
    searchFields: [
      'name', 'shortName',
      '$district.name$', '$district.shortName$',
      '$district.region.name$', '$district.region.shortName$',
      '$district.region.country.name$'
    ],
    include: (q = null) => {
      return q === null ?
        [{
          model: District,
          attributes: ['id'],
          include: [{
            model: Region, attributes: ['id'],
            include: [{ model: Country, attributes: ['id'] }],
          },],
        },] :
        [{
          model: District, as: 'district',
          attributes: ['id', 'name'], required: true,
          include: [{
            model: Region, as: 'region',
            attributes: ['id', 'name'], required: true,
            where: q.regions.length ? { id: { [Op.in]: q.regions } } : undefined,
            include: [{
              model: Country, as: 'country',
              attributes: ['id', 'name'], required: true,
              where: q.countries.length ? { id: { [Op.in]: q.countries } } : undefined,
            }],
          }],
        }]
    },
    where: (q) => ({
      isRestricted: false,
      ...(q.localities.length ? { id: { [Op.in]: q.localities } } : null),
      ...(q.districts.length ? { districtId: { [Op.in]: q.districts } } : null),
    }),
    order: (q) => {
      const dir = q.sortDir.toUpperCase();
      if (q.sortBy === 'district')
        return [[{ model: District, as: 'district' }, 'name', dir]];
      if (q.sortBy === 'region')
        return [[{ model: District, as: 'district' }, { model: Region, as: 'region' }, 'name', dir]];
      if (q.sortBy === 'country')
        return [[{ model: District, as: 'district' }, { model: Region, as: 'region' }, { model: Country, as: 'country' }, 'name', dir]];
      return [[q.sortBy, dir]];
    },
  }
};

// Paths used to pull parent ids from raw toponym rows.
const ID_WAYS = {
  locality: {
    locality: 'id',
    district: 'district.id',
    region: 'district.region.id',
    country: 'district.region.country.id',
  },
  district: {
    locality: null,
    district: 'id',
    region: 'region.id',
    country: 'region.country.id',
  },
  region: {
    locality: null,
    district: null,
    region: 'id',
    country: 'country.id',
  },
  country: {
    locality: null,
    district: null,
    region: null,
    country: 'id',
  },
};

// Paths used to pull parent names from raw toponym rows.
const NAME_WAYS = {
  locality: {
    district: 'district.name',
    region: 'district.region.name',
    country: 'district.region.country.name',
  },
  district: {
    region: 'region.name',
    country: 'region.country.name',
  },
  region: {
    country: 'country.name',
  },
  country: {
  },
};

export async function findDuplicate(query) {
  try {
    const cfg = MAP[query.type];

    if (cfg.needParent && query[cfg.needParent] == null) {
      throw new CustomError('ERRORS.VALIDATION', 422);
    }
    const where = {
      name: { [Op.iLike]: query.name },
      isRestricted: false,
      ...cfg.parentWhere(query),
      ...(query.id ? { id: { [Op.ne]: query.id } } : null),
    };
    console.log("WHERE", where);

    const duplicateCount = await cfg.Model.count({ where });
    return duplicateCount;
  } catch (error) {
    error.code = error.code ?? null;
    error.message = `Error in findDuplicate (${query.name}, ${query.type}): ${error.message ?? ''}`;
    throw error;
  }
}

export function postProcessor(toponym, type) {
  toponym = addDefaultAddressParams(toponym, type);
  toponym = addParentsNames(toponym, type);
  return toponym;
};

export async function getToponymById(id, type) {
  try {
    const cfg = MAP[type];
    let toponym = await cfg.Model.findOne({
      where: { id, isRestricted: false },
      attributes: cfg.attributes,
      include: cfg.include(),
      raw: true,
    });
    toponym = addDefaultAddressParams(toponym, type);
    return toponym;
  } catch (error) {
    throw new Error(`Error in getToponymById (${id}, ${type}): ${error.message ?? ''}`);
  }
}

export function addDefaultAddressParams(toponym, type) {

  const idMap = ID_WAYS[type];

  const getId = (key) => {
    const way = idMap[key];
    const id = toponym[way];
    // Remove nested copies so the caller only sees normalized ids.
    if (way != 'id') delete toponym[way];
    return way ? id : null;
  };
  toponym.defaultAddressParams = {
    countryId: getId('country'),
    regionId: getId('region'),
    districtId: getId('district'),
    localityId: getId('locality'),
  };

  return toponym;
}

export function addParentsNames(toponym, type) {

  const nameMap = NAME_WAYS[type];

  const getName = (key) => {
    const way = nameMap[key];
    const name = toponym[way];
    // Strip raw columns now that they are exposed under friendly keys.
    delete toponym[way];
    return way ? name : null;
  };
  if (type !== 'country') {
    toponym.countryName = getName('country');
    if (type !== 'region') {
      toponym.regionName = getName('region');
      if (type !== 'district') {
        toponym.districtName = getName('district');
      }
    }
  }
  return toponym;
}

export const norm = (s) => (s.normalize ? s.normalize('NFC') : s).trim().toLowerCase();
// Returns a list of parent names that could not be resolved for the given rows.
const checkMissingParents = (list, parents, parentType) => {
  let missing = new Set();
  list.forEach((t) => {
    if (!parents[`${parentType}ByLowerName`].get(norm(t[parentType]))) {
      missing.add(t[parentType]);
    }
  });
  missing = [...missing];
  return missing;
}

// Bulk import helpers keyed by toponym type.
export const MAP_POPULATE = {
  country: {
    Model: Country,
    preprocessRow: (row) => {
      const c = correctCountryName(row.name);
      return { ...row, name: c.name };
    },
    keyFromRow: (r) => norm(r.name),
    findParents: async (_rows) => ({}),
    missingParents: (_list, _parents) => [],
    dbWhereFromKeys: (keys) => sqlWhere(fn('lower', col('name')), { [Op.in]: keys }),
    buildPayload: (r, _parents) => [{ name: r.name, shortName: r.shortName }],
  },

  region: {
    Model: Region,
    preprocessRow: (row) => {
      const d = correctRegionName(row.name, row.shortName);
      return { ...row, name: d.name, shortName: d.shortName, postName: d.postName, shortPostName: d.shortPostName };
    },
    keyFromRow: (r) => `${norm(r.name)}`,
    findParents: async (rows) => {
      const wanted = [...new Set(rows.map(r => norm(r.country)))];
      const countries = await Country.findAll({
        attributes: ['id', 'name'],
        where: sqlWhere(fn('lower', col('name')), { [Op.in]: wanted }),
        raw: true,
      });
      return { countryByLowerName: new Map(countries.map(c => [norm(c.name), c])) };
    },
    missingParents: (list, parents) => checkMissingParents(list, parents, 'country'),
    dbWhereFromKeys: (keys) => sqlWhere(fn('lower', col('name')), { [Op.in]: keys }),
    buildPayload: (r, parents) => {
      const c = parents.countryByLowerName.get(norm(r.country));
      return [{ name: r.name, shortName: r.shortName, countryId: c.id }];
    },
  },

  district: {
    Model: District,
    preprocessRow: (row) => {
      const d = correctDistrictName(row.name, row.postName, row.postNameType);
      return { ...row, name: d.name, shortName: d.shortName, postName: d.postName, shortPostName: d.shortPostName };
    },
    keyFromRow: (r) => `${norm(r.region)}|${norm(r.name)}`,
    findParents: async (rows) => {
      const wanted = [...new Set(rows.map(r => norm(r.region)))];
      const regions = await Region.findAll({
        attributes: ['id', 'name'],
        where: sqlWhere(fn('lower', col('name')), { [Op.in]: wanted }),
        raw: true,
      });
      return { regionByLowerName: new Map(regions.map(x => [norm(x.name), x])) };
    },
    missingParents: (list, parents) => checkMissingParents(list, parents, 'region'),
    existingQuery: async (rows, parents) => {
      // Group districts by region so we can query once per region.
      const byRegion = new Map();
      for (const r of rows) {
        const reg = parents.regionByLowerName.get(norm(r.region));
        const set = byRegion.get(reg.id) ?? new Set();
        set.add(norm(r.name));
        byRegion.set(reg.id, set);
      }
      const existing = [];
      for (const [regionId, namesLower] of byRegion) {
        const exist = await District.findAll({
          attributes: ['name'],
          where: { regionId, [Op.and]: [sqlWhere(fn('lower', col('district.name')), { [Op.in]: [...namesLower] })] },
          include: [{
            model: Region,
            attributes: ['name']
          }],
          raw: true,
        });
        existing.push(...exist);
      }
      const conflicts = existing.map(e => `${e.name} (${e['region.name']})`);
      return conflicts;
    },
    buildPayload: (r, parents) => {
      const reg = parents.regionByLowerName.get(norm(r.region));
      return [{
        name: r.name,
        shortName: r.shortName,
        postName: r.postName,
        shortPostName: r.shortPostName,
        regionId: reg.id,
      }];
    },
  },

  locality: {
    Model: Locality,
    keyFromRow: (r) => `${norm(r.name)}|${norm(r.district)}|${norm(r.region)}`,
    findParents: async (rows) => {
      const regNames = [...new Set(rows.map(r => norm(r.region)))];
      const regs = await Region.findAll({
        attributes: ['id', 'name'],
        where: sqlWhere(fn('lower', col('name')), { [Op.in]: regNames }), raw: true
      });
      const regByLower = new Map(regs.map(x => [norm(x.name), x]));
      const byRegion = new Map();
      for (const r of rows) {
        const reg = regByLower.get(norm(r.region));
        if (!reg) {
          throw new CustomError('ERRORS.TOPONYM.BULK_PARENT_NOT_FOUND', 422, { parents: r.region });
        };
        //console.log("ROW");
        //console.log(r);
        const set = byRegion.get(reg.id) ?? new Set();
        set.add(norm(r.districtFullName));
        byRegion.set(reg.id, set);
      }
      //console.log("byRegion");
      //console.log(byRegion);

      const districts = [];
      for (const [regionId, namesLowerSet] of byRegion.entries()) {
        const namesLower = [...namesLowerSet];
        if (namesLower.length === 0) continue;
        const found = await District.findAll({
          attributes: ['id', 'name', 'regionId'],
          where: {
            regionId,
            [Op.and]: [sqlWhere(fn('lower', col('name')), { [Op.in]: namesLower })],
          },
          raw: true,
        });
        districts.push(...found);
      }
      const keyD = (regionId, name) => `${regionId}|${norm(name)}`;
      const districtByKey = new Map();
      for (const d of districts) {
        districtByKey.set(keyD(d.regionId, d.name), d);
      }
      return { regByLower, districtByKey };
    },
    missingParents: (list, parents) => {
      let missing = new Set();
      list.forEach((t) => {
        const reg = parents.regByLower.get(norm(t.region));
        const dist = parents.districtByKey.get(`${reg.id}|${norm(t.districtFullName)}`);
        if (!dist) {
          missing.add(`${t.districtFullName} (${t.region})`);
        }
      });
      missing = [...missing];
      return missing;
    },
    preprocessRow: (row) => {
      const l = correctLocalityName(row.name, row.type, row.district);
      console.log("correctLocalityName");
      console.log(l);
      return { ...row, name: l.name, shortName: l.shortName, districtFullName: l.districtFullName };
    },
    buildPayload: (r, parents) => {
      const reg = parents.regByLower.get(norm(r.region));
      const dist = parents.districtByKey.get(`${reg.id}|${norm(r.districtFullName)}`);
      //console.log("DIST");
      //console.log(dist);
      return [{
        name: r.name,
        shortName: r.shortName,
        isCapitalOfRegion: !!r.isCapitalOfRegion,
        isCapitalOfDistrict: !!r.isCapitalOfDistrict,
        isFederalCity: !!r.isFederalCity,
        districtId: dist.id,
      }];
    },
    existingQuery: async (rows, parents) => {
      // Group localities by district so we can query once per district.
      const byDistrict = new Map();
      for (const r of rows) {
        const reg = parents.regByLower.get(norm(r.region));
        const dist = parents.districtByKey.get(`${reg.id}|${norm(r.districtFullName)}`);
        const set = byDistrict.get(dist.id) ?? new Set();
        set.add(norm(r.name));
        byDistrict.set(dist.id, set);
      }
      //console.log("byDistrict");
      //console.log(byDistrict);
      const existing = [];
      for (const [districtId, namesLower] of byDistrict) {
        const exist = await Locality.findAll({
          attributes: ['name'],
          where: { districtId, [Op.and]: [sqlWhere(fn('lower', col('locality.name')), { [Op.in]: [...namesLower] })] },
          include: [{
            model: District,
            attributes: ['name'],
            include:
              [{
                model: Region,
                attributes: ['name'],
              }],
          }],
          raw: true,
        });
        existing.push(...exist);
      }
      const conflicts = existing.map(e => `${e.name} (${e['district.name']}, ${e['district.region.name']})`);
      //console.log("conflicts");
      //console.log(conflicts);
      return conflicts;
    },
  },
};
