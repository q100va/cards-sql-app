import {
  Country,
  Region,
  District,
  Locality,
} from '../../../models/index.js';

/**
 * Create a country with sensible test defaults.
 */
export async function createCountry(overrides = {}) {
  const payload = {
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
  if (!overrides.countryId) {
    const country = await createCountry();
    overrides.countryId = country.id;
  }

  const payload = {
    name: overrides.name ?? 'Москва',
    shortName: overrides.shortName ?? 'Мск',
    countryId: overrides.countryId,
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
  if (!overrides.regionId) {
    const region = await createRegion();
    overrides.regionId = region.id;
  }

  const payload = {
    name: overrides.name ?? 'Тверской район',
    shortName: overrides.shortName ?? 'Твер.',
    postName: overrides.postName ?? 'Тверской район',
    shortPostName: overrides.shortPostName ?? 'Твер.',
    regionId: overrides.regionId,
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
  if (!overrides.districtId) {
    const district = await createDistrict();
    overrides.districtId = district.id;
  }

  const payload = {
    name: overrides.name ?? 'Москва',
    shortName: overrides.shortName ?? 'Мск',
    isFederalCity: overrides.isFederalCity ?? false,
    isCapitalOfRegion: overrides.isCapitalOfRegion ?? false,
    isCapitalOfDistrict: overrides.isCapitalOfDistrict ?? false,
    districtId: overrides.districtId,
    isRestricted: overrides.isRestricted ?? false,
  };

  const row = await Locality.create(payload);
  return row.get({ plain: true });
}
