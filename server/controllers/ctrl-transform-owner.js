import { fullName } from "./ctrl-create-owner-contacts-address.js";

// --- Helpers ---------------------------------------------------------------

export function dateOnlyToLocalDate(dateValue) {
  const [year, month, day] =
    dateValue.split('-').map(Number);

  // Local midnight without a UTC date shift.
  return new Date(
    year,
    month - 1,
    day,
  );
}

export const setHomeStatusValue = (home) =>
  home.isClose
    ? 'TABLE.NOTES.CLOSE'
    : home.isRestricted
      ? 'TABLE.NOTES.DEACTIVATED'
      : 'TABLE.NOTES.ACTIVE';

const TELEGRAM_TYPES = new Set(['telegramNickname', 'telegramPhoneNumber', 'telegramId']);

/** Returns a compact toponym reference or null. */
function toToponymRef(toponym, key = 'name') {
  return toponym
    ? {
      id: toponym.id,
      [key]: toponym[key],
    }
    : null;
}

/** Splits contacts into current and outdated buckets. */
function splitContacts(contacts) {
  const currentContacts = {};
  const outdatedContacts = {};

  for (const contact of contacts ?? []) {
    if (!contact) continue;

    const contactData = {
      id: contact.id,
      content: contact.content,
    };

    if (!contact.isRestricted) {
      if (TELEGRAM_TYPES.has(contact.type)) {
        (currentContacts.telegram ||= [])
          .push(contactData);
      }

      (currentContacts[contact.type] ||= [])
        .push(contactData);
    } else {
      (outdatedContacts[contact.type] ||= [])
        .push(contactData);
    }
  }

  return {
    orderedContacts: currentContacts,
    outdatedContacts,
  };
}

/** Build current address (first non-restricted) and list of outdated addresses */
function splitAddresses(addresses) {
  const allAddresses = addresses ?? [];

  const currentAddresses =
    allAddresses.filter(
      (address) => !address?.isRestricted,
    );

  const currentAddress = currentAddresses[0];

  const address = currentAddress
    ? {
      country: toToponymRef(currentAddress.country, 'name'),
      region: toToponymRef(currentAddress.region, 'shortName'),
      district: toToponymRef(currentAddress.district, 'shortName'),
      locality: toToponymRef(currentAddress.locality, 'shortName'),
      id: currentAddress.id,
    }
    : { country: null, region: null, district: null, locality: null };

  const outdatedAddresses = allAddresses
    .filter(address => address?.isRestricted)
    .map(outdatedAddress => ({
      country: toToponymRef(outdatedAddress.country, 'name'),
      region: toToponymRef(outdatedAddress.region, 'shortName'),
      district: toToponymRef(outdatedAddress.district, 'shortName'),
      locality: toToponymRef(outdatedAddress.locality, 'shortName'),
      isRecoverable: !!outdatedAddress.isRecoverable,
      id: outdatedAddress.id,
    }));

  return { address, outdatedAddresses };
}

/** Splits home addresses into current and outdated addresses. */
function splitHomeAddresses(addresses) {
  const allAddresses = addresses ?? [];

  const currentAddresses =
    allAddresses.filter(
      (address) => !address?.isRestricted,
    );

  const currentAddress = currentAddresses[0];

  const address = currentAddress
    ? {
      country: toToponymRef(
        currentAddress.country,
        'name',
      ),
      region: toToponymRef(
        currentAddress.region,
        'shortName',
      ),
      district: toToponymRef(
        currentAddress.district,
        'shortName',
      ),
      locality: toToponymRef(
        currentAddress.locality,
        'shortName',
      ),
      id: currentAddress.id,
      postalCode: currentAddress.postalCode,
      postalAddressPart:
        currentAddress.postalAddressPart,
      postalName: currentAddress.postalName,
      fullPostalAddress:
        currentAddress.fullPostalAddress,
      isRecoverable:
        !!currentAddress.isRecoverable,
    }
    : {
      country: null,
      region: null,
      district: null,
      locality: null,
    };

  const outdatedAddresses =
    allAddresses
      .filter(
        (address) => address?.isRestricted,
      )
      .map((address) => ({
        country: toToponymRef(
          address.country,
          'name',
        ),
        region: toToponymRef(
          address.region,
          'shortName',
        ),
        district: toToponymRef(
          address.district,
          'shortName',
        ),
        locality: toToponymRef(
          address.locality,
          'shortName',
        ),
        id: address.id,
        postalCode: address.postalCode,
        postalAddressPart:
          address.postalAddressPart,
        postalName: address.postalName,
        fullPostalAddress:
          address.fullPostalAddress,
        isRecoverable:
          !!address.isRecoverable,
      }));

  return {
    address,
    outdatedAddresses,
  };
}

/** Map outdated names for User: split into names[] and userNames[] */
function splitNamesUser(outdatedNames) {
  const names = (outdatedNames ?? [])
    .filter(
      (outdatedName) =>
        outdatedName &&
        outdatedName.firstName !== null,
    )
    .map((outdatedName) => ({
      id: outdatedName.id,
      firstName: outdatedName.firstName,
      patronymic: outdatedName.patronymic,
      lastName: outdatedName.lastName,
    }));

  const userNames = (outdatedNames ?? [])
    .filter(
      (outdatedName) =>
        outdatedName &&
        outdatedName.userName !== null,
    )
    .map((outdatedName) => ({
      id: outdatedName.id,
      userName: outdatedName.userName,
    }));

  return {
    names,
    userNames,
  };
}

/** Splits partner coordinations into current and outdated homes. */
function splitHomesForPartner(partner) {
  const coordinations =
    partner.coordinations ?? [];

  const homes = coordinations
    .filter(
      (coordination) =>
        !coordination?.isRestricted,
    )
    .map((coordination) => ({
      id: coordination.id,
      homeId: coordination.homeId,
      homeName:
        coordination.home.homeName,
      regionName:
        coordination.home.addresses[0]
          .region.shortName,
      partnerId:
        coordination.partnerId,
      isRecoverable:
        !!coordination.isRecoverable,
      homeStatus:
        setHomeStatusValue(
          coordination.home,
        ),
    }));

  const outdatedHomes = coordinations
    .filter(
      (coordination) =>
        coordination?.isRestricted,
    )
    .map((coordination) => ({
      id: coordination.id,
      homeId: coordination.homeId,
      homeName:
        coordination.home.homeName,
      regionName:
        coordination.home.addresses[0]
          .region.shortName,
      partnerId:
        coordination.partnerId,
      isRecoverable:
        !!coordination.isRecoverable,
      homeStatus:
        setHomeStatusValue(
          coordination.home,
        ),
    }));

  return {
    homes,
    outdatedHomes,
  };
}

/** Splits home coordinations into current and outdated partners. */
function splitPartnersForHome(home) {
  const coordinations =
    home.coordinations ?? [];

  const partners = coordinations
    .filter(
      (coordination) =>
        !coordination?.isRestricted,
    )
    .map((coordination) => ({
      id: coordination.id,
      homeId:
        coordination.homeId,
      partnerId:
        coordination.partnerId,
      partnerName:
        fullName(coordination.partner),
      partnerContacts:
        splitContacts(
          coordination.partner.contacts,
        ).orderedContacts,
      partnerOccupation:
        coordination.partner.affiliation +
        (
          coordination.partner.position
            ? ` - ${coordination.partner.position}`
            : ''
        ),
      isRecoverable:
        !!coordination.isRecoverable,
    }));

  const outdatedPartners = coordinations
    .filter(
      (coordination) =>
        coordination?.isRestricted,
    )
    .map((coordination) => ({
      id: coordination.id,
      homeId:
        coordination.homeId,
      partnerId:
        coordination.partnerId,
      partnerName:
        fullName(coordination.partner),
      partnerContacts:
        splitContacts(
          coordination.partner.contacts,
        ).orderedContacts,
      partnerOccupation:
        coordination.partner.affiliation +
        (
          coordination.partner.position
            ? ` - ${coordination.partner.position}`
            : ''
        ),
      isRecoverable:
        !!coordination.isRecoverable,
    }));

  return {
    partners,
    outdatedPartners,
  };
}

/** Splits volunteer institutes into current and outdated lists. */
function splitInstitutesForVolunteer(volunteer) {
  const allInstitutes =
    volunteer.institutes ?? [];

  const institutes = allInstitutes
    .filter(
      (institute) =>
        !institute?.isRestricted,
    )
    .map((institute) => ({
      id: institute.id,
      instituteName:
        institute.instituteName,
      category:
        institute.category,
      isDeletable:
        institute.isDeletable,
    }));

  const outdatedInstitutes = allInstitutes
    .filter(
      (institute) =>
        institute?.isRestricted,
    )
    .map((institute) => ({
      id: institute.id,
      instituteName:
        institute.instituteName,
      category:
        institute.category,
      isDeletable:
        institute.isDeletable,
    }));

  return {
    institutes,
    outdatedInstitutes,
  };
}

// --- Public API ------------------------------------------------------------

/**
 * Transforms owner data into the view model expected by the client.
 *
 * Supports:
 * user, partner, volunteer, home, and senior.
 *
 * Separates current and outdated related data
 * and flattens selected relations for the UI.
 */
export function transformOwnerData(kind, record) {
  const result = { ...record };
  const outdatedData = {};

  if (kind !== 'senior') {

    const {
      orderedContacts,
      outdatedContacts,
    } = splitContacts(result.contacts);

    result.orderedContacts = orderedContacts;
    delete result.contacts;

    outdatedData.contacts = outdatedContacts;
  }

  if (kind === 'user') {

    const { address, outdatedAddresses } = splitAddresses(result.addresses);
    result.address = address;
    outdatedData.addresses = outdatedAddresses;
    delete result.addresses;

    result.roleName = result.role?.name;
    delete result.role;

    const { names, userNames } = splitNamesUser(result.outdatedNames);
    outdatedData.names = names;
    outdatedData.userNames = userNames;
    delete result.outdatedNames;

  }

  if (kind === 'partner') {

    const { address, outdatedAddresses } = splitAddresses(result.addresses);
    result.address = address;
    outdatedData.addresses = outdatedAddresses;
    delete result.addresses;

    outdatedData.names = result.outdatedNames;
    delete result.outdatedNames;

    const { homes, outdatedHomes } = splitHomesForPartner(result);
    result.coordinations = homes;
    outdatedData.coordinations = outdatedHomes;

  }

  if (kind === 'volunteer') {

    const { address, outdatedAddresses } = splitAddresses(result.addresses);
    result.address = address;
    outdatedData.addresses = outdatedAddresses;
    delete result.addresses;

    outdatedData.names = result.outdatedNames;
    delete result.outdatedNames;

    const { institutes, outdatedInstitutes } = splitInstitutesForVolunteer(result);
    result.institutes = institutes;
    outdatedData.institutes = outdatedInstitutes;

    const subscriptionsSource = result.subscriptions ?? [];
    const cooperationsSource = result.cooperations ?? [];

    const subscriptions = subscriptionsSource
      .filter(
        (subscription) =>
          subscription.user.isRestricted === false,
      )
      .map((subscription) => ({
        id: subscription.id,
        userName: subscription.user.userName,
        userFullName:
          fullName(subscription.user),
        userId: subscription.userId,
      }));

    const outdatedSubscriptions = subscriptionsSource
      .filter(
        (subscription) =>
          subscription.user.isRestricted === true,
      )
      .map((subscription) => ({
        id: subscription.id,
        userName: subscription.user.userName,
        userFullName:
          fullName(subscription.user),
        userId: subscription.userId,
        isRestricted:
          subscription.user.isRestricted,
        isRecoverable:
          !subscription.user.isRestricted,
        isDeletable: false,
      }));

    const cooperations = cooperationsSource
      .filter(
        (cooperation) =>
          cooperation.user.isRestricted === false,
      )
      .map((cooperation) => ({
        id: cooperation.id,
        userName: cooperation.user.userName,
        userFullName:
          fullName(cooperation.user),
        userId: cooperation.userId,
      }));

    const outdatedCooperations = cooperationsSource
      .filter(
        (cooperation) =>
          cooperation.user.isRestricted === true,
      )
      .map((cooperation) => ({
        id: cooperation.id,
        userName: cooperation.user.userName,
        userFullName:
          fullName(cooperation.user),
        userId: cooperation.userId,
        isRestricted:
          cooperation.user.isRestricted,
        isRecoverable:
          !cooperation.user.isRestricted,
        isDeletable: false,
      }));

    result.subscriptions = subscriptions;
    outdatedData.subscriptions = outdatedSubscriptions;
    result.cooperations = cooperations;
    outdatedData.cooperations = outdatedCooperations;
    //TODO: dateOfLastOrder
    result.dateOfLastOrder = null;
  }

  if (kind === 'home') {

    result.dateOfLastUpdate = result.updateDates?.length ? result.updateDates[0].date : null;
    delete result.updateDates;

    const { address, outdatedAddresses } = splitHomeAddresses(result.addresses);
    result.address = address;
    outdatedData.addresses = outdatedAddresses;
    delete result.addresses;
    delete result.activeAddress;

    outdatedData.officialNames = result.outdatedNames;
    delete result.outdatedNames;

    const { partners, outdatedPartners } = splitPartnersForHome(result);
    result.coordinations = partners;
    outdatedData.coordinations = outdatedPartners;
  }

  if (kind === 'senior') {

    const activeAddress =
      result.home.activeAddress;

    result.address = {
      country: toToponymRef(
        activeAddress.country,
        'name',
      ),
      region: toToponymRef(
        activeAddress.region,
        'shortName',
      ),
      district: toToponymRef(
        activeAddress.district,
        'shortName',
      ),
      locality: toToponymRef(
        activeAddress.locality,
        'shortName',
      ),
      fullPostalAddress:
        activeAddress.fullPostalAddress,
    };

    result.homeId = result.home.id;

    result.home = {
      ...result.home,
    };

    delete result.home.activeAddress;
    delete result.home.id;

    outdatedData.names =
      result.outdatedNames;

    delete result.outdatedNames;

    result.spouseId =
      result.spouse?.id ?? null;

    result.spouseFullName =
      result.spouse
        ? fullName(result.spouse)
        : null;

    delete result.spouse;

    result.birthDate =
      result.birthDate
        ? dateOnlyToLocalDate(
          result.birthDate,
        )
        : result.birthDate;
  }

  result.outdatedData = outdatedData;
  return result;
}
