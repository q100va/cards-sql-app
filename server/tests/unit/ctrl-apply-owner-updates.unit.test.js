/** @jest-environment node */

import {
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { Op } from 'sequelize';

import CustomError from '../../shared/customError.js';

const UserAddress = {
  create: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

const UserContact = {
  bulkCreate: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

const UserOutdatedName = {
  create: jest.fn(),
  destroy: jest.fn(),
};

const PartnerAddress = {
  create: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

const PartnerContact = {
  bulkCreate: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

const PartnerOutdatedName = {
  create: jest.fn(),
  destroy: jest.fn(),
};

const VolunteerAddress = {
  create: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

const VolunteerContact = {
  bulkCreate: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

const VolunteerOutdatedName = {
  create: jest.fn(),
  destroy: jest.fn(),
};

const HomeAddress = {
  create: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

const HomeContact = {
  bulkCreate: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

const HomeOutdatedName = {
  create: jest.fn(),
  destroy: jest.fn(),
};

const SeniorOutdatedName = {
  create: jest.fn(),
  destroy: jest.fn(),
};

const VolunteerInstitute = {
  bulkCreate: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

const VolunteerSubscription = {
  bulkCreate: jest.fn(),
  destroy: jest.fn(),
};

const VolunteerCooperation = {
  bulkCreate: jest.fn(),
};

const HomeCoordination = {
  bulkCreate: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  findAll: jest.fn(),
};

const Home = {};

const formFullPostAddress = jest.fn();

jest.unstable_mockModule('../../models/index.js', () => ({
  Home,
  HomeAddress,
  HomeContact,
  HomeCoordination,
  HomeOutdatedName,
  VolunteerInstitute,
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
}));

jest.unstable_mockModule(
  '../../controllers/ctrl-create-owner-contacts-address.js',
  () => ({
    formFullPostAddress,
  }),
);

const {
  applyOwnerUpdates,
  updateCoordinationByPartner,
} = await import(
  '../../controllers/ctrl-apply-owner-updates.js'
);

describe('ctrl-apply-owner-updates', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('applyOwnerUpdates', () => {
    test('throws 500 for an unsupported owner kind', async () => {
      let error;

      try {
        await applyOwnerUpdates('unknown', 10, {}, { id: 'tx-1' });
      } catch (caughtError) {
        error = caughtError;
      }

      expect(error).toBeInstanceOf(CustomError);
      expect(error.code).toBe('ERRORS.UNSUPPORTED_TYPE');
      expect(error.statusCode ?? error.status).toBe(500);
    });

    test('creates a user address with the correct owner id', async () => {
      const transaction = { id: 'tx-2' };

      await applyOwnerUpdates(
        'user',
        10,
        {
          changingData: {
            address: {
              countryId: 143,
              regionId: 7,
              districtId: null,
              localityId: 12,
            },
          },
        },
        transaction,
      );

      expect(UserAddress.create).toHaveBeenCalledWith(
        {
          userId: 10,
          countryId: 143,
          regionId: 7,
          districtId: null,
          localityId: 12,
        },
        { transaction },
      );
    });

    test('creates a home address including its full postal address', async () => {
      const transaction = { id: 'tx-3' };

      const address = {
        countryId: 143,
        regionId: 7,
        districtId: null,
        localityId: 12,
        postalCode: '11365',
        postalAddressPart: 'Main Street 10',
        postalName: 'Home',
      };

      formFullPostAddress.mockResolvedValue(
        '11365, Main Street 10',
      );

      await applyOwnerUpdates(
        'home',
        5,
        {
          changingData: {
            address,
          },
        },
        transaction,
      );

      expect(formFullPostAddress).toHaveBeenCalledWith(
        address,
        transaction,
      );

      expect(HomeAddress.create).toHaveBeenCalledWith(
        {
          homeId: 5,
          countryId: 143,
          regionId: 7,
          districtId: null,
          localityId: 12,
          postalCode: '11365',
          postalAddressPart: 'Main Street 10',
          postalName: 'Home',
          fullPostalAddress: '11365, Main Street 10',
        },
        { transaction },
      );
    });

    test('trims contacts, removes blank values, and creates the remaining contacts', async () => {
      const transaction = { id: 'tx-4' };

      await applyOwnerUpdates(
        'volunteer',
        15,
        {
          changingData: {
            contacts: {
              email: [
                ' test@example.com ',
                '',
                '   ',
                null,
              ],
              phoneNumber: [
                ' +123456789 ',
              ],
            },
          },
        },
        transaction,
      );

      expect(VolunteerContact.bulkCreate).toHaveBeenCalledWith(
        [
          {
            volunteerId: 15,
            type: 'email',
            content: 'test@example.com',
          },
          {
            volunteerId: 15,
            type: 'phoneNumber',
            content: '+123456789',
          },
        ],
        {
          validate: true,
          individualHooks: true,
          transaction,
        },
      );
    });

    test('creates coordination links correctly from both home and partner sides', async () => {
      const transaction = { id: 'tx-5' };

      await applyOwnerUpdates(
        'home',
        5,
        {
          changingData: {
            coordinations: [20, 21],
          },
        },
        transaction,
      );

      await applyOwnerUpdates(
        'partner',
        20,
        {
          changingData: {
            coordinations: [5, 6],
          },
        },
        transaction,
      );

      expect(HomeCoordination.bulkCreate).toHaveBeenNthCalledWith(
        1,
        [
          { partnerId: 20, homeId: 5 },
          { partnerId: 21, homeId: 5 },
        ],
        {
          validate: true,
          individualHooks: true,
          transaction,
        },
      );

      expect(HomeCoordination.bulkCreate).toHaveBeenNthCalledWith(
        2,
        [
          { partnerId: 20, homeId: 5 },
          { partnerId: 20, homeId: 6 },
        ],
        {
          validate: true,
          individualHooks: true,
          transaction,
        },
      );
    });

    test('rejects restoration when an address is permanently non-recoverable', async () => {
      const transaction = { id: 'tx-6' };

      UserAddress.count.mockResolvedValue(1);

      let error;

      try {
        await applyOwnerUpdates(
          'user',
          10,
          {
            restoringData: {
              addresses: [101, 102],
            },
          },
          transaction,
        );
      } catch (caughtError) {
        error = caughtError;
      }

      expect(UserAddress.count).toHaveBeenCalledWith({
        where: {
          id: { [Op.in]: [101, 102] },
          userId: 10,
          isRecoverable: false,
        },
        transaction,
      });

      expect(error).toBeInstanceOf(CustomError);
      expect(error.code).toBe('ERRORS.ADDRESS_NOT_RESTORED');
      expect(error.statusCode ?? error.status).toBe(409);
      expect(UserAddress.update).not.toHaveBeenCalled();
    });

    test('restores recoverable addresses for the correct owner', async () => {
      const transaction = { id: 'tx-7' };

      UserAddress.count.mockResolvedValue(0);

      await applyOwnerUpdates(
        'user',
        10,
        {
          restoringData: {
            addresses: [101, 102],
          },
        },
        transaction,
      );

      expect(UserAddress.update).toHaveBeenCalledWith(
        {
          isRestricted: false,
        },
        {
          where: {
            id: { [Op.in]: [101, 102] },
            userId: 10,
          },
          individualHooks: true,
          transaction,
        },
      );
    });

    test('creates an outdated senior name snapshot', async () => {
      const transaction = { id: 'tx-8' };

      await applyOwnerUpdates(
        'senior',
        50,
        {
          outdatingData: {
            names: {
              firstName: 'Anna',
              patronymic: null,
              lastName: 'Ivanova',
            },
          },
        },
        transaction,
      );

      expect(SeniorOutdatedName.create).toHaveBeenCalledWith(
        {
          seniorId: 50,
          firstName: 'Anna',
          patronymic: null,
          lastName: 'Ivanova',
        },
        { transaction },
      );
    });

    test('deletes only contacts belonging to the requested partner', async () => {
      const transaction = { id: 'tx-9' };

      await applyOwnerUpdates(
        'partner',
        20,
        {
          deletingData: {
            contacts: [101, 102],
          },
        },
        transaction,
      );

      expect(PartnerContact.destroy).toHaveBeenCalledWith({
        where: {
          id: { [Op.in]: [101, 102] },
          partnerId: 20,
        },
        transaction,
        individualHooks: true,
      });
    });
  });

  describe('updateCoordinationByPartner', () => {
    test('blocks partner coordinations and makes them non-recoverable', async () => {
      const transaction = { id: 'tx-10' };

      await updateCoordinationByPartner(
        true,
        20,
        transaction,
      );

      expect(HomeCoordination.update).toHaveBeenCalledWith(
        {
          isRestricted: true,
          isRecoverable: false,
        },
        {
          where: {
            partnerId: 20,
          },
          individualHooks: true,
          transaction,
        },
      );

      expect(HomeCoordination.findAll).not.toHaveBeenCalled();
    });

    test('makes coordinations recoverable again only for active homes', async () => {
      const transaction = { id: 'tx-11' };

      HomeCoordination.findAll.mockResolvedValue([
        { id: 101 },
        { id: 102 },
      ]);

      await updateCoordinationByPartner(
        false,
        20,
        transaction,
      );

      expect(HomeCoordination.findAll).toHaveBeenCalledWith({
        where: {
          partnerId: 20,
        },
        include: [
          {
            model: Home,
            as: 'home',
            where: {
              isClose: false,
            },
            attributes: [],
            required: true,
          },
        ],
        attributes: ['id'],
        transaction,
      });

      expect(HomeCoordination.update).toHaveBeenCalledWith(
        {
          isRecoverable: true,
        },
        {
          where: {
            id: [101, 102],
          },
          individualHooks: true,
          transaction,
        },
      );
    });
  });
});
