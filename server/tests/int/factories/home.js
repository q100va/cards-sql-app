import { Home, HomeAddress } from '../../../models/index.js';

export async function createHome(overrides = {}) {
  return Home.create({
    homeName: 'Test Home',
    officialName: 'Test Home Official',
    noAddress: false,
    specialHome: false,
    acceptableForSchool: true,
    comment: null,
    infoNote: null,
    isRestricted: false,
    causeOfRestriction: null,
    dateOfRestriction: null,
    isClose: false,
    dateOfClose: null,
    ...overrides,
  });
}

export async function createHomeAddress(overrides = {}) {
  return HomeAddress.create({ isRestricted: false, isRecoverable: true, ...overrides });
}

export async function createHomeFixture(
  location,
  { home: homeOverrides = {}, address: addressOverrides = {} } = {},
) {
  const home = await createHome(homeOverrides);
  const address = await createHomeAddress({
    homeId: home.id,
    countryId: location.country.id,
    regionId: location.region.id,
    districtId: location.district.id,
    localityId: location.locality.id,
    postalName: home.homeName,
    ...addressOverrides,
  });
  return { home, address, fullPostalAddress: address.fullPostalAddress };
}
