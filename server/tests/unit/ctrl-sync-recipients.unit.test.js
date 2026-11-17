/** @jest-environment node */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Op } from 'sequelize';

import { OCCASION_TYPE } from '../../../shared/dist/constants/occasions.js';

import CustomError from '../../shared/customError.js';

const Recipient = {
  findAll: jest.fn(),
  bulkCreate: jest.fn(),
  update: jest.fn(),
};

const Occasion = {
  findAll: jest.fn(),
  increment: jest.fn(),
};

const Senior = { findByPk: jest.fn() };

const Home = { findByPk: jest.fn() };

const HomeAddress = {};
const Region = {};

const generateRecipients = jest.fn();
const addRecipients = jest.fn();
const buildFullName = jest.fn();
const getCategory = jest.fn();
const getSpecialComment = jest.fn();

jest.unstable_mockModule('../../models/index.js', () =>
({
  Recipient,
  Occasion,
  Senior,
  Home,
  HomeAddress,
  Region,
}));

jest.unstable_mockModule('../../controllers/ctrl-generate-recipients.js', () =>
({
  generateRecipients,
}));

jest.unstable_mockModule('../../controllers/ctrl-check-recipients.js', () => ({ addRecipients }));

jest.unstable_mockModule('../../controllers/ctrl-common-helpers.js', () =>
({
  buildFullName,
  getCategory,
  getSpecialComment,
}));

const {
  syncRecipientsAfterHomeUpdate,
  syncRecipientsAfterSeniorUpdate,
} = await import('../../controllers/ctrl-sync-recipients.js');

describe('ctrl-sync-recipients', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('syncRecipientsAfterSeniorUpdate', () => {
    test('throws 404 when the senior does not exist', async () => {
      Senior.findByPk.mockResolvedValue(null);

      let error;

      try {
        await syncRecipientsAfterSeniorUpdate(10, {}, { id: 'tx-1' });
      } catch (caughtError) {
        error = caughtError;
      }

      expect(error).toBeInstanceOf(CustomError);
      expect(error.code).toBe('ERRORS.DATA_NOT_FOUND');
      expect(error.statusCode ?? error.status).toBe(404);

      expect(Occasion.findAll).not.toHaveBeenCalled();
      expect(Recipient.findAll).not.toHaveBeenCalled();
    });

    test('creates a missing birthday recipient and increments the occasion amount', async () => {
      const transaction = { id: 'tx-2' };

      const birthday = {
        id: 20,
        type: OCCASION_TYPE.BIRTHDAY,
        month: 5,
        year: 2027,
      };

      Senior.findByPk.mockResolvedValue({
        id: 10,
        birthDate: '1940-05-12',
        dateOfExit: null,
        isRestricted: false,
        home: {
          isRestricted: false,
          isClose: false,
        },
      });

      Occasion.findAll.mockResolvedValue([birthday]);
      Recipient.findAll.mockResolvedValue([]);

      generateRecipients.mockResolvedValue([
        {
          seniorId: 10,
          occasionId: 20,
        },
      ]);

      Recipient.bulkCreate.mockResolvedValue([{ id: 100 }]);

      await syncRecipientsAfterSeniorUpdate(10, {}, transaction);

      expect(generateRecipients).toHaveBeenCalledWith(birthday, transaction, [10]);

      expect(Recipient.bulkCreate).toHaveBeenCalledWith([
        {
          seniorId: 10,
          occasionId: 20,
        },
      ], {
        transaction,
        individualHooks: true,
      });

      expect(Occasion.increment).toHaveBeenCalledWith({ amount: 1 }, {
        where: { id: 20 },
        transaction,
      });
    });

    test('updates snapshots and marks recipients from an old birthday occasion as absent', async () => {
      const transaction = { id: 'tx-3' };

      const currentRecipient = {
        id: 101,
        occasionId: 20,
        occasion: {
          type: OCCASION_TYPE.BIRTHDAY,
          year: 2027,
        },
        update: jest.fn(),
      };

      const oldRecipient = {
        id: 102,
        occasionId: 21,
        occasion: {
          type: OCCASION_TYPE.BIRTHDAY,
          year: 2027,
        },
        update: jest.fn(),
      };

      Senior.findByPk.mockResolvedValue({
        id: 10,
        firstName: 'Anna',
        patronymic: null,
        lastName: 'Ivanova',
        birthDate: '1940-05-12',
        gender: 2,
        personalNoAddr: false,
        dateOfExit: null,
        isRestricted: false,
        home: {
          isRestricted: false,
          isClose: false,
        },
      });

      Occasion.findAll.mockResolvedValue([
        {
          id: 20,
          type: OCCASION_TYPE.BIRTHDAY,
          month: 5,
          year: 2027,
        },
        {
          id: 21,
          type: OCCASION_TYPE.BIRTHDAY,
          month: 6,
          year: 2027,
        },
      ]);

      Recipient.findAll.mockResolvedValue([currentRecipient, oldRecipient]);

      buildFullName.mockReturnValue('Anna Ivanova');
      getCategory.mockReturnValue('category');
      getSpecialComment.mockReturnValue('special');

      await syncRecipientsAfterSeniorUpdate(10, {
        firstName: 'Anna',
        birthDate: '1940-05-12',
        gender: 2,
      }, transaction);

      const expectedPayload = {
        fullNameSnapshot: 'Anna Ivanova',
        category: 'category',
        daySnapshot: 12,
        monthSnapshot: 5,
        yearSnapshot: 1940,
        specialComment: 'special',
        isAbsent: false,
      };

      expect(currentRecipient.update).toHaveBeenCalledWith(expectedPayload, {
        transaction,
        individualHooks: true,
      });

      expect(oldRecipient.update).toHaveBeenCalledWith(expectedPayload, {
        transaction,
        individualHooks: true,
      });

      expect(Recipient.update).toHaveBeenCalledWith({ isAbsent: true }, {
        where: { id: { [Op.in]: [102] } },
        transaction,
        individualHooks: true,
      });

      expect(generateRecipients).not.toHaveBeenCalled();
    });

    test('marks existing recipients absent when the senior is inactive', async () => {
      const transaction = { id: 'tx-4' };

      const recipient = {
        id: 101,
        occasionId: 20,
        occasion: {
          type: OCCASION_TYPE.BIRTHDAY,
          year: 2027,
        },
        update: jest.fn(),
      };

      Senior.findByPk.mockResolvedValue({
        id: 10,
        birthDate: '1940-05-12',
        dateOfExit: '2026-10-01',
        isRestricted: false,
        home: {
          isRestricted: false,
          isClose: false,
        },
      });

      Occasion.findAll.mockResolvedValue([
        {
          id: 20,
          type: OCCASION_TYPE.BIRTHDAY,
          month: 5,
          year: 2027,
        },
      ]);

      Recipient.findAll.mockResolvedValue([recipient]);

      await syncRecipientsAfterSeniorUpdate(10, {}, transaction);

      expect(recipient.update).toHaveBeenCalledWith({ isAbsent: true }, {
        transaction,
        individualHooks: true,
      });

      expect(generateRecipients).not.toHaveBeenCalled();
      expect(Recipient.bulkCreate).not.toHaveBeenCalled();
    });

    test('clears birth-date snapshots when the senior no longer has a birth date', async () => {
      const transaction = { id: 'tx-5' };

      const recipient = {
        id: 101,
        occasionId: 20,
        occasion: {
          type: OCCASION_TYPE.BIRTHDAY,
          year: 2027,
        },
        update: jest.fn(),
      };

      Senior.findByPk.mockResolvedValue({
        id: 10,
        birthDate: null,
        dateOfExit: null,
        isRestricted: false,
        home: {
          isRestricted: false,
          isClose: false,
        },
      });

      Occasion.findAll.mockResolvedValue([
        {
          id: 20,
          type: OCCASION_TYPE.BIRTHDAY,
          month: 5,
          year: 2027,
        },
      ]);

      Recipient.findAll.mockResolvedValue([recipient]);

      await syncRecipientsAfterSeniorUpdate(10, { birthDate: null }, transaction);

      expect(recipient.update).toHaveBeenCalledWith({
        daySnapshot: null,
        monthSnapshot: null,
        yearSnapshot: null,
        specialComment: '',
        isAbsent: false,
      }, {
        transaction,
        individualHooks: true,
      });

      expect(getCategory).not.toHaveBeenCalled();

      expect(Recipient.update).toHaveBeenCalledWith({ isAbsent: true }, {
        where: { id: { [Op.in]: [101] } },
        transaction,
        individualHooks: true,
      });
    });
  });

  describe('syncRecipientsAfterHomeUpdate', () => {
    test('throws 404 when the home does not exist', async () => {
      Home.findByPk.mockResolvedValue(null);

      let error;

      try {
        await syncRecipientsAfterHomeUpdate(5, {}, { id: 'tx-6' });
      } catch (caughtError) {
        error = caughtError;
      }

      expect(error).toBeInstanceOf(CustomError);
      expect(error.code).toBe('ERRORS.DATA_NOT_FOUND');
      expect(error.statusCode ?? error.status).toBe(404);

      expect(Recipient.findAll).not.toHaveBeenCalled();
    });

    test('updates recipient address, category, school eligibility, and absence state', async () => {
      const transaction = { id: 'tx-7' };

      const recipient = {
        id: 101,
        yearSnapshot: 1940,
        occasion: { year: 2027 },
        senior: {
          dateOfExit: null,
          isRestricted: false,
          personalNoAddr: false,
          gender: 2,
        },
        update: jest.fn(),
      };

      Home.findByPk.mockResolvedValue({
        id: 5,
        specialHome: false,
        noAddress: false,
        acceptableForSchool: true,
        isRestricted: false,
        isClose: false,
        activeAddress: {
          fullPostalAddress: '123 Main St',
          region: { id: 7 },
        },
      });

      Recipient.findAll.mockResolvedValue([recipient]);
      getCategory.mockReturnValue('category');

      await syncRecipientsAfterHomeUpdate(5, {}, transaction);

      expect(getCategory).toHaveBeenCalledWith({
        personalNoAddr: false,
        home: {
          specialHome: false,
          noAddress: false,
        },
        gender: 2,
      }, 1940, 2027);

      expect(recipient.update).toHaveBeenCalledWith({
        regionIdSnapshot: 7,
        addressSnapshot: '123 Main St',
        acceptableForSchool: true,
        category: 'category',
        isAbsent: false,
      }, {
        transaction,
        individualHooks: true,
      });

      expect(addRecipients).not.toHaveBeenCalled();
    });

    test('adds missing recipients for every active occasion when a home becomes active again', async () => {
      const transaction = { id: 'tx-8' };

      const occasions = [
        {
          id: 20,
          type: OCCASION_TYPE.BIRTHDAY,
          month: 5,
          year: 2027,
        },
        {
          id: 21,
          type: OCCASION_TYPE.BIRTHDAY,
          month: 6,
          year: 2027,
        },
      ];

      Home.findByPk.mockResolvedValue({
        id: 5,
        specialHome: false,
        noAddress: false,
        acceptableForSchool: true,
        isRestricted: false,
        isClose: false,
        activeAddress: {
          fullPostalAddress: '123 Main St',
          region: { id: 7 },
        },
      });

      Recipient.findAll.mockResolvedValue([]);
      Occasion.findAll.mockResolvedValue(occasions);

      await syncRecipientsAfterHomeUpdate(5, { isClose: false }, transaction);

      expect(Occasion.findAll).toHaveBeenCalledWith({
        where: { status: 1 },
        attributes: ['id', 'type', 'month', 'year'],
        transaction,
      });

      expect(addRecipients).toHaveBeenCalledTimes(2);

      expect(addRecipients).toHaveBeenNthCalledWith(1, occasions[0], transaction, 5);

      expect(addRecipients).toHaveBeenNthCalledWith(2, occasions[1], transaction, 5);
    });
  });
});
