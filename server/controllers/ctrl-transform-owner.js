// utils/transform-owner.js

import { fullName } from "./ctrl-create-owner-contacts-address.js";

// --- Helpers ---------------------------------------------------------------

//TODO: for Seniors DOB
export function dateOnlyToLocalDate(v) {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d); // локальная полночь, без UTC-сдвига
}

export const setHomeStatusValue = (value) =>
  value.isClose
    ? 'TABLE.NOTES.CLOSE'
    : value.isRestricted
      ? 'TABLE.NOTES.DEACTIVATED'
      : 'TABLE.NOTES.ACTIVE';


const TELEGRAM_TYPES = new Set(['telegramNickname', 'telegramPhoneNumber', 'telegramId']);

/** Safe toponym ref: { id, name|shortName } or null */
function ref(t, key = 'name') {
  return t ? { id: t.id, [key]: t[key] } : null;
}

/** Split contacts into ordered (actual) and outdated buckets */
function splitContacts(contacts) {
  const ordered = {};
  const outdated = {};
  contacts ??= [];
  for (const c of contacts) {
    if (!c) continue;
    const row = { id: c.id, content: c.content };

    if (!c.isRestricted) {
      // Merge telegram types into a unified "telegram" bucket
      if (TELEGRAM_TYPES.has(c.type)) {
        (ordered.telegram ||= []).push(row);
      }
      (ordered[c.type] ||= []).push(row);
    } else {
      (outdated[c.type] ||= []).push(row);
    }
  }
  return { orderedContacts: ordered, outdatedContacts: outdated };
}

/** Build current address (first non-restricted) and list of outdated addresses */
function splitAddresses(addresses) {
  const all = addresses ?? [];
  const actual = all.filter(a => !a?.isRestricted);
  const a = actual[0];

  const address = a
    ? {
      country: ref(a.country, 'name'),
      region: ref(a.region, 'shortName'),
      district: ref(a.district, 'shortName'),
      locality: ref(a.locality, 'shortName'),
      id: a.id,
    }
    : { country: null, region: null, district: null, locality: null };

  const outdatedAddresses = all
    .filter(a => a?.isRestricted)
    .map(a => ({
      country: ref(a.country, 'name'),
      region: ref(a.region, 'shortName'),
      district: ref(a.district, 'shortName'),
      locality: ref(a.locality, 'shortName'),
      isRecoverable: !!a.isRecoverable,
      id: a.id,
    }));

  return { address, outdatedAddresses };
}
//TODO:
function splitHomeAddresses(addresses) {
  const all = addresses ?? [];
  const actual = all.filter(a => !a?.isRestricted);
  const a = actual[0];

  const address = a
    ? {
      country: ref(a.country, 'name'),
      region: ref(a.region, 'shortName'),
      district: ref(a.district, 'shortName'),
      locality: ref(a.locality, 'shortName'),
      id: a.id,
      postalCode: a.postalCode,
      postalAddressPart: a.postalAddressPart,
      postalName: a.postalName,
      fullPostalAddress: a.fullPostalAddress,
      isRecoverable: a.isRecoverable
    }
    : { country: null, region: null, district: null, locality: null };

  const outdatedAddresses = all
    .filter(a => a?.isRestricted)
    .map(a => ({
      country: ref(a.country, 'name'),
      region: ref(a.region, 'shortName'),
      district: ref(a.district, 'shortName'),
      locality: ref(a.locality, 'shortName'),
      isRecoverable: !!a.isRecoverable,
      id: a.id,
      postalCode: a.postalCode,
      postalAddressPart: a.postalAddressPart,
      postalName: a.postalName,
      fullPostalAddress: a.fullPostalAddress,
      isRecoverable: a.isRecoverable
    }));

  return { address, outdatedAddresses };
}

/** Map outdated names for User: split into names[] and userNames[] */
function splitNamesUser(list) {
  const names = (list ?? [])
    .filter(n => n && n.firstName !== null)
    .map(n => ({ id: n.id, firstName: n.firstName, patronymic: n.patronymic, lastName: n.lastName }));

  const userNames = (list ?? [])
    .filter(n => n && n.userName !== null)
    .map(n => ({ id: n.id, userName: n.userName }));

  return { names, userNames };
}

/**
 * Extract partner homes and outdated homes.
 * Expects either:
 *   - raw.coordinatedHomes / raw.outdatedCoordinatedHomes
 *   - or raw.homes / raw.outdatedHomes
 */
function splitHomesForPartner(raw) {
  const homesSource = raw.coordinations ?? [];
  // const outdatedSource = raw.outdatedCoordinations ?? [];

  console.log('homesSource', JSON.stringify(homesSource));

  const homes = homesSource
    .filter(i => !i?.isRestricted)
    .map(h => ({
      id: h.id,
      homeId: h.homeId,
      homeName: h.home.homeName,
      regionName: h.home.addresses[0].region.shortName,
      partnerId: h.partnerId,
      isRecoverable: !!h.isRecoverable,
      homeStatus: setHomeStatusValue(h.home)

    }));

  const outdatedHomes = homesSource
    .filter(i => i?.isRestricted)
    .map(h => ({
      id: h.id,
      homeId: h.homeId,
      homeName: h.home.homeName,
      regionName: h.home.addresses[0].region.shortName,
      partnerId: h.partnerId,
      isRecoverable: !!h.isRecoverable,
      homeStatus: setHomeStatusValue(h.home)
    }));

  return { homes, outdatedHomes };
}

function splitPartnersForHome(raw) {
  const partnersSource = raw.coordinations ?? [];

  const partners = partnersSource
    .filter(i => !i?.isRestricted)
    .map(p => ({
      id: p.id,
      homeId: p.homeId,
      partnerId: p.partnerId,
      partnerName: fullName(p.partner),
      partnerContacts: (splitContacts(p.partner.contacts)).orderedContacts,
      partnerOccupation: p.partner.affiliation + (p.partner.position ? (' - ' + p.partner.position) : ''),
      isRecoverable: !!p.isRecoverable,
    }));

  const outdatedPartners = partnersSource
    .filter(i => i?.isRestricted)
    .map(p => ({
      id: p.id,
      homeId: p.homeId,
      partnerId: p.partnerId,
      partnerName: fullName(p.partner),
      partnerContacts: (splitContacts(p.partner.contacts)).orderedContacts,
      partnerOccupation: p.partner.affiliation + (p.partner.position ? (' - ' + p.partner.position) : ''),
      isRecoverable: !!p.isRecoverable,
    }));

  return { partners, outdatedPartners };
}

/**
 * Extract volunteer institutes and outdated institutes.
 * Expects either:
 *   - raw.institutes / raw.outdatedInstitutes
 */
function splitInstitutesForVolunteer(raw) {
  const institutesSource = raw.institutes ?? [];
  // const outdatedSource = raw.outdatedInstitutes ?? [];

  console.log("raw.institutes", raw.institutes);

  const institutes = institutesSource
    .filter(i => !i?.isRestricted)
    .map(i => ({
      id: i.id,
      instituteName: i.instituteName,
      category: i.category,
      isDeletable: i.isDeletable
    }));

  const outdatedInstitutes = institutesSource
    .filter(i => i?.isRestricted)
    .map(i => ({
      id: i.id,
      instituteName: i.instituteName,
      category: i.category,
      isDeletable: i.isDeletable
      // isRecoverable: !!i.isRecoverable, TODO: не могу вспомнить, в каком случае орг-я может быть восстановима или нет
      //более важно, удаляемая или нет (нет, если были заявки)
    }));
  console.log("institutesSource", institutesSource);
  console.log("institutes", institutes);
  console.log("outdatedInstitutes", outdatedInstitutes);

  return { institutes, outdatedInstitutes };
}

// --- Public API ------------------------------------------------------------

/**
 * Universal transformer for owner data.
 * kind: 'user' | 'partner' | 'volunteer' | 'home' | 'senior'
 * Returns a shallow-cloned, view-ready object:
 *  - orderedContacts
 *  - address
 *  - outdatedData: { contacts, addresses, names [, userNames] [, homes] }
 *  - user.roleName (for user)
 *  - partner.homes (for partner)
 */
export function transformOwnerData(kind, raw) {

  /*    const C = CONFIG[ownerKind];
    if (!C) throw new Error(`Unsupported kind: ${kind}`);;
      */
  const o = { ...raw }; // do not mutate input
  const outdatedData = {};
  if (kind !== 'senior') {
    // 1) Contacts
    const { orderedContacts, outdatedContacts } = splitContacts(o.contacts);
    o.orderedContacts = orderedContacts;
    delete o.contacts;

    outdatedData.contacts = outdatedContacts;
    console.log('outdatedData', outdatedData);
  }

  /*   // 2) Addresses
    const { address, outdatedAddresses } = splitAddresses(o.addresses);
    o.address = address;
    delete o.addresses; */


  if (kind === 'user') {

    // 2) Addresses
    const { address, outdatedAddresses } = splitAddresses(o.addresses);
    o.address = address;
    outdatedData.addresses = outdatedAddresses;
    delete o.addresses;

    // Pull role name onto root and drop original relation
    o.roleName = o.role?.name;
    delete o.role;

    const { names, userNames } = splitNamesUser(o.outdatedNames);
    outdatedData.names = names;
    outdatedData.userNames = userNames;
    delete o.outdatedNames;

  }
  if (kind === 'partner') {

    // 2) Addresses
    const { address, outdatedAddresses } = splitAddresses(o.addresses);
    o.address = address;
    outdatedData.addresses = outdatedAddresses;
    delete o.addresses;

    outdatedData.names = o.outdatedNames;
    delete o.outdatedNames;

    // 4) Homes (actual + outdated)
    const { homes, outdatedHomes } = splitHomesForPartner(o);
    o.coordinations = homes;
    outdatedData.coordinations = outdatedHomes;

  }
  if (kind === 'volunteer') {

    // 2) Addresses
    const { address, outdatedAddresses } = splitAddresses(o.addresses);
    o.address = address;
    outdatedData.addresses = outdatedAddresses;
    delete o.addresses;

    outdatedData.names = o.outdatedNames;
    delete o.outdatedNames;

    // 5) Institutes (actual + outdated)
    const { institutes, outdatedInstitutes } = splitInstitutesForVolunteer(o);
    o.institutes = institutes;
    outdatedData.institutes = outdatedInstitutes;

    //console.log('VOLUNTEERs SUBs');
    //console.dir(o.subscriptions, { depth: null });
    const subscriptionsSource = o.subscriptions ?? [];
    const cooperationsSource = o.cooperations ?? [];
   /*  console.log('VOLUNTEERs SUBs');
    console.dir(subscriptionsSource, { depth: null });
    console.dir(cooperationsSource, { depth: null }); */

    const subscriptions = subscriptionsSource
      .filter(s => s.user.isRestricted === false)
      .map(i => ({
        id: i.id,
        userName: i.user.userName,
        userFullName: fullName(i.user),
        userId: i.userId,
      }));

    const outdatedSubscriptions = subscriptionsSource
      .filter(s => s.user.isRestricted === true)
      .map(i => ({
        id: i.id,
        userName: i.user.userName,
        userFullName: fullName(i.user),
        userId: i.userId,
        isRestricted: i.user.isRestricted,
        isRecoverable: !i.user.isRestricted,
        isDeletable: false
      }));

    let cooperations = cooperationsSource
      .filter(s => s.user.isRestricted === false)
      .map(i => ({
        id: i.id,
        userName: i.user.userName,
        userFullName: fullName(i.user),
        userId: i.userId,
      }));

    const outdatedCooperations = cooperationsSource
      .filter(s => s.user.isRestricted === true)
      .map(i => ({
        id: i.id,
        userName: i.user.userName,
        userFullName: fullName(i.user),
        userId: i.userId,
        isRestricted: i.user.isRestricted,
        isRecoverable: !i.user.isRestricted,
        isDeletable: false
      }));

/*     subscriptions.forEach(async (s) => {
      const idx = cooperations.findIndex(
        (c) => c.userId === s.userId
      );
      if (idx !== -1) cooperations.splice(idx, 1);
    });

    outdatedSubscriptions.forEach(async (s) => {
      const idx = outdatedCooperations.findIndex(
        (c) => c.userId === s.userId
      );
      if (idx !== -1) outdatedCooperations.splice(idx, 1);
    }); */

   /*  console.dir(subscriptions, { depth: null });
    console.dir(cooperations, { depth: null });

    console.dir(outdatedSubscriptions, { depth: null });
    console.dir(outdatedCooperations, { depth: null }); */

    o.subscriptions = subscriptions;
    outdatedData.subscriptions = outdatedSubscriptions;
    o.cooperations = cooperations;
    outdatedData.cooperations = outdatedCooperations;
    //TODO: dateOfLastOrder
    o.dateOfLastOrder = null;

  }
  if (kind === 'home') {

    // Date of last update
    o.dateOfLastUpdate = o.updateDates?.length ? o.updateDates[0].date : null;
    delete o.updateDates;

    // 2) Addresses
    const { address, outdatedAddresses } = splitHomeAddresses(o.addresses);
    o.address = address;
    outdatedData.addresses = outdatedAddresses;
    delete o.addresses;
    delete o.activeAddress;

    outdatedData.officialNames = o.outdatedNames;
    delete o.outdatedNames;

    // 6) Partners (actual + outdated)
    const { partners, outdatedPartners } = splitPartnersForHome(o);
    o.coordinations = partners;
    outdatedData.coordinations = outdatedPartners;



  }

  if (kind === 'senior') {

    /*    // Pull home name onto root and drop original relation
       o.homeName = o.home?.homeName;
       delete o.home; */

    const a = o.home.activeAddress;
    o.address = {
      country: ref(a.country, 'name'),
      region: ref(a.region, 'shortName'),
      district: ref(a.district, 'shortName'),
      locality: ref(a.locality, 'shortName'),
      fullPostalAddress: a.fullPostalAddress,
    }
    delete o.home.activeAddress;

    o.homeId = o.home.id;
    delete o.home.id;

    outdatedData.names = o.outdatedNames;
    delete o.outdatedNames;

    o.spouseId = o.spouse?.id ?? null;
    o.spouseFullName = o.spouse ? fullName(o.spouse) : null;
    delete o.spouse;

    o.birthDate = o.birthDate ? dateOnlyToLocalDate(o.birthDate) : o.birthDate;
  }

  o.outdatedData = outdatedData;

  // console.log('PARTNERS', JSON.stringify(o.coordinations));
  return o;
}
