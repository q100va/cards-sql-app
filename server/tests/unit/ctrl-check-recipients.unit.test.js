/** @jest-environment node */

import {
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { Op } from 'sequelize';

const Recipient = {
  findAll: jest.fn(),
  update: jest.fn(),
  bulkCreate: jest.fn(),
};

const Occasion = {
  increment: jest.fn(),
};

const Home = {};

const generateRecipients = jest.fn();
const getSeniors = jest.fn();

jest.unstable_mockModule('../../models/index.js', () => ({
  Recipient,
  Occasion,
  Home,
}));

jest.unstable_mockModule(
  '../../controllers/ctrl-generate-recipients.js',
  () => ({
    generateRecipients,
    getSeniors,
  }),
);

const {
  addRecipients,
  markAbsentRecipients,
} = await import(
  '../../controllers/ctrl-check-recipients.js'
);

describe('ctrl-check-recipients', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('addRecipients', () => {
    test('restores returning recipients and creates recipients for new seniors', async () => {
      const transaction = { id: 'tx-1' };
      const occasion = { id: 20 };

      getSeniors.mockResolvedValue([
        { id: 10, homeId: 5 },
        { id: 11, homeId: 5 },
        { id: 12, homeId: 6 },
      ]);

      Recipient.findAll
        .mockResolvedValueOnce([
          { seniorId: 10 },
        ])
        .mockResolvedValueOnce([
          { seniorId: 11 },
        ])
        .mockResolvedValueOnce([
          {
            id: 301,
            fullNameSnapshot: 'New Senior',
            yearSnapshot: 1940,
            monthSnapshot: 5,
            daySnapshot: 12,
            snapshotHome: {
              homeName: 'Home A',
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 201,
            fullNameSnapshot: 'Returning Senior',
            yearSnapshot: null,
            monthSnapshot: 6,
            daySnapshot: 3,
            snapshotHome: {
              homeName: 'Home B',
            },
          },
        ]);

      Recipient.update.mockResolvedValue([
        1,
        [{ id: 201 }],
      ]);

      generateRecipients.mockResolvedValue([
        {
          seniorId: 12,
          occasionId: 20,
        },
      ]);

      Recipient.bulkCreate.mockResolvedValue([
        { id: 301 },
      ]);

      const result = await addRecipients(
        occasion,
        transaction,
      );

      expect(Recipient.update).toHaveBeenCalledWith(
        {
          isAbsent: false,
        },
        {
          where: {
            occasionId: 20,
            seniorId: {
              [Op.in]: [11],
            },
          },
          transaction,
          individualHooks: true,
          returning: true,
        },
      );

      expect(generateRecipients).toHaveBeenCalledWith(
        occasion,
        transaction,
        [12],
      );

      expect(Recipient.bulkCreate).toHaveBeenCalledWith(
        [
          {
            seniorId: 12,
            occasionId: 20,
          },
        ],
        {
          transaction,
          individualHooks: true,
        },
      );

      expect(Occasion.increment).toHaveBeenCalledWith(
        {
          amount: 1,
        },
        {
          where: {
            id: 20,
          },
          transaction,
        },
      );

      expect(result).toEqual({
        added: [
          {
            id: 301,
            fullData: 'Home A New Senior 1940-05-12',
          },
        ],
        returned: [
          {
            id: 201,
            fullData: 'Home B Returning Senior ?-06-03',
          },
        ],
      });
    });

    test('limits seniors and recipient queries to the requested home', async () => {
      const transaction = { id: 'tx-2' };
      const occasion = { id: 20 };

      getSeniors.mockResolvedValue([
        { id: 10, homeId: 5 },
        { id: 11, homeId: 6 },
      ]);

      Recipient.findAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 101,
            fullNameSnapshot: 'Anna Ivanova',
            yearSnapshot: 1940,
            monthSnapshot: 5,
            daySnapshot: 12,
            snapshotHome: {
              homeName: 'Home A',
            },
          },
        ]);

      generateRecipients.mockResolvedValue([
        {
          seniorId: 10,
          occasionId: 20,
        },
      ]);

      Recipient.bulkCreate.mockResolvedValue([
        { id: 101 },
      ]);

      const result = await addRecipients(
        occasion,
        transaction,
        5,
      );

      expect(Recipient.findAll.mock.calls[0][0].where).toEqual({
        occasionId: 20,
        isAbsent: false,
        homeIdSnapshot: 5,
      });

      expect(Recipient.findAll.mock.calls[1][0].where).toEqual({
        occasionId: 20,
        isAbsent: true,
        homeIdSnapshot: 5,
      });

      expect(generateRecipients).toHaveBeenCalledWith(
        occasion,
        transaction,
        [10],
      );

      expect(result.added).toEqual([
        {
          id: 101,
          fullData: 'Home A Anna Ivanova 1940-05-12',
        },
      ]);
    });

    test('does nothing when every eligible senior already has an active recipient', async () => {
      const transaction = { id: 'tx-3' };
      const occasion = { id: 20 };

      getSeniors.mockResolvedValue([
        { id: 10 },
        { id: 11 },
      ]);

      Recipient.findAll
        .mockResolvedValueOnce([
          { seniorId: 10 },
          { seniorId: 11 },
        ])
        .mockResolvedValueOnce([]);

      const result = await addRecipients(
        occasion,
        transaction,
      );

      expect(result).toEqual({
        added: [],
        returned: [],
      });

      expect(Recipient.update).not.toHaveBeenCalled();
      expect(generateRecipients).not.toHaveBeenCalled();
      expect(Recipient.bulkCreate).not.toHaveBeenCalled();
      expect(Occasion.increment).not.toHaveBeenCalled();
    });
  });

  describe('markAbsentRecipients', () => {
    test('marks recipients absent when their seniors are no longer eligible', async () => {
      const transaction = { id: 'tx-4' };
      const occasion = { id: 20 };

      getSeniors.mockResolvedValue([
        { id: 10, homeId: 5 },
        { id: 11, homeId: 6 },
      ]);

      Recipient.findAll
        .mockResolvedValueOnce([
          { seniorId: 10 },
          { seniorId: 12 },
        ])
        .mockResolvedValueOnce([
          {
            id: 201,
            fullNameSnapshot: 'Removed Senior',
            yearSnapshot: 1945,
            monthSnapshot: 7,
            daySnapshot: 2,
            snapshotHome: {
              homeName: 'Home A',
            },
          },
        ]);

      Recipient.update.mockResolvedValue([
        1,
        [{ id: 201 }],
      ]);

      const result = await markAbsentRecipients(
        occasion,
        transaction,
        5,
      );

      expect(Recipient.findAll.mock.calls[0][0].where).toEqual({
        occasionId: 20,
        isAbsent: false,
        homeIdSnapshot: 5,
      });

      expect(Recipient.update).toHaveBeenCalledWith(
        {
          isAbsent: true,
        },
        {
          where: {
            occasionId: 20,
            seniorId: {
              [Op.in]: [12],
            },
          },
          transaction,
          individualHooks: true,
          returning: true,
        },
      );

      expect(result).toEqual([
        {
          id: 201,
          fullData: 'Home A Removed Senior 1945-07-02',
        },
      ]);
    });

    test('does not update recipients when the active senior list is unchanged', async () => {
      const transaction = { id: 'tx-5' };
      const occasion = { id: 20 };

      getSeniors.mockResolvedValue([
        { id: 10 },
        { id: 11 },
      ]);

      Recipient.findAll.mockResolvedValue([
        { seniorId: 10 },
        { seniorId: 11 },
      ]);

      const result = await markAbsentRecipients(
        occasion,
        transaction,
      );

      expect(result).toEqual([]);
      expect(Recipient.update).not.toHaveBeenCalled();
      expect(Recipient.findAll).toHaveBeenCalledTimes(1);
    });
  });
});
