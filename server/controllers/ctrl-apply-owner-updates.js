import { Op } from 'sequelize';
import {
  Home,
  HomeAddress,
  HomeContact,
  HomeCoordination,
  HomeOutdatedName,
  Institute,
  PartnerAddress,
  PartnerContact,
  PartnerOutdatedName,
  SeniorOutdatedName,
  UserAddress,
  UserContact,
  UserOutdatedName,
  VolunteerAddress,
  VolunteerContact,
  VolunteerCooperation,
  VolunteerOutdatedName,
  VolunteerSubscription,
} from '../models/index.js';
import CustomError from '../shared/customError.js';
import { formFullPostAddress } from './ctrl-create-owner-contacts-address.js';

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
    mapOutdatedNames: (id, names) => ({
      volunteerId: id,
      firstName: names.firstName ?? null,
      patronymic: names.patronymic ?? null,
      lastName: names.lastName ?? null,
    }),
  },
  home: {
    idField: 'homeId',
    addressShape: async (address, id, transaction) => ({
      homeId: id,
      countryId: address.countryId ?? null,
      regionId: address.regionId ?? null,
      districtId: address.districtId ?? null,
      localityId: address.localityId ?? null,
      postalCode: address.postalCode,
      postalAddressPart: address.postalAddressPart,
      postalName: address.postalName,
      fullPostalAddress: await formFullPostAddress(address, transaction),
    }),
    AddressModel: HomeAddress,
    ContactModel: HomeContact,
    OutdatedNameModel: HomeOutdatedName,
    mapOutdatedNames: (id, names) => ({
      homeId: id,
      officialName: names.officialName ?? null,
    }),
  },
  senior: {
    idField: 'seniorId',
    OutdatedNameModel: SeniorOutdatedName,
    mapOutdatedNames: (id, names) => ({
      seniorId: id,
      firstName: names.firstName ?? null,
      patronymic: names.patronymic ?? null,
      lastName: names.lastName ?? null,
    }),
  },
};

/**
 * Applies updates to owner-related data in a single transaction.
 *
 * Supports creating, restoring, outdating, and deleting
 * addresses, contacts, names, and owner-specific relations.
 *
 * @param {'user' | 'partner' | 'volunteer' | 'home' | 'senior'} ownerKind
 * @param {number} id Owner id.
 * @param {object} payload
 * @param {object} transaction Sequelize transaction.
 */
export async function applyOwnerUpdates(ownerKind, id, payload, transaction) {
  const config = CONFIG[ownerKind];
  if (!config) throw new CustomError('ERRORS.UNSUPPORTED_TYPE', 500);

  const { changingData, restoringData, outdatingData, deletingData } = payload ?? {};

  // ---------- CHANGES ----------

  if (changingData?.address) {
    const a = changingData.address;

    const hasAny = !!(a.countryId || a.regionId || a.districtId || a.localityId);
    if (hasAny) {
      const addressShape = await config.addressShape(a, id, transaction);

      await config.AddressModel.create(addressShape, { transaction });
    }
  }

  if (changingData?.contacts) {
    const contactRows = Object.entries(changingData.contacts)
      .flatMap(([type, list]) =>
        (list ?? [])
          .map((v) => (v ?? '').trim())
          .filter(Boolean)
          .map((content) => ({ [config.idField]: id, type, content })),
      );

    if (contactRows.length) {
      await config.ContactModel.bulkCreate(contactRows, {
        validate: true,
        individualHooks: true,
        transaction,
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
        transaction,
      },
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
        transaction,
      },
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
        transaction,
      },
    );
  }

  // Coordination links can be updated from either the home or partner side.
  if (changingData?.coordinations?.length) {
    await HomeCoordination.bulkCreate(
      changingData.coordinations.map((foreignId) => ({
        partnerId: ownerKind == 'home' ? foreignId : id,
        homeId: ownerKind == 'home' ? id : foreignId,
      })),
      {
        validate: true,
        individualHooks: true,
        transaction,
      },
    );
  }

  // ---------- RESTORING ----------

  if (restoringData?.addresses?.length) {
    const addressWhere = {
      id: {
        [Op.in]: restoringData.addresses,
      },
      [config.idField]: id,
    };

    // Do not restore addresses that were marked as permanently non-recoverable.
    const nonRecoverable = await config.AddressModel.count({
      where: {
        ...addressWhere,
        isRecoverable: false,
      },
      transaction,
    });

    if (nonRecoverable !== 0) {
      throw new CustomError('ERRORS.ADDRESS_NOT_RESTORED', 409);
    }

    await config.AddressModel.update(
      {
        isRestricted: false,
      },
      {
        where: addressWhere,
        individualHooks: true,
        transaction,
      },
    );
  }

  if (restoringData?.names?.length) {
    await config.OutdatedNameModel.destroy({
      where: {
        id: {
          [Op.in]: restoringData.names,
        },
        [config.idField]: id,
      },
      transaction,
      individualHooks: true,
    });
  }

  if (restoringData?.userNames?.length) {
    await config.OutdatedNameModel.destroy({
      where: {
        id: {
          [Op.in]: restoringData.userNames,
        },
        [config.idField]: id,
      },
      transaction,
      individualHooks: true,
    });
  }

  if (restoringData?.officialNames?.length) {
    await config.OutdatedNameModel.destroy({
      where: {
        id: {
          [Op.in]: restoringData.officialNames,
        },
        [config.idField]: id,
      },
      transaction,
      individualHooks: true,
    });
  }

  if (restoringData?.contacts) {
    const ids = Object.values(restoringData.contacts)
      .flatMap((arr) => arr ?? [])
      .map((c) => c?.id)
      .filter(Boolean);

    if (ids.length) {
      await config.ContactModel.update(
        { isRestricted: false },
        {
          where: {
            id: { [Op.in]: ids },
            [config.idField]: id,
          },
          individualHooks: true,
          transaction,
        },
      );
    }
  }

  if (restoringData?.institutes?.length) {
    await Institute.update(
      { isRestricted: false },
      {
        where: {
          id: { [Op.in]: restoringData.institutes },
          [config.idField]: id,
        },
        individualHooks: true,
        transaction,
      },
    );
  }

  if (restoringData?.coordinations?.length) {
    await HomeCoordination.update(
      { isRestricted: false },
      {
        where: {
          id: { [Op.in]: restoringData.coordinations },
          [config.idField]: id,
        },
        individualHooks: true,
        transaction,
      },
    );
  }

  // ---------- OUTDATING ----------

  if (outdatingData?.names) {
    const row = config.mapOutdatedNames(id, outdatingData.names);
    await config.OutdatedNameModel.create(row, { transaction });
  }

  if (outdatingData?.userName) {
    await config.OutdatedNameModel.create(
      { [config.idField]: id, userName: outdatingData.userName },
      { transaction },
    );
  }

  if (outdatingData?.officialName) {
    await config.OutdatedNameModel.create(
      { [config.idField]: id, officialName: outdatingData.officialName },
      { transaction },
    );
  }

  if (outdatingData?.address) {
    await config.AddressModel.update(
      {
        isRestricted: true,
      },
      {
        where: {
          id: outdatingData.address,
          [config.idField]: id,
        },
        individualHooks: true,
        transaction,
      },
    );
  }

  if (outdatingData?.contacts?.length) {
    await config.ContactModel.update(
      { isRestricted: true },
      {
        where: {
          id: {
            [Op.in]: outdatingData.contacts,
          },
          [config.idField]: id,
        },
        individualHooks: true,
        transaction,
      },
    );
  }

  if (outdatingData?.institutes?.length) {
    await Institute.update(
      { isRestricted: true },
      {
        where: {
          id: { [Op.in]: outdatingData.institutes },
          [config.idField]: id,
        },
        individualHooks: true,
        transaction,
      },
    );
  }

  if (outdatingData?.coordinations?.length) {
    await HomeCoordination.update(
      { isRestricted: true },
      {
        where: {
          id: { [Op.in]: outdatingData.coordinations },
          [config.idField]: id,
        },
        individualHooks: true,
        transaction,
      },
    );
  }

  // ---------- DELETING ----------

  if (deletingData?.addresses?.length) {
    await config.AddressModel.destroy({
      where: {
        id: { [Op.in]: deletingData.addresses },
        [config.idField]: id,
      },
      transaction,
      individualHooks: true,
    });
  }

  if (deletingData?.contacts?.length) {
    await config.ContactModel.destroy({
      where: {
        id: { [Op.in]: deletingData.contacts },
        [config.idField]: id,
      },
      transaction,
      individualHooks: true,
    });
  }

  if (deletingData?.names?.length) {
    await config.OutdatedNameModel.destroy({
      where: {
        id: { [Op.in]: deletingData.names },
        [config.idField]: id,
      },
      transaction,
      individualHooks: true,
    });
  }

  if (deletingData?.userNames?.length) {
    await config.OutdatedNameModel.destroy({
      where: {
        id: { [Op.in]: deletingData.userNames },
        [config.idField]: id,
      },
      transaction,
      individualHooks: true,
    });
  }

  if (deletingData?.officialNames?.length) {
    await config.OutdatedNameModel.destroy({
      where: {
        id: { [Op.in]: deletingData.officialNames },
        [config.idField]: id,
      },
      transaction,
      individualHooks: true,
    });
  }

  if (deletingData?.institutes?.length) {
    await Institute.destroy({
      where: {
        id: { [Op.in]: deletingData.institutes },
        [config.idField]: id,
      },
      individualHooks: true,
      transaction,
    });
  }

  if (deletingData?.subscriptions?.length) {
    await VolunteerSubscription.destroy({
      where: {
        id: { [Op.in]: deletingData.subscriptions },
        [config.idField]: id,
      },
      individualHooks: true,
      transaction,
    });
  }

  if (deletingData?.coordinations?.length) {
    await HomeCoordination.destroy({
      where: {
        id: { [Op.in]: deletingData.coordinations },
        [config.idField]: id,
      },
      individualHooks: true,
      transaction,
    });
  }
}

/**
 * Updates home coordinations when a partner is blocked or unblocked.
 * Blocking makes related coordinations non-recoverable.
 * Unblocking restores recoverability only for active homes.
 */
export async function updateCoordinationByPartner(
  isPartnerRestricted,
  partnerId,
  transaction,
) {
  if (isPartnerRestricted === true) {
    await HomeCoordination.update(
      { isRestricted: true, isRecoverable: false },
      {
        where: { partnerId },
        individualHooks: true,
        transaction,
      },
    );
  }

  if (isPartnerRestricted === false) {
    const coordinations = await HomeCoordination.findAll({
      where: { partnerId },
      include: [
        {
          model: Home,
          as: 'home',
          where: { isClose: false },
          attributes: [],
          required: true,
        },
      ],
      attributes: ['id'],
      transaction,
    });

    const coordinationIds = coordinations.map((c) => c.id);

    if (coordinationIds.length > 0) {
      await HomeCoordination.update(
        { isRecoverable: true },
        {
          where: { id: coordinationIds },
          individualHooks: true,
          transaction,
        },
      );
    }
  }
}
