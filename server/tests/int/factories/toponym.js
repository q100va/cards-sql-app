// tests/int/factories/toponym.js
import { Country, Region, District, Locality } from '../../../models/index.js';

/**
 * Create a country.
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
 * Create a region (requires countryId).
 */
export async function createRegion(overrides = {}) {
  if (!overrides.countryId) {
    const c = await createCountry();
    overrides.countryId = c.id;
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
 * Create a district (requires regionId).
 */
export async function createDistrict(overrides = {}) {
  if (!overrides.regionId) {
    const r = await createRegion();
    overrides.regionId = r.id;
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
 * Create a locality (requires districtId).
 */
export async function createLocality(overrides = {}) {
  if (!overrides.districtId) {
    const d = await createDistrict();
    overrides.districtId = d.id;
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
