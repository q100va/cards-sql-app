import { Op } from 'sequelize';
import {
  Institute,
  VolunteerAddress, VolunteerContact, VolunteerOutdatedName, VolunteerCooperation, VolunteerSubscription,
  PartnerAddress, PartnerContact, PartnerOutdatedName,
  UserAddress, UserContact, UserOutdatedName
} from '../models/index.js';

const CONFIG = {
  user: {
    idField: 'userId',
    AddressModel: UserAddress,
    ContactModel: UserContact,
    OutdatedNameModel: UserOutdatedName,
    supportsUserName: true,
    mapOutdatedNames: (id, names) => ({
      userId: id,
      firstName: names.firstName ?? null,
      patronymic: names.patronymic ?? null,
      lastName: names.lastName ?? null,
    }),
  },
  partner: {
    idField: 'partnerId',
    AddressModel: PartnerAddress,
    ContactModel: PartnerContact,
    OutdatedNameModel: PartnerOutdatedName,
    supportsUserName: false,
    mapOutdatedNames: (id, names) => ({
      partnerId: id,
      firstName: names.firstName ?? null,
      patronymic: names.patronymic ?? null,
      lastName: names.lastName ?? null,
    }),
  },
  volunteer: {
    idField: 'volunteerId',
    AddressModel: VolunteerAddress,
    ContactModel: VolunteerContact,
    OutdatedNameModel: VolunteerOutdatedName,
    supportsUserName: false,
    mapOutdatedNames: (id, names) => ({
      volunteerId: id,
      firstName: names.firstName ?? null,
      patronymic: names.patronymic ?? null,
      lastName: names.lastName ?? null,
    }),
  },
  // client: { ... }
};

/**
 * ownerKind: 'user' | 'partner' | 'volunteer'
 *
 * @param {'user' | 'partner' | 'volunteer'} ownerKind
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
      await C.AddressModel.create(
        {
          [C.idField]: id,
          countryId: a.countryId ?? null,
          regionId: a.regionId ?? null,
          districtId: a.districtId ?? null,
          localityId: a.localityId ?? null,
        },
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
  if (C.supportsUserName && restoringData?.userNames?.length) {
    await C.OutdatedNameModel.destroy({
      where: { id: { [Op.in]: restoringData.userNames } },
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


  // ---------- OUTDATING ----------
  if (outdatingData?.names) {
    const row = C.mapOutdatedNames(id, outdatingData.names);
    await C.OutdatedNameModel.create(row, { transaction: t });
  }

  if (C.supportsUserName && outdatingData?.userName) {
    await C.OutdatedNameModel.create({ [C.idField]: id, userName: outdatingData.userName }, { transaction: t });
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

  if (C.supportsUserName && deletingData?.userNames?.length) {
    await C.OutdatedNameModel.destroy({
      where: { id: { [Op.in]: deletingData.userNames } },
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
}
