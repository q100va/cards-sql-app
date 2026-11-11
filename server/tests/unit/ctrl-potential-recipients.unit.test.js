/** @jest-environment node */

import {
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { Op } from 'sequelize';

import { OCCASION_TYPE } from '../../../shared/dist/constants/occasions.js';
import CustomError from '../../shared/customError.js';

const Senior = {
  findAll: jest.fn(),
};

const Recipient = {
  findAll: jest.fn(),
};

const getByBirthMonth = jest.fn();

jest.unstable_mockModule('../../models/index.js', () => ({
  Senior,
  Recipient,
}));

jest.unstable_mockModule(
  '../../controllers/ctrl-common-helpers.js',
  () => ({
    getByBirthMonth,
  }),
);

const {
  getPotentialRecipients,
} = await import(
  '../../controllers/ctrl-potential-recipients.js'
);

describe('ctrl-potential-recipients', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getByBirthMonth.mockReturnValue({ birthMonthCondition: true });
  });

  test('returns birthday seniors excluding those who already have recipients', async () => {
    const occasion = {
      id: 20,
      type: OCCASION_TYPE.BIRTHDAY,
      month: 5,
    };

    Recipient.findAll.mockResolvedValue([
      { seniorId: 10 },
      { seniorId: 11 },
    ]);

    Senior.findAll.mockResolvedValue([
      {
        id: 12,
        firstName: 'Anna',
        patronymic: 'Petrovna',
        lastName: 'Ivanova',
        birthDate: '1940-05-12',
      },
    ]);

    const result = await getPotentialRecipients(
      occasion,
      5,
    );

    expect(Recipient.findAll).toHaveBeenCalledWith({
      where: {
        occasionId: 20,
        homeIdSnapshot: 5,
      },
      attributes: ['seniorId'],
    });

    expect(getByBirthMonth).toHaveBeenCalledWith(5);

    expect(Senior.findAll).toHaveBeenCalledWith({
      where: {
        [Op.and]: [
          { birthMonthCondition: true },
          { dateOfExit: null },
          { isRestricted: false },
          { homeId: 5 },
          {
            id: {
              [Op.notIn]: [10, 11],
            },
          },
        ],
      },
      attributes: [
        'id',
        'lastName',
        'firstName',
        'patronymic',
        'birthDate',
      ],
    });

    expect(result).toEqual([
      {
        id: 12,
        fullData: 'Anna Petrovna Ivanova 1940-05-12',
      },
    ]);
  });

  test('does not add a notIn condition when the home has no existing recipients', async () => {
    Recipient.findAll.mockResolvedValue([]);
    Senior.findAll.mockResolvedValue([]);

    await getPotentialRecipients(
      {
        id: 20,
        type: OCCASION_TYPE.BIRTHDAY,
        month: 5,
      },
      5,
    );

    const where = Senior.findAll.mock.calls[0][0].where;

    expect(where[Op.and]).toEqual([
      { birthMonthCondition: true },
      { dateOfExit: null },
      { isRestricted: false },
      { homeId: 5 },
    ]);
  });

  test('formats unknown birth year 1800 as a question mark', async () => {
    Recipient.findAll.mockResolvedValue([]);

    Senior.findAll.mockResolvedValue([
      {
        id: 12,
        firstName: 'Anna',
        patronymic: null,
        lastName: 'Ivanova',
        birthDate: '1800-05-02',
      },
    ]);

    const result = await getPotentialRecipients(
      {
        id: 20,
        type: OCCASION_TYPE.BIRTHDAY,
        month: 5,
      },
      5,
    );

    expect(result).toEqual([
      {
        id: 12,
        fullData: 'Anna Ivanova ?-05-02',
      },
    ]);
  });

  test('throws 400 for an unsupported occasion type', async () => {
    let error;

    try {
      await getPotentialRecipients(
        {
          id: 20,
          type: 999,
          month: null,
        },
        5,
      );
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(CustomError);
    expect(error.code).toBe('ERRORS.UNSUPPORTED_TYPE');
    expect(error.statusCode ?? error.status).toBe(400);

    expect(Recipient.findAll).not.toHaveBeenCalled();
    expect(Senior.findAll).not.toHaveBeenCalled();
  });
});
