import { Op } from 'sequelize';
import {
  Institute, Region, District, Locality,
  VolunteerAddress, VolunteerContact, VolunteerOutdatedName, VolunteerCooperation, VolunteerSubscription,
  PartnerAddress, PartnerContact, PartnerOutdatedName,
  UserAddress, UserContact, UserOutdatedName,
  HomeCoordination, HomeOutdatedName, HomeContact, HomeAddress
} from '../models/index.js';
//import { formFullPostAddress } from './ctrl-create-owner-contacts-address.js';

export async function formFullPostAddress(a, t) {
//console.log('draft.draftAddress', draft.draftAddress);

  const shortRegionName = (await Region.findOne({
    where: { id: a.regionId },
    attributes: ['shortName'],
    transaction: t,
  })).shortName;
  const postalDistrictName = (await District.findOne({
    where: { id: a.districtId },
    attributes: ['shortPostName'],
    transaction: t,
  })).shortPostName;
  const shortLocalityName = (await Locality.findOne({
    where: { id: a.localityId },
    attributes: ['shortName'],
    transaction: t,
  })).shortName;
 // console.log('ADDRESS', shortRegionName, postalDistrictName, shortLocalityName);

// console.log('ADDRESS', shortRegionName.shortName, postalDistrictName.shortPostName, shortLocalityName.shortName);

  const mainPart = shortRegionName +
    (postalDistrictName == shortRegionName ? '' : ', ' + postalDistrictName) +
    (shortLocalityName == postalDistrictName ? '' : ', ' + shortLocalityName);

  return a.postalCode + ', ' + mainPart + ', ' + (a.postalAddressPart ? a.postalAddressPart + ', ' : '') + a.postalName;

}

const CONFIG = {
  user: {
    idField: 'userId',
    addressShape: async (a, id) => ({
      userId: id,
      countryId: a.countryId ?? null,
      regionId: a.regionId ?? null,
      districtId: a.districtId ?? null,
      localityId: a.localityId ?? null,
    }),
    AddressModel: UserAddress,
    ContactModel: UserContact,
    OutdatedNameModel: UserOutdatedName,
    //supportsUserName: true,
    mapOutdatedNames: (id, names) => ({
      userId: id,
      firstName: names.firstName ?? null,
      patronymic: names.patronymic ?? null,
      lastName: names.lastName ?? null,
    }),
  },
  partner: {
    idField: 'partnerId',
    addressShape: async (a, id) => ({
      partnerId: id,
      countryId: a.countryId ?? null,
      regionId: a.regionId ?? null,
      districtId: a.districtId ?? null,
      localityId: a.localityId ?? null,
    }),
    AddressModel: PartnerAddress,
    ContactModel: PartnerContact,
    OutdatedNameModel: PartnerOutdatedName,
    //supportsUserName: false,
    mapOutdatedNames: (id, names) => ({
      partnerId: id,
      firstName: names.firstName ?? null,
      patronymic: names.patronymic ?? null,
      lastName: names.lastName ?? null,
    }),
  },
  volunteer: {
    idField: 'volunteerId',
    addressShape: async (a, id) => ({
      volunteerId: id,
      countryId: a.countryId ?? null,
      regionId: a.regionId ?? null,
      districtId: a.districtId ?? null,
      localityId: a.localityId ?? null,
    }),
    AddressModel: VolunteerAddress,
    ContactModel: VolunteerContact,
    OutdatedNameModel: VolunteerOutdatedName,
    //supportsUserName: false,
    mapOutdatedNames: (id, names) => ({
      volunteerId: id,
      firstName: names.firstName ?? null,
      patronymic: names.patronymic ?? null,
      lastName: names.lastName ?? null,
    }),
  },
  home: {
    idField: 'homeId',
    addressShape: async (a, id, t) => ({
      homeId: id,
      countryId: a.countryId ?? null,
      regionId: a.regionId ?? null,
      districtId: a.districtId ?? null,
      localityId: a.localityId ?? null,
      postalCode: a.postalCode,
      postalAddressPart: a.postalAddressPart,
      postalName: a.postalName,
      fullPostalAddress: await formFullPostAddress(a,t)
    }),
    AddressModel: HomeAddress,
    ContactModel: HomeContact,
    OutdatedNameModel: HomeOutdatedName,
    //supportsUserName: false,
    mapOutdatedNames: (id, names) => ({
      homeId: id,
      officialName: names.officialName ?? null,
    }),
  },

};

/**
 * ownerKind: 'user' | 'partner' | 'volunteer' | 'home'
 *
 * @param {'user' | 'partner' | 'volunteer' | 'home'} ownerKind
 * @param {number} id
 * @param {object} payload         // { changingData?, restoringData?, outdatingData?, deletingData? }
 * @param {object} models
 * @param {object} t
 */
export async function applyOwnerUpdates(ownerKind, id, payload, t) {
  const C = CONFIG[ownerKind];
  if (!C) throw new Error(`Unsupported ownerKind: ${ownerKind}`);
  const { changingData, restoringData, outdatingData, deletingData } = payload ?? {};

  // ---------- CHANGES ----------
  // address
  if (changingData?.address) {
    const a = changingData.address;

    const hasAny = !!(a.countryId || a.regionId || a.districtId || a.localityId);
    if (hasAny) {
      const addressShape = await C.addressShape(a, id, t);

        console.log('ADDRESS', addressShape);

      await C.AddressModel.create(
        addressShape,
        { transaction: t }
      );
    }
  }
  console.log('changingData?.contacts', changingData?.contacts);
  // contacts: bulkCreate {type: string[]}
  if (changingData?.contacts) {
    const contactRows = Object.entries(changingData.contacts)
      .flatMap(([type, list]) =>
        (list ?? [])
          .map((v) => (v ?? '').trim())
          .filter(Boolean)
          .map((content) => ({ [C.idField]: id, type, content }))
      );

    if (contactRows.length) {
      await C.ContactModel.bulkCreate(contactRows, {
        validate: true,
        individualHooks: true,
        transaction: t,
        // ignoreDuplicates: true, // TODO: UNIQUE(ownerId,type,content)
      });
    }
  }

  if (changingData?.institutes?.length) {
    await Institute.bulkCreate(
      changingData.institutes.map((i) => ({
        instituteName: i.instituteName,
        category: i.category,
        volunteerId: id,
      })),
      {
        validate: true,
        individualHooks: true,
        transaction: t,
      }
    );
  }
  if (changingData?.subscriptions?.length) {
    await VolunteerSubscription.bulkCreate(
      changingData.subscriptions.map((userId) => ({
        volunteerId: id,
        userId,
      })),
      {
        validate: true,
        individualHooks: true,
        transaction: t,
      }
    );
  }

  if (changingData?.cooperations?.length) {
    await VolunteerCooperation.bulkCreate(
      changingData.cooperations.map((userId) => ({
        volunteerId: id,
        userId,
      })),
      {
        validate: true,
        individualHooks: true,
        transaction: t,
      }
    );
  }

  if (changingData?.coordinations?.length) {
    await HomeCoordination.bulkCreate(
      changingData.coordinations.map((foreignId) => ({
        partnerId: ownerKind == 'home' ? foreignId : id,
        homeId: ownerKind == 'home' ? id : foreignId,
      })),
      {
        validate: true,
        individualHooks: true,
        transaction: t,
      }
    );
  }

  // ---------- RESTORING ----------
  // addresses
  if (restoringData?.addresses?.length) {
    const nonRecoverable = await C.AddressModel.count({
      where: { id: { [Op.in]: restoringData.addresses }, isRecoverable: false },
      transaction: t,
    });
    if (nonRecoverable !== 0) throw new Error('ERROR.ADDRESS_NOT_RESTORED');

    await C.AddressModel.update(
      { isRestricted: false },
      { where: { id: { [Op.in]: restoringData.addresses } }, individualHooks: true, transaction: t }
    );
  }

  // names
  if (restoringData?.names?.length) {
    await C.OutdatedNameModel.destroy({
      where: { id: { [Op.in]: restoringData.names } },
      transaction: t,
      individualHooks: true,
    });
  }

  // userNames
  if (/* C.supportsUserName &&  */restoringData?.userNames?.length) {
    await C.OutdatedNameModel.destroy({
      where: { id: { [Op.in]: restoringData.userNames } },
      transaction: t,
      individualHooks: true,
    });
  }

  // officialNames
  if (restoringData?.officialNames?.length) {
    await C.OutdatedNameModel.destroy({
      where: { id: { [Op.in]: restoringData.officialNames } },
      transaction: t,
      individualHooks: true,
    });
  }

  // contacts
  if (restoringData?.contacts) {
    const ids = Object.values(restoringData.contacts)
      .flatMap((arr) => arr ?? [])
      .map((c) => c?.id)
      .filter(Boolean);

    if (ids.length) {
      await C.ContactModel.update(
        { isRestricted: false },
        { where: { id: { [Op.in]: ids } }, individualHooks: true, transaction: t }
      );
    }
  }

  //institutes
  if (restoringData?.institutes?.length) {
    await Institute.update(
      { isRestricted: false },
      {
        where: { id: { [Op.in]: restoringData.institutes } },
        individualHooks: true,
        transaction: t,
      }
    );
  }

  //coordinations
  if (restoringData?.coordinations?.length) {
    await HomeCoordination.update(
      { isRestricted: false },
      {
        where: { id: { [Op.in]: restoringData.coordinations } },
        individualHooks: true,
        transaction: t,
      }
    );
  }


  // ---------- OUTDATING ----------
  if (outdatingData?.names) {
    const row = C.mapOutdatedNames(id, outdatingData.names);
    await C.OutdatedNameModel.create(row, { transaction: t });
  }

  if (/* C.supportsUserName && */ outdatingData?.userName) {
    await C.OutdatedNameModel.create({ [C.idField]: id, userName: outdatingData.userName }, { transaction: t });
  }

  if (outdatingData?.officialName) {
    await C.OutdatedNameModel.create({ [C.idField]: id, officialName: outdatingData.officialName }, { transaction: t });
  }

  if (outdatingData?.address) {
    await C.AddressModel.update(
      { isRestricted: true },
      { where: { id: outdatingData.address }, individualHooks: true, transaction: t }
    );
  }

  if (outdatingData?.contacts?.length) {
    await C.ContactModel.update(
      { isRestricted: true },
      { where: { id: { [Op.in]: outdatingData.contacts } }, individualHooks: true, transaction: t }
    );
  }

  //institutes
  if (outdatingData?.institutes?.length) {
    await Institute.update(
      { isRestricted: true },
      {
        where: { id: { [Op.in]: outdatingData.institutes } },
        individualHooks: true,
        transaction: t,
      }
    );
  }

  //coordinations
  if (outdatingData?.coordinations?.length) {
    await HomeCoordination.update(
      { isRestricted: true },
      {
        where: { id: { [Op.in]: outdatingData.coordinations } },
        individualHooks: true,
        transaction: t,
      }
    );
  }

  // ---------- DELETING ----------
  if (deletingData?.addresses?.length) {
    await C.AddressModel.destroy({
      where: { id: { [Op.in]: deletingData.addresses } },
      transaction: t,
      individualHooks: true,
    });
  }

  if (deletingData?.contacts?.length) {
    await C.ContactModel.destroy({
      where: { id: { [Op.in]: deletingData.contacts } },
      transaction: t,
      individualHooks: true,
    });
  }

  if (deletingData?.names?.length) {
    await C.OutdatedNameModel.destroy({
      where: { id: { [Op.in]: deletingData.names } },
      transaction: t,
      individualHooks: true,
    });
  }

  if (/* C.supportsUserName &&  */deletingData?.userNames?.length) {
    await C.OutdatedNameModel.destroy({
      where: { id: { [Op.in]: deletingData.userNames } },
      transaction: t,
      individualHooks: true,
    });
  }

  if (deletingData?.officialNames?.length) {
    await C.OutdatedNameModel.destroy({
      where: { id: { [Op.in]: deletingData.officialNames } },
      transaction: t,
      individualHooks: true,
    });
  }

  //institutes
  if (deletingData?.institutes?.length) {
    await Institute.destroy({
      where: { id: { [Op.in]: deletingData.institutes } },
      individualHooks: true,
      transaction: t,
    });
  }

  //subscriptions
  if (deletingData?.subscriptions?.length) {
    await VolunteerSubscription.destroy({
      where: { id: { [Op.in]: deletingData.subscriptions } },
      individualHooks: true,
      transaction: t,
    });
  }

  //coordinations
  if (deletingData?.coordinations?.length) {
    await HomeCoordination.destroy(
      {
        where: { id: { [Op.in]: deletingData.coordinations } },
        individualHooks: true,
        transaction: t,
      }
    );
  }
}
