/** @jest-environment node */

import {
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { Op } from 'sequelize';

import {
  ADDRESS_CATEGORY,
} from '../../../shared/dist/constants/orders.js';

import CustomError from '../../shared/customError.js';

const Recipient = {
  findOne: jest.fn(),
  decrement: jest.fn(),
};

const Occasion = {
  findByPk: jest.fn(),
};

const Senior = {};

jest.unstable_mockModule('../../models/index.js', () => ({
  Recipient,
  Occasion,
  Senior,
}));

const {
  createRecipientsListForOrder,
  getDefaultDates,
} = await import('../../controllers/ctrl-create-order.js');

describe('ctrl-create-order', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getDefaultDates', () => {
    test('uses days 26-31 when the occasion is in the current month', () => {
      const today = new Date(2026, 4, 14);

      expect(getDefaultDates(5, today)).toEqual({
        date1: 26,
        date2: 31,
      });
    });

    test('uses the current five-day period when the occasion is next month', () => {
      const today = new Date(2026, 4, 14);

      expect(getDefaultDates(6, today)).toEqual({
        date1: 11,
        date2: 15,
      });
    });

    test('uses days 1-5 when the occasion is more than one month away', () => {
      const today = new Date(2026, 4, 14);

      expect(getDefaultDates(7, today)).toEqual({
        date1: 1,
        date2: 5,
      });
    });
  });

  describe('createRecipientsListForOrder', () => {
    test('throws 404 when the occasion does not exist', async () => {
      Occasion.findByPk.mockResolvedValue(null);

      let error;

      try {
        await createRecipientsListForOrder(
          { occasionId: 20, amount: 1 },
          {},
          [],
          { id: 'tx-1' },
        );
      } catch (caughtError) {
        error = caughtError;
      }

      expect(error).toBeInstanceOf(CustomError);
      expect(error.code).toBe('ERRORS.DATA_NOT_FOUND');
      expect(error.statusCode ?? error.status).toBe(404);
      expect(Recipient.findOne).not.toHaveBeenCalled();
    });

    test('selects a recipient, increments plusAmount, and restricts it from reuse', async () => {
      const transaction = { id: 'tx-2' };
      const restrictedRecipientIds = [];

      const recipient = {
        id: 101,
        homeIdSnapshot: 5,
        regionIdSnapshot: 7,
        seniorId: 10,
        increment: jest.fn(),
      };

      Occasion.findByPk.mockResolvedValue({
        id: 20,
        month: 5,
      });

      Recipient.findOne.mockResolvedValue(recipient);

      const result = await createRecipientsListForOrder(
        { occasionId: 20, amount: 1 },
        {},
        restrictedRecipientIds,
        transaction,
      );

      expect(result).toEqual([recipient]);
      expect(restrictedRecipientIds).toEqual([101]);

      expect(recipient.increment).toHaveBeenCalledWith(
        'plusAmount',
        {
          by: 1,
          transaction,
        },
      );

      expect(Recipient.decrement).not.toHaveBeenCalled();
    });

    test('applies recipient filters to the database query', async () => {
      const transaction = { id: 'tx-3' };
      let restrictedIdsAtQueryTime;

      const recipient = {
        id: 101,
        homeIdSnapshot: 5,
        regionIdSnapshot: 7,
        seniorId: 10,
        increment: jest.fn(),
      };

      Occasion.findByPk.mockResolvedValue({
        id: 20,
        month: 5,
      });

      Recipient.findOne.mockImplementation(async (query) => {
        restrictedIdsAtQueryTime = [
          ...(query.where.id?.[Op.notIn] ?? []),
        ];

        return recipient;
      });

      await createRecipientsListForOrder(
        {
          occasionId: 20,
          amount: 1,
        },
        {
          addressCategory: ADDRESS_CATEGORY.FOR_SCHOOLS,
          homes: [5],
          regions: [7],
          date1: 10,
          date2: 20,
          year1: 1930,
          year2: 1950,
          onlyWithPicture: true,
          onlyAnniversaries: true,
          onlyWithConcents: true,
        },
        [99],
        transaction,
      );

      const query = Recipient.findOne.mock.calls[0][0];
      const where = query.where;

      expect(where.occasionId).toBe(20);
      expect(where.isAbsent).toBe(false);
      expect(where.acceptableForSchool).toBe(true);

      expect(where.daySnapshot).toEqual({
        [Op.between]: [10, 20],
      });

      expect(where.yearSnapshot).toEqual({
        [Op.between]: [1930, 1950],
      });

      expect(where['$senior.photoLink$']).toEqual({
        [Op.not]: null,
      });

      expect(where['$senior.dateOfConcent$']).toEqual({
        [Op.not]: null,
      });

      expect(where.specialComment).toEqual({
        [Op.iLike]: 'юбилей%',
      });

      expect(where.plusAmount).toEqual({
        [Op.lt]: 15,
      });

      expect(restrictedIdsAtQueryTime).toEqual([99]);

      expect(where.homeIdSnapshot).toEqual({
        [Op.in]: [5],
      });

      expect(where.regionIdSnapshot).toEqual({
        [Op.in]: [7],
      });

      expect(query.transaction).toBe(transaction);
    });

    test('excludes a home and region after their selection limits are reached', async () => {
      const transaction = { id: 'tx-4' };
      const restrictedRecipientIds = [];
      const restrictedIdsAtQueryTime = [];

      const firstRecipient = {
        id: 101,
        homeIdSnapshot: 5,
        regionIdSnapshot: 7,
        seniorId: 10,
        increment: jest.fn(),
      };

      const secondRecipient = {
        id: 102,
        homeIdSnapshot: 6,
        regionIdSnapshot: 8,
        seniorId: 11,
        increment: jest.fn(),
      };

      Occasion.findByPk.mockResolvedValue({
        id: 20,
        month: 5,
      });

      Recipient.findOne
        .mockImplementationOnce(async (query) => {
          restrictedIdsAtQueryTime.push([
            ...(query.where.id?.[Op.notIn] ?? []),
          ]);

          return firstRecipient;
        })
        .mockImplementationOnce(async (query) => {
          restrictedIdsAtQueryTime.push([
            ...(query.where.id?.[Op.notIn] ?? []),
          ]);

          return secondRecipient;
        });

      const result = await createRecipientsListForOrder(
        {
          occasionId: 20,
          amount: 2,
        },
        {
          maxFromOneHouse: 1,
        },
        restrictedRecipientIds,
        transaction,
      );

      expect(result).toEqual([
        firstRecipient,
        secondRecipient,
      ]);

      const secondQuery = Recipient.findOne.mock.calls[1][0];

      expect(secondQuery.where.homeIdSnapshot).toEqual({
        [Op.notIn]: [5],
      });

      expect(secondQuery.where.regionIdSnapshot).toEqual({
        [Op.notIn]: [7],
      });

      expect(restrictedIdsAtQueryTime).toEqual([
        [],
        [101],
      ]);

      expect(restrictedRecipientIds).toEqual([
        101,
        102,
      ]);
    });

    test('rolls back plusAmount and returns an empty list when the full order cannot be assembled', async () => {
      const transaction = { id: 'tx-5' };

      const firstRecipient = {
        id: 101,
        homeIdSnapshot: 5,
        regionIdSnapshot: 7,
        seniorId: 10,
        increment: jest.fn(),
      };

      Occasion.findByPk.mockResolvedValue({
        id: 20,
        month: 5,
      });

      Recipient.findOne
        .mockResolvedValueOnce(firstRecipient)
        .mockResolvedValue(null);

      const result = await createRecipientsListForOrder(
        {
          occasionId: 20,
          amount: 2,
        },
        {
          maxFromOneHouse: 1,
        },
        [],
        transaction,
      );

      expect(result).toEqual([]);

      expect(firstRecipient.increment).toHaveBeenCalledWith(
        'plusAmount',
        {
          by: 1,
          transaction,
        },
      );

      expect(Recipient.decrement).toHaveBeenCalledWith(
        'plusAmount',
        {
          by: 1,
          where: {
            id: {
              [Op.in]: [101],
            },
          },
          transaction,
        },
      );
    });
  });
});
