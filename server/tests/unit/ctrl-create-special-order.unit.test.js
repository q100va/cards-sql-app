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
  GENDER_FILTER,
} from '../../../shared/dist/constants/orders.js';

import CustomError from '../../shared/customError.js';

const Recipient = {
  findAll: jest.fn(),
  increment: jest.fn(),
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
  createSpecialRecipientsListForOrder,
} = await import(
  '../../controllers/ctrl-create-special-order.js'
);

describe('ctrl-create-special-order', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('throws 404 when the occasion does not exist', async () => {
    Occasion.findByPk.mockResolvedValue(null);

    let error;

    try {
      await createSpecialRecipientsListForOrder(
        { occasionId: 20, amount: 4 },
        { minFromOneHouse: 2 },
        [],
        { id: 'tx-1' },
      );
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(CustomError);
    expect(error.code).toBe('ERRORS.DATA_NOT_FOUND');
    expect(error.statusCode ?? error.status).toBe(404);
    expect(Recipient.findAll).not.toHaveBeenCalled();
  });

  test('returns an empty list when eligible homes cannot provide the requested amount', async () => {
    const transaction = { id: 'tx-2' };

    Occasion.findByPk.mockResolvedValue({
      id: 20,
      month: 5,
    });

    Recipient.findAll
      .mockResolvedValueOnce([
        { homeIdSnapshot: 5, count: '1' },
      ])
      .mockResolvedValueOnce([
        { homeIdSnapshot: 6, count: '2' },
      ]);

    const result = await createSpecialRecipientsListForOrder(
      { occasionId: 20, amount: 4 },
      { minFromOneHouse: 2 },
      [],
      transaction,
    );

    expect(result).toEqual([]);
    expect(Recipient.increment).not.toHaveBeenCalled();
    expect(Recipient.decrement).not.toHaveBeenCalled();
  });

  test('applies special-order filters to recipient queries', async () => {
    const transaction = { id: 'tx-3' };

    Occasion.findByPk.mockResolvedValue({
      id: 20,
      month: 5,
    });

    Recipient.findAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await createSpecialRecipientsListForOrder(
      {
        occasionId: 20,
        amount: 2,
        forSchoolDepartment: true,
      },
      {
        minFromOneHouse: 1,
        gender: GENDER_FILTER.MALE,
        addressCategory: ADDRESS_CATEGORY.FOR_SCHOOLS,
        regions: [7],
        homes: [5],
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

    const genWhere = Recipient.findAll.mock.calls[0][0].where;

    expect(genWhere.occasionId).toBe(20);
    expect(genWhere.isAbsent).toBe(false);
    expect(genWhere.acceptableForSchool).toBe(true);

    expect(genWhere.daySnapshot).toEqual({
      [Op.between]: [10, 20],
    });

    expect(genWhere.yearSnapshot).toEqual({
      [Op.between]: [1930, 1950],
    });

    expect(genWhere['$senior.photoLink$']).toEqual({
      [Op.not]: null,
    });

    expect(genWhere['$senior.dateOfConcent$']).toEqual({
      [Op.not]: null,
    });

    expect(genWhere.specialComment).toEqual({
      [Op.iLike]: 'юбилей%',
    });

    expect(genWhere.plusAmount).toEqual({
      [Op.lt]: 7,
    });

    expect(genWhere.id).toEqual({
      [Op.notIn]: [99],
    });

    expect(genWhere.homeIdSnapshot).toEqual({
      [Op.in]: [5],
    });

    expect(genWhere.regionIdSnapshot).toEqual({
      [Op.in]: [7],
    });

    expect(genWhere.category[Op.and]).toEqual(
      expect.arrayContaining([
        { [Op.like]: '%male' },
        { [Op.notLike]: 'spec%' },
        { [Op.like]: 'gen%' },
      ]),
    );
  });

  test('selects recipients from multiple homes without exceeding maxFromOneHouse', async () => {
    const transaction = { id: 'tx-4' };
    const restrictedRecipientIds = [];
    const selectionQueries = [];

    const home5Recipients = [
      {
        id: 101,
        category: 'gen_young_male',
        homeIdSnapshot: 5,
        seniorId: 10,
      },
      {
        id: 102,
        category: 'gen_middle_female',
        homeIdSnapshot: 5,
        seniorId: 11,
      },
    ];

    const home6Recipients = [
      {
        id: 103,
        category: 'gen_young_female',
        homeIdSnapshot: 6,
        seniorId: 12,
      },
      {
        id: 104,
        category: 'gen_old_male',
        homeIdSnapshot: 6,
        seniorId: 13,
      },
    ];

    Occasion.findByPk.mockResolvedValue({
      id: 20,
      month: 5,
    });

    Recipient.findAll
      .mockResolvedValueOnce([
        { homeIdSnapshot: 5, count: '3' },
        { homeIdSnapshot: 6, count: '5' },
      ])
      .mockResolvedValueOnce([])
      .mockImplementationOnce(async (query) => {
        selectionQueries.push({
          homeId: query.where.homeIdSnapshot,
          limit: query.limit,
          restrictedIds: [...query.where.id[Op.notIn]],
        });

        return home5Recipients;
      })
      .mockImplementationOnce(async (query) => {
        selectionQueries.push({
          homeId: query.where.homeIdSnapshot,
          limit: query.limit,
          restrictedIds: [...query.where.id[Op.notIn]],
        });

        return home6Recipients;
      });

    const result = await createSpecialRecipientsListForOrder(
      { occasionId: 20, amount: 4 },
      {
        minFromOneHouse: 2,
        maxFromOneHouse: 2,
        addressCategory: ADDRESS_CATEGORY.ONLY_WITH_ADDRESS,
      },
      restrictedRecipientIds,
      transaction,
    );

    expect(result).toEqual([
      ...home5Recipients,
      ...home6Recipients,
    ]);

    expect(selectionQueries).toEqual([
      {
        homeId: 5,
        limit: 2,
        restrictedIds: [],
      },
      {
        homeId: 6,
        limit: 2,
        restrictedIds: [101, 102],
      },
    ]);

    expect(Recipient.increment).toHaveBeenCalledTimes(2);

    expect(Recipient.increment).toHaveBeenNthCalledWith(
      1,
      { plusAmount: 1 },
      {
        where: {
          id: { [Op.in]: [101, 102] },
        },
        transaction,
      },
    );

    expect(Recipient.increment).toHaveBeenNthCalledWith(
      2,
      { plusAmount: 1 },
      {
        where: {
          id: { [Op.in]: [103, 104] },
        },
        transaction,
      },
    );

    expect(restrictedRecipientIds).toEqual([
      101,
      102,
      103,
      104,
    ]);
  });

  test('replaces a no-address shortfall with addressed recipients', async () => {
    const transaction = { id: 'tx-5' };

    const genRecipients = [
      { id: 101, homeIdSnapshot: 5 },
      { id: 102, homeIdSnapshot: 5 },
      { id: 103, homeIdSnapshot: 5 },
      { id: 104, homeIdSnapshot: 5 },
    ];

    Occasion.findByPk.mockResolvedValue({
      id: 20,
      month: 5,
    });

    Recipient.findAll
      .mockResolvedValueOnce([
        { homeIdSnapshot: 5, count: '4' },
      ])
      .mockResolvedValueOnce([
        { homeIdSnapshot: 6, count: '2' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(genRecipients);

    const result = await createSpecialRecipientsListForOrder(
      { occasionId: 20, amount: 4 },
      {
        minFromOneHouse: 2,
        maxNoAddress: 2,
      },
      [],
      transaction,
    );

    expect(result).toEqual(genRecipients);

    const genSelectionQuery = Recipient.findAll.mock.calls[3][0];

    expect(genSelectionQuery.where.homeIdSnapshot).toBe(5);
    expect(genSelectionQuery.limit).toBe(4);

    expect(Recipient.increment).toHaveBeenCalledWith(
      { plusAmount: 1 },
      {
        where: {
          id: { [Op.in]: [101, 102, 103, 104] },
        },
        transaction,
      },
    );
  });

  test('does not use a home when fewer than minFromOneHouse recipients are returned', async () => {
    const transaction = { id: 'tx-6' };

    Occasion.findByPk.mockResolvedValue({
      id: 20,
      month: 5,
    });

    Recipient.findAll
      .mockResolvedValueOnce([
        { homeIdSnapshot: 5, count: '2' },
      ])
      .mockResolvedValueOnce([
        { homeIdSnapshot: 6, count: '2' },
      ])
      .mockResolvedValueOnce([
        { id: 201, homeIdSnapshot: 6 },
      ])
      .mockResolvedValueOnce([
        { id: 101, homeIdSnapshot: 5 },
        { id: 102, homeIdSnapshot: 5 },
        { id: 103, homeIdSnapshot: 5 },
        { id: 104, homeIdSnapshot: 5 },
      ]);

    const result = await createSpecialRecipientsListForOrder(
      { occasionId: 20, amount: 4 },
      {
        minFromOneHouse: 2,
        maxNoAddress: 2,
      },
      [],
      transaction,
    );

    expect(result).toHaveLength(4);

    expect(Recipient.increment).toHaveBeenCalledTimes(1);

    expect(Recipient.increment).toHaveBeenCalledWith(
      { plusAmount: 1 },
      {
        where: {
          id: { [Op.in]: [101, 102, 103, 104] },
        },
        transaction,
      },
    );
  });

  test('rolls back plusAmount when the full order cannot be assembled', async () => {
    const transaction = { id: 'tx-7' };

    const noAddressRecipients = [
      { id: 201, homeIdSnapshot: 6 },
      { id: 202, homeIdSnapshot: 6 },
    ];

    Occasion.findByPk.mockResolvedValue({
      id: 20,
      month: 5,
    });

    Recipient.findAll
      .mockResolvedValueOnce([
        { homeIdSnapshot: 5, count: '2' },
      ])
      .mockResolvedValueOnce([
        { homeIdSnapshot: 6, count: '2' },
      ])
      .mockResolvedValueOnce(noAddressRecipients)
      .mockResolvedValueOnce([]);

    const result = await createSpecialRecipientsListForOrder(
      { occasionId: 20, amount: 4 },
      {
        minFromOneHouse: 2,
        maxNoAddress: 2,
      },
      [],
      transaction,
    );

    expect(result).toEqual([]);

    expect(Recipient.increment).toHaveBeenCalledWith(
      { plusAmount: 1 },
      {
        where: {
          id: { [Op.in]: [201, 202] },
        },
        transaction,
      },
    );

    expect(Recipient.decrement).toHaveBeenCalledWith(
      'plusAmount',
      {
        by: 1,
        where: {
          id: { [Op.in]: [201, 202] },
        },
        transaction,
      },
    );
  });
});
