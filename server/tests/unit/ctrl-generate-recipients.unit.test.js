/** @jest-environment node */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Op } from 'sequelize';

import { OCCASION_TYPE } from '../../../shared/dist/constants/occasions.js';

import CustomError from '../../shared/customError.js';

const Senior = { findAll: jest.fn() };

const Home = {};
const HomeAddress = {};
const Region = {};

const getByBirthMonth = jest.fn();
const buildFullName = jest.fn();
const getCategory = jest.fn();
const getSpecialComment = jest.fn();

jest.unstable_mockModule('../../models/index.js', () =>
({
  Senior,
  Home,
  HomeAddress,
  Region,
}));

jest.unstable_mockModule('../../controllers/ctrl-common-helpers.js', () =>
({
  getByBirthMonth,
  buildFullName,
  getCategory,
  getSpecialComment,
}));

const {
  generateRecipients,
  getSeniors,
} = await import('../../controllers/ctrl-generate-recipients.js');

describe('ctrl-generate-recipients', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getSeniors', () => {
    test('loads active birthday seniors and limits the query to provided senior ids', async () => {
      const transaction = { id: 'tx-1' };
      const birthMonthCondition = { birthMonth: 5 };

      getByBirthMonth.mockReturnValue(birthMonthCondition);

      Senior.findAll.mockResolvedValue([{ id: 10 }]);

      const occasion = {
        id: 20,
        type: OCCASION_TYPE.BIRTHDAY,
        month: 5,
        year: 2027,
      };

      const result = await getSeniors(occasion, transaction, [10, 11]);

      expect(getByBirthMonth).toHaveBeenCalledWith(5);

      expect(Senior.findAll).toHaveBeenCalledTimes(1);

      const query = Senior.findAll.mock.calls[0][0];

      expect(query.transaction).toBe(transaction);

      expect(query.where[Op.and]).toEqual([birthMonthCondition, { dateOfExit: null }, { isRestricted: false }, { id: { [Op.in]: [10, 11] } }]);

      expect(query.include).toEqual(expect.any(Array));

      expect(result).toEqual([{ id: 10 }]);
    });

    test('does not add a senior id filter when seniorIds is empty', async () => {
      getByBirthMonth.mockReturnValue({ birthMonth: 5 });

      Senior.findAll.mockResolvedValue([]);

      await getSeniors({
        type: OCCASION_TYPE.BIRTHDAY,
        month: 5,
      }, { id: 'tx-2' });

      const query = Senior.findAll.mock.calls[0][0];

      expect(query.where[Op.and]).toHaveLength(3);
    });

    test('throws 400 for an unsupported occasion type', async () => {
      let error;

      try {
        await getSeniors({ type: 999 }, { id: 'tx-3' });
      } catch (caughtError) {
        error = caughtError;
      }

      expect(error).toBeInstanceOf(CustomError);

      expect(error.code).toBe('ERRORS.UNSUPPORTED_TYPE');

      expect(error.statusCode ?? error.status).toBe(400);

      expect(Senior.findAll).not.toHaveBeenCalled();
    });
  });

  describe('generateRecipients', () => {
    test('creates recipient snapshots from birthday seniors', async () => {
      const transaction = { id: 'tx-4' };

      const senior = {
        id: 10,
        firstName: 'Anna',
        patronymic: null,
        lastName: 'Ivanova',
        birthDate: '1940-05-12',
        gender: 2,
        personalNoAddr: false,
        homeId: 5,
        home: {
          acceptableForSchool: true,
          activeAddress: {
            fullPostalAddress: '123 Main St',
            region: { id: 7 },
          },
        },
      };

      const occasion = {
        id: 20,
        type: OCCASION_TYPE.BIRTHDAY,
        month: 5,
        year: 2027,
      };

      getByBirthMonth.mockReturnValue({ birthMonth: 5 });

      Senior.findAll.mockResolvedValue([senior]);

      buildFullName.mockReturnValue('Anna Ivanova');

      getCategory.mockReturnValue('category');

      getSpecialComment.mockReturnValue('special');

      const result = await generateRecipients(occasion, transaction, [10]);

      expect(buildFullName).toHaveBeenCalledWith(senior);

      expect(getCategory).toHaveBeenCalledWith(senior, 1940, 2027);

      expect(getSpecialComment).toHaveBeenCalledWith(1940, 2027);

      expect(result).toEqual([
        {
          fullNameSnapshot: 'Anna Ivanova',
          daySnapshot: 12,
          monthSnapshot: 5,
          yearSnapshot: 1940,
          regionIdSnapshot: 7,
          homeIdSnapshot: 5,
          addressSnapshot: '123 Main St',
          category: 'category',
          specialComment: 'special',
          acceptableForSchool: true,
          isAbsent: false,
          plusAmount: 0,
          seniorId: 10,
          occasionId: 20,
        },
      ]);
    });

    test('stores unknown birth year 1800 as null and leaves specialComment empty', async () => {
      const senior = {
        id: 10,
        birthDate: '1800-05-12',
        homeId: 5,
        home: {
          acceptableForSchool: false,
          activeAddress: {
            fullPostalAddress: '123 Main St',
            region: { id: 7 },
          },
        },
      };

      getByBirthMonth.mockReturnValue({ birthMonth: 5 });

      Senior.findAll.mockResolvedValue([senior]);

      buildFullName.mockReturnValue('Unknown Year');

      getCategory.mockReturnValue('category');

      const result = await generateRecipients({
        id: 20,
        type: OCCASION_TYPE.BIRTHDAY,
        month: 5,
        year: 2027,
      }, { id: 'tx-5' });

      expect(result[0]).toEqual(expect.objectContaining({
        yearSnapshot: null,
        specialComment: '',
      }));

      expect(getCategory).toHaveBeenCalledWith(senior, 1800, 2027);

      expect(getSpecialComment).not.toHaveBeenCalled();
    });

    test('throws 404 when no eligible birthday seniors are found', async () => {
      getByBirthMonth.mockReturnValue({ birthMonth: 5 });

      Senior.findAll.mockResolvedValue([]);

      let error;

      try {
        await generateRecipients({
          id: 20,
          type: OCCASION_TYPE.BIRTHDAY,
          month: 5,
          year: 2027,
        }, { id: 'tx-6' });
      } catch (caughtError) {
        error = caughtError;
      }

      expect(error).toBeInstanceOf(CustomError);

      expect(error.code).toBe('ERRORS.DATA_NOT_FOUND');

      expect(error.statusCode ?? error.status).toBe(404);
    });

    test('throws 400 for an unsupported occasion type', async () => {
      let error;

      try {
        await generateRecipients({ type: 999 }, { id: 'tx-7' });
      } catch (caughtError) {
        error = caughtError;
      }

      expect(error).toBeInstanceOf(CustomError);

      expect(error.code).toBe('ERRORS.UNSUPPORTED_TYPE');

      expect(error.statusCode ?? error.status).toBe(400);

      expect(Senior.findAll).not.toHaveBeenCalled();
    });
  });
});
