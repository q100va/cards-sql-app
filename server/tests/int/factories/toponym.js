import { Country, Region, District, Locality } from '../../../models/index.js';

/**
 * Create a country with sensible test defaults.
 */
export async function createCountry(overrides = {}) {
  const payload = {
    ...(overrides.id !== undefined ? { id: overrides.id } : {}),
    name: overrides.name ?? 'Россия',
    shortName: overrides.shortName ?? 'RU',
    isRestricted: overrides.isRestricted ?? false,
  };

  const row = await Country.create(payload);
  return row.get({ plain: true });
}

/**
 * Create a region.
 * Creates a parent country automatically when countryId is not provided.
 */
export async function createRegion(overrides = {}) {
  const countryId = overrides.countryId || (await createCountry()).id;

  const payload = {
    ...(overrides.id !== undefined ? { id: overrides.id } : {}),
    name: overrides.name ?? 'Москва',
    shortName: overrides.shortName ?? 'Мск',
    countryId,
    isRestricted: overrides.isRestricted ?? false,
  };

  const row = await Region.create(payload);
  return row.get({ plain: true });
}

/**
 * Create a district.
 * Creates the required parent hierarchy when regionId is not provided.
 */
export async function createDistrict(overrides = {}) {
  const regionId = overrides.regionId || (await createRegion()).id;

  const payload = {
    ...(overrides.id !== undefined ? { id: overrides.id } : {}),
    name: overrides.name ?? 'Тверской район',
    shortName: overrides.shortName ?? 'Твер.',
    postName: overrides.postName ?? 'Тверской район',
    shortPostName: overrides.shortPostName ?? 'Твер.',
    regionId,
    isRestricted: overrides.isRestricted ?? false,
  };

  const row = await District.create(payload);
  return row.get({ plain: true });
}

/**
 * Create a locality.
 * Creates the required parent hierarchy when districtId is not provided.
 */
export async function createLocality(overrides = {}) {
  const districtId = overrides.districtId || (await createDistrict()).id;

  const payload = {
    ...(overrides.id !== undefined ? { id: overrides.id } : {}),
    name: overrides.name ?? 'Москва',
    shortName: overrides.shortName ?? 'Мск',
    isFederalCity: overrides.isFederalCity ?? false,
    isCapitalOfRegion: overrides.isCapitalOfRegion ?? false,
    isCapitalOfDistrict: overrides.isCapitalOfDistrict ?? false,
    districtId,
    isRestricted: overrides.isRestricted ?? false,
  };

  const row = await Locality.create(payload);
  return row.get({ plain: true });
}

export async function createLocation(overrides = {}) {
  const country = await createCountry(overrides.country);
  const region = await createRegion({ countryId: country.id, ...overrides.region });
  const district = await createDistrict({ regionId: region.id, ...overrides.district });
  const locality = await createLocality({ districtId: district.id, ...overrides.locality });
  return { country, region, district, locality };
}
