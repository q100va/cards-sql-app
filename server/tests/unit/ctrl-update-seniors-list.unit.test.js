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

const Senior = {
  bulkCreate: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
};

const SeniorSearch = {
  bulkCreate: jest.fn(),
};

const INCLUDES = [{ association: 'home' }];
const createSearchStringFor = jest.fn();

jest.unstable_mockModule('../../models/index.js', () => ({
  Senior,
  SeniorSearch,
}));

jest.unstable_mockModule('../../routes/seniors-api.js', () => ({
  INCLUDES,
}));

jest.unstable_mockModule(
  '../../controllers/ctrl-search-string.js',
  () => ({
    createSearchStringFor,
  }),
);

const {
  addNewSeniors,
  removeSeniors,
  updateSeniors,
} = await import(
  '../../controllers/ctrl-update-seniors-list.js'
);

describe('ctrl-update-seniors-list', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns 0 for empty input without calling the database', async () => {
    const transaction = { id: 'tx-1' };

    await expect(
      addNewSeniors([], '2026-11-10', transaction),
    ).resolves.toBe(0);

    await expect(
      removeSeniors([], '2026-11-10', transaction),
    ).resolves.toBe(0);

    await expect(
      updateSeniors([], transaction),
    ).resolves.toBe(0);

    expect(Senior.bulkCreate).not.toHaveBeenCalled();
    expect(Senior.findAll).not.toHaveBeenCalled();
    expect(Senior.update).not.toHaveBeenCalled();
  });

  test('adds seniors, reloads them, and creates search rows', async () => {
    const transaction = { id: 'tx-2' };

    const admitted = [
      { firstName: 'Anna' },
      { firstName: 'Maria' },
    ];

    const created = [
      { id: 10 },
      { id: 11 },
    ];

    const freshSeniors = [
      { id: 10, firstName: 'Anna' },
      { id: 11, firstName: 'Maria' },
    ];

    Senior.bulkCreate.mockResolvedValue(created);
    Senior.findAll.mockResolvedValue(freshSeniors);

    createSearchStringFor
      .mockReturnValueOnce('anna search')
      .mockReturnValueOnce('maria search');

    SeniorSearch.bulkCreate.mockResolvedValue([
      { id: 101 },
      { id: 102 },
    ]);

    const result = await addNewSeniors(
      admitted,
      '2026-11-10',
      transaction,
    );

    expect(admitted).toEqual([
      {
        firstName: 'Anna',
        dateOfStart: '2026-11-10',
      },
      {
        firstName: 'Maria',
        dateOfStart: '2026-11-10',
      },
    ]);

    expect(Senior.bulkCreate).toHaveBeenCalledWith(
      admitted,
      {
        transaction,
        individualHooks: true,
      },
    );

    expect(Senior.findAll).toHaveBeenCalledWith({
      where: {
        id: {
          [Op.in]: [10, 11],
        },
      },
      attributes: {
        exclude: ['createdAt', 'updatedAt'],
      },
      include: INCLUDES,
      transaction,
    });

    expect(createSearchStringFor).toHaveBeenNthCalledWith(
      1,
      'senior',
      freshSeniors[0],
    );

    expect(createSearchStringFor).toHaveBeenNthCalledWith(
      2,
      'senior',
      freshSeniors[1],
    );

    expect(SeniorSearch.bulkCreate).toHaveBeenCalledWith(
      [
        {
          seniorId: 10,
          content: 'anna search',
        },
        {
          seniorId: 11,
          content: 'maria search',
        },
      ],
      { transaction },
    );

    expect(result).toBe(2);
  });

  test('throws when bulkCreate creates fewer seniors than requested', async () => {
    Senior.bulkCreate.mockResolvedValue([
      { id: 10 },
    ]);

    let error;

    try {
      await addNewSeniors(
        [
          { firstName: 'Anna' },
          { firstName: 'Maria' },
        ],
        '2026-11-10',
        { id: 'tx-3' },
      );
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(CustomError);
    expect(error.code).toBe(
      'ERRORS.SENIOR.BULK_CREATE_COUNT_MISMATCH',
    );
    expect(error.statusCode ?? error.status).toBe(500);
    expect(Senior.findAll).not.toHaveBeenCalled();
  });

  test('throws when the reloaded senior list has the wrong size', async () => {
    Senior.bulkCreate.mockResolvedValue([
      { id: 10 },
      { id: 11 },
    ]);

    Senior.findAll.mockResolvedValue([
      { id: 10 },
    ]);

    let error;

    try {
      await addNewSeniors(
        [
          { firstName: 'Anna' },
          { firstName: 'Maria' },
        ],
        '2026-11-10',
        { id: 'tx-4' },
      );
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(CustomError);
    expect(error.code).toBe(
      'ERRORS.SENIOR.FRESH_LIST_COUNT_MISMATCH',
    );
    expect(error.statusCode ?? error.status).toBe(500);
    expect(SeniorSearch.bulkCreate).not.toHaveBeenCalled();
  });

  test('throws when search rows are not created for every senior', async () => {
    Senior.bulkCreate.mockResolvedValue([
      { id: 10 },
      { id: 11 },
    ]);

    Senior.findAll.mockResolvedValue([
      { id: 10 },
      { id: 11 },
    ]);

    createSearchStringFor
      .mockReturnValueOnce('anna')
      .mockReturnValueOnce('maria');

    SeniorSearch.bulkCreate.mockResolvedValue([
      { id: 101 },
    ]);

    let error;

    try {
      await addNewSeniors(
        [
          { firstName: 'Anna' },
          { firstName: 'Maria' },
        ],
        '2026-11-10',
        { id: 'tx-5' },
      );
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(CustomError);
    expect(error.code).toBe(
      'ERRORS.SENIOR.SEARCH_CREATE_COUNT_MISMATCH',
    );
    expect(error.statusCode ?? error.status).toBe(500);
  });

  test('marks removed seniors with dateOfExit', async () => {
    const transaction = { id: 'tx-6' };

    Senior.update.mockResolvedValue([2]);

    const result = await removeSeniors(
      [
        { id: 10 },
        { id: 11 },
      ],
      '2026-11-10',
      transaction,
    );

    expect(Senior.update).toHaveBeenCalledWith(
      {
        dateOfExit: '2026-11-10',
      },
      {
        where: {
          id: {
            [Op.in]: [10, 11],
          },
        },
        individualHooks: true,
        transaction,
      },
    );

    expect(result).toBe(2);
  });

  test('throws when fewer seniors are removed than requested', async () => {
    Senior.update.mockResolvedValue([1]);

    let error;

    try {
      await removeSeniors(
        [
          { id: 10 },
          { id: 11 },
        ],
        '2026-11-10',
        { id: 'tx-7' },
      );
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(CustomError);
    expect(error.code).toBe(
      'ERRORS.SENIOR.BULK_REMOVED_COUNT_MISMATCH',
    );
    expect(error.statusCode ?? error.status).toBe(500);
  });

  test('updates every senior with its own changes', async () => {
    const transaction = { id: 'tx-8' };

    const updated = [
      {
        seniorId: 10,
        changes: {
          firstName: 'Anna',
        },
      },
      {
        seniorId: 11,
        changes: {
          isRestricted: true,
        },
      },
    ];

    const result = await updateSeniors(
      updated,
      transaction,
    );

    expect(Senior.update).toHaveBeenCalledTimes(2);

    expect(Senior.update).toHaveBeenNthCalledWith(
      1,
      {
        firstName: 'Anna',
      },
      {
        where: {
          id: 10,
        },
        individualHooks: true,
        transaction,
      },
    );

    expect(Senior.update).toHaveBeenNthCalledWith(
      2,
      {
        isRestricted: true,
      },
      {
        where: {
          id: 11,
        },
        individualHooks: true,
        transaction,
      },
    );

    expect(result).toBe(2);
  });
});
