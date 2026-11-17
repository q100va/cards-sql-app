import { Op } from 'sequelize';
import { District, Locality, Region } from "../models/index.js";
import CustomError from '../shared/customError.js';

export function fullName(row) {
  const firstName = row['firstName'] ?? '';
  const patronymic = row['patronymic'] ?? '';
  const lastName = row['lastName'] ?? '';

  return [
    firstName,
    patronymic,
    lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

export function collectFlatContacts(draftContacts = {}) {
  const rows = [];
  for (const [type, list] of Object.entries(draftContacts)) {
    for (const value of list ?? []) {
      const content = (value ?? '').trim();
      if (content) rows.push({ type, content });
    }
  }
  return rows;
}

export async function formFullPostAddress(address, transaction) {
  const region = await Region.findOne({
    where: { id: address.regionId },
    attributes: ['shortName'],
    transaction,
  });

  const district = await District.findOne({
    where: { id: address.districtId },
    attributes: ['shortPostName'],
    transaction,
  });

  const locality = await Locality.findOne({
    where: { id: address.localityId },
    attributes: ['shortName'],
    transaction,
  });

  const shortRegionName = region.shortName;
  const postalDistrictName = district.shortPostName;
  const shortLocalityName = locality.shortName;

  const mainPart =
    shortRegionName +
    (postalDistrictName === shortRegionName
      ? ''
      : `, ${postalDistrictName}`) +
    (shortLocalityName === postalDistrictName
      ? ''
      : `, ${shortLocalityName}`);

  return [
    address.postalCode,
    mainPart,
    address.postalAddressPart,
    address.postalName,
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * Finds contacts already used by other owners.
 *
 * @param {Object} cfg
 * @param {'user' | 'partner' | 'volunteer'} cfg.ownerKind
 * @param {Object} cfg.models Required owner and contact models.
 * @param {Object} cfg.excludeSelf Conditions used to exclude the current owner.
 * @param {Array<{type: string, content: string}>} cfg.flatContacts
 */
export async function findDuplicateContacts({
  ownerKind,
  models,
  excludeSelf = {},
  flatContacts,
}) {
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
      displayName: (row) => row['userName'] ?? '',
    },
    partner: {
      Model: models.Partner,
      ContactModel: models.PartnerContact,
      includeAs: 'contacts',
      ownerAttrs: ['firstName', 'patronymic', 'lastName'],
      displayName: (row) => fullName(row),
    },
    volunteer: {
      Model: models.Volunteer,
      ContactModel: models.VolunteerContact,
      includeAs: 'contacts',
      ownerAttrs: ['firstName', 'patronymic', 'lastName'],
      displayName: (row) => fullName(row),
    },
  };

  const config = CONFIG[ownerKind];
  if (!config) throw new CustomError('ERRORS.UNSUPPORTED_TYPE', 500);

  const rows = await config.Model.findAll({
    where: { ...excludeSelf, [Op.or]: orList },
    include: [
      {
        model: config.ContactModel,
        as: config.includeAs,
        attributes: ['type', 'content'],
        required: true,
      },
    ],
    attributes: config.ownerAttrs,
    raw: true,
  });

  const byPair = new Map();
  for (const row of rows) {
    const type = row[`${config.includeAs}.type`] ?? '';
    const content = row[`${config.includeAs}.content`] ?? '';
    const name = config.displayName(row);
    if (!type || !content || !name) continue;

    const key = `${type}::${content}`;
    if (!byPair.has(key)) {
      byPair.set(key, { type, content, owners: new Set() });
    }

    byPair.get(key).owners.add(name);
  }

  return Array.from(byPair.values())
    .map(({ type, content, owners }) => ({
      type,
      content,
      owners: Array.from(owners).sort(),
    }))
    .sort(
      (a, b) =>
        a.type.localeCompare(b.type) || a.content.localeCompare(b.content),
    );
}

/**
 * Saves initial contacts and address for a newly created owner.
 *
 * @param {'user' | 'partner' | 'volunteer' | 'home'} ownerKind
 * @param {object} ownerInstance Created owner instance.
 * @param {object} draft Owner draft data.
 * @param {object} models Required contact and address models.
 * @param {object} transaction Sequelize transaction.
 */
export async function saveOwnerContactsAndAddress(
  ownerKind,
  ownerInstance,
  draft,
  models,
  transaction,
) {
  const CONFIG = {
    user: {
      idField: 'userId',
      ContactModel: models.UserContact,
      AddressModel: models.UserAddress,
      addressShape: (address) => ({
        countryId: address.countryId ?? null,
        regionId: address.regionId ?? null,
        districtId: address.districtId ?? null,
        localityId: address.localityId ?? null,
      }),
    },
    partner: {
      idField: 'partnerId',
      ContactModel: models.PartnerContact,
      AddressModel: models.PartnerAddress,
      addressShape: (address) => ({
        countryId: address.countryId ?? null,
        regionId: address.regionId ?? null,
        districtId: address.districtId ?? null,
        localityId: address.localityId ?? null,
      }),
    },
    volunteer: {
      idField: 'volunteerId',
      ContactModel: models.VolunteerContact,
      AddressModel: models.VolunteerAddress,
      addressShape: (address) => ({
        countryId: address.countryId ?? null,
        regionId: address.regionId ?? null,
        districtId: address.districtId ?? null,
        localityId: address.localityId ?? null,
      }),
    },
    home: {
      idField: 'homeId',
      ContactModel: models.HomeContact,
      AddressModel: models.HomeAddress,
      addressShape: async (address, draft, transaction) => {
        const postalAddress = {
          ...address,
          postalCode: draft.postalCode,
          postalAddressPart: draft.postalAddressPart,
          postalName: draft.postalName,
        };

        return {
          countryId: address.countryId,
          regionId: address.regionId,
          districtId: address.districtId,
          localityId: address.localityId,
          postalCode: draft.postalCode,
          postalAddressPart: draft.postalAddressPart,
          postalName: draft.postalName,
          fullPostalAddress: await formFullPostAddress(
            postalAddress,
            transaction,
          ),
        };
      },
    },
  };

  const config = CONFIG[ownerKind];
  if (!config) throw new Error(`Unsupported ownerKind: ${ownerKind}`);

  const ownerId = ownerInstance.id;
  if (!ownerId) throw new Error('Owner instance must have id');

  // Contacts
  const flatContacts = collectFlatContacts(draft?.draftContacts);
  if (flatContacts.length) {
    const contactRows = flatContacts.map(({ type, content }) => ({
      [config.idField]: ownerId,
      type,
      content,
    }));

    await config.ContactModel.bulkCreate(contactRows, {
      validate: true,
      individualHooks: true,
      transaction,
    });
  }

  // Address
  const address = draft?.draftAddress ?? {};
  const hasAnyAddress = !!(
    address.countryId ||
    address.regionId ||
    address.districtId ||
    address.localityId
  );

  if (hasAnyAddress) {
    const addressData = await config.addressShape(
      address,
      draft,
      transaction,
    );

    await config.AddressModel.create(
      {
        [config.idField]: ownerId,
        ...addressData,
      },
      { transaction },
    );
  }
}
