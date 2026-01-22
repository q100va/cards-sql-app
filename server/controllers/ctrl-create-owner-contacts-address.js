import { Op } from 'sequelize';
import {
  Region, District, Locality
} from "../models/index.js";

export function fullName(row) {
  const fn = row['firstName'] ?? '';
  const pn = row['patronymic'] ?? '';
  const ln = row['lastName'] ?? '';
  return [fn, pn, ln].filter(Boolean).join(' ').trim();
}

export function collectFlatContacts(contactsObj) {
  const flat = [];
  for (const [type, list] of Object.entries(contactsObj ?? {})) {
    for (const v of list ?? []) {
      const content = (v ?? '').trim();
      if (content) flat.push({ type, content });
    }
  }
  return flat;
}
/**
 * @param {Object} cfg
 * @param {'user' | 'partner' | 'volunteer'} cfg.ownerKind
 * @param {Object} cfg.models { User, Partner, UserContact, PartnerContact }
 * @param {Object} cfg.excludeSelf ({ id: { [Op.ne]: userId } })
 * @param {Array<{type:string,content:string}>} cfg.flatContacts
 */
export async function findDuplicateContacts({ ownerKind, models, excludeSelf = {}, flatContacts }) {
  if (!flatContacts?.length) return [];

  const byType = new Map();
  for (const { type, content } of flatContacts) {
    if (!type || !content) continue;
    if (!byType.has(type)) byType.set(type, new Set());
    byType.get(type).add(content);
  }

  const orList = Array.from(byType.entries()).map(([type, contents]) => ({
    '$contacts.type$': type,
    '$contacts.content$': { [Op.in]: Array.from(contents) },
  }));

  const CONFIG = {
    user: {
      Model: models.User,
      ContactModel: models.UserContact,
      includeAs: 'contacts',
      ownerAttrs: ['userName'],
      displayName: row => row['userName'] ?? '',
    },
    partner: {
      Model: models.Partner,
      ContactModel: models.PartnerContact,
      includeAs: 'contacts',
      ownerAttrs: ['firstName', 'patronymic', 'lastName'],
      displayName: row => fullName(row),
    },
    volunteer: {
      Model: models.Volunteer,
      ContactModel: models.VolunteerContact,
      includeAs: 'contacts',
      ownerAttrs: ['firstName', 'patronymic', 'lastName'],
      displayName: row => fullName(row),
    },
  };

  const C = CONFIG[ownerKind];
  if (!C) throw new Error(`Unsupported ownerKind: ${ownerKind}`);

  const rows = await C.Model.findAll({
    where: { ...excludeSelf, [Op.or]: orList },
    include: [{
      model: C.ContactModel,
      as: C.includeAs,
      attributes: ['type', 'content'],
      required: true,
    }],
    attributes: C.ownerAttrs,
    raw: true,
  });

  const byPair = new Map();
  for (const row of rows) {
    const type = row[`${C.includeAs}.type`] ?? '';
    const content = row[`${C.includeAs}.content`] ?? '';
    const name = C.displayName(row);
    if (!type || !content || !name) continue;

    const key = `${type}::${content}`;
    if (!byPair.has(key)) byPair.set(key, { type, content, owners: new Set() });
    byPair.get(key).owners.add(name);
  }

  return Array.from(byPair.values())
    .map(({ type, content, owners }) => ({
      type,
      content,
      owners: Array.from(owners).sort(),
    }))
    .sort((a, b) => a.type.localeCompare(b.type) || a.content.localeCompare(b.content));
}

/**
 * { email:[], phone:[], ... } → [{type, content}, ...]
 */
export function collectDraftContacts(draftContacts = {}) {
  const rows = [];
  for (const [type, list] of Object.entries(draftContacts ?? {})) {
    for (const v of list ?? []) {
      const content = (v ?? '').trim();
      if (content) rows.push({ type, content });
    }
  }
  return rows;
}

export async function formFullPostAddress(draft, t) {
//console.log('draft.draftAddress', draft.draftAddress);

  const shortRegionName = (await Region.findOne({
    where: { id: draft.draftAddress.regionId },
    attributes: ['shortName'],
    transaction: t,
  })).shortName;
  const postalDistrictName = (await District.findOne({
    where: { id: draft.draftAddress.districtId },
    attributes: ['shortPostName'],
    transaction: t,
  })).shortPostName;
  const shortLocalityName = (await Locality.findOne({
    where: { id: draft.draftAddress.localityId },
    attributes: ['shortName'],
    transaction: t,
  })).shortName;
 // console.log('ADDRESS', shortRegionName, postalDistrictName, shortLocalityName);

 // console.log('ADDRESS', shortRegionName.shortName, postalDistrictName.shortPostName, shortLocalityName.shortName);

  const mainPart = shortRegionName +
    (postalDistrictName == shortRegionName ? '' : ', ' + postalDistrictName) +
    (shortLocalityName == postalDistrictName ? '' : ', ' + shortLocalityName);

  return draft.postalCode + ', ' + mainPart + ', ' + (draft.postalAddressPart ? draft.postalAddressPart + ', ' : '') + draft.postalName;

}

/**
 * @param {'user'|'partner'} ownerKind
 * @param {object} ownerInstance
 * @param {object} draft — ownerDraft
 * @param {object} models — { UserContact, PartnerContact, UserAddress, PartnerAddress }
 * @param {object} t — transaction
 */
export async function saveOwnerContactsAndAddress(
  ownerKind,
  ownerInstance,
  draft,
  models,
  t) {
  const CONFIG = {
    user: {
      idField: 'userId',
      ContactModel: models.UserContact,
      AddressModel: models.UserAddress,
      addressShape: async (a) => ({
        countryId: a.countryId ?? null,
        regionId: a.regionId ?? null,
        districtId: a.districtId ?? null,
        localityId: a.localityId ?? null,
      }),
    },
    partner: {
      idField: 'partnerId',
      ContactModel: models.PartnerContact,
      AddressModel: models.PartnerAddress,
      addressShape: async (a) => ({
        countryId: a.countryId ?? null,
        regionId: a.regionId ?? null,
        districtId: a.districtId ?? null,
        localityId: a.localityId ?? null,
      }),
    },
    volunteer: {
      idField: 'volunteerId',
      ContactModel: models.VolunteerContact,
      AddressModel: models.VolunteerAddress,
      addressShape: async (a) => ({
        countryId: a.countryId ?? null,
        regionId: a.regionId ?? null,
        districtId: a.districtId ?? null,
        localityId: a.localityId ?? null,
      }),
    },
    home: {
      idField: 'homeId',
      ContactModel: models.HomeContact,
      AddressModel: models.HomeAddress,
      addressShape: async (a, draft, t) => ({
        countryId: a.countryId,
        regionId: a.regionId,
        districtId: a.districtId,
        localityId: a.localityId,
        postalCode: draft.postalCode,
        postalAddressPart: draft.postalAddressPart,
        postalName: draft.postalName,
        fullPostalAddress: await formFullPostAddress(draft, t)
      }),
    },
  };

  const C = CONFIG[ownerKind];
  if (!C) throw new Error(`Unsupported ownerKind: ${ownerKind}`);

  const ownerId = ownerInstance.id;
  if (!ownerId) throw new Error('Owner instance must have id');

  // 1) Contacts
  const flatContacts = collectDraftContacts(draft?.draftContacts);
  if (flatContacts.length) {
    const contactRows = flatContacts.map(({ type, content }) => ({
      [C.idField]: ownerId,
      type,
      content,
    }));

   const contacts = await C.ContactModel.bulkCreate(contactRows, {
      validate: true,
      individualHooks: true,
      transaction: t,
    });
    console.log('contacts', contacts);
  }

  // 2) Address
  const a = draft?.draftAddress ?? {};
  const hasAnyAddress = !!(a.countryId || a.regionId || a.districtId || a.localityId);

  //console.log('DRAFT', await C.addressShape(a, draft))

  if (hasAnyAddress) {
    const address = await C.addressShape(a, draft, t);
    const freshAddress = await C.AddressModel.create(
      {
        [C.idField]: ownerId,
        ...address,
      },
      { transaction: t }
    );
   // console.log('freshAddress', freshAddress);
  }
}

