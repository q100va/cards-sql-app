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

const escapeLikeValue = jest.fn();

jest.unstable_mockModule(
  '../../controllers/ctrl-common-helpers.js',
  () => ({
    escapeLikeValue,
  }),
);

const {
  applyDateFilter,
  applyNumericFilter,
  applyStringFilter,
} = await import(
  '../../controllers/ctrl-apply-filter.js'
);

describe('ctrl-apply-filter', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    escapeLikeValue.mockImplementation((value) => `escaped:${value}`);
  });

  test('does nothing when a field has no filters', () => {
    const where = {};

    applyNumericFilter(where, {}, 'amount');
    applyStringFilter(where, {}, 'comment');
    applyDateFilter(where, {}, 'date');

    expect(where).toEqual({});
  });

  describe('applyNumericFilter', () => {
    test('applies a single numeric filter and converts its value to number', () => {
      const where = {};

      applyNumericFilter(
        where,
        {
          amount: [
            {
              matchMode: 'gte',
              value: '15',
            },
          ],
        },
        'amount',
      );

      expect(where).toEqual({
        amount: {
          [Op.gte]: 15,
        },
      });
    });

    test('applies an in filter with numeric conversion', () => {
      const where = {};

      applyNumericFilter(
        where,
        {
          status: [
            {
              matchMode: 'in',
              value: ['1', 2, '3'],
            },
          ],
        },
        'status',
      );

      expect(where).toEqual({
        status: {
          [Op.in]: [1, 2, 3],
        },
      });
    });

    test('combines multiple numeric filters with the selected logical operator', () => {
      const where = {};

      applyNumericFilter(
        where,
        {
          amount: [
            {
              matchMode: 'gte',
              value: 10,
              operator: 'or',
            },
            {
              matchMode: 'lte',
              value: 20,
            },
          ],
        },
        'amount',
      );

      expect(where).toEqual({
        amount: {
          [Op.or]: [
            {
              [Op.gte]: 10,
            },
            {
              [Op.lte]: 20,
            },
          ],
        },
      });
    });

    test('rejects invalid numeric values, match modes, and logical operators', () => {
      expect(() =>
        applyNumericFilter(
          {},
          {
            amount: [
              {
                matchMode: 'equals',
                value: 'abc',
              },
            ],
          },
          'amount',
        ),
      ).toThrow(CustomError);

      expect(() =>
        applyNumericFilter(
          {},
          {
            amount: [
              {
                matchMode: 'unknown',
                value: 10,
              },
            ],
          },
          'amount',
        ),
      ).toThrow(CustomError);

      expect(() =>
        applyNumericFilter(
          {},
          {
            amount: [
              {
                matchMode: 'gte',
                value: 10,
                operator: 'xor',
              },
              {
                matchMode: 'lte',
                value: 20,
              },
            ],
          },
          'amount',
        ),
      ).toThrow(CustomError);
    });
  });

  describe('applyStringFilter', () => {
    test('trims and escapes string values before applying wildcard matching', () => {
      const where = {};

      applyStringFilter(
        where,
        {
          comment: [
            {
              matchMode: 'contains',
              value: '  50% test  ',
            },
          ],
        },
        'comment',
      );

      expect(escapeLikeValue).toHaveBeenCalledWith('50% test');

      expect(where).toEqual({
        comment: {
          [Op.iLike]: '%escaped:50% test%',
        },
      });
    });

    test('combines multiple string filters and applies their individual match modes', () => {
      const where = {};

      applyStringFilter(
        where,
        {
          comment: [
            {
              matchMode: 'startsWith',
              value: 'Anna',
              operator: 'and',
            },
            {
              matchMode: 'endsWith',
              value: 'Ivanova',
            },
            {
              matchMode: 'notEquals',
              value: 'Blocked',
            },
          ],
        },
        'comment',
      );

      expect(where).toEqual({
        comment: {
          [Op.and]: [
            {
              [Op.iLike]: 'escaped:Anna%',
            },
            {
              [Op.iLike]: '%escaped:Ivanova',
            },
            {
              [Op.ne]: 'Blocked',
            },
          ],
        },
      });
    });

    test('rejects empty string values and unsupported match modes', () => {
      expect(() =>
        applyStringFilter(
          {},
          {
            comment: [
              {
                matchMode: 'contains',
                value: '   ',
              },
            ],
          },
          'comment',
        ),
      ).toThrow(CustomError);

      expect(() =>
        applyStringFilter(
          {},
          {
            comment: [
              {
                matchMode: 'unknown',
                value: 'text',
              },
            ],
          },
          'comment',
        ),
      ).toThrow(CustomError);
    });
  });

  describe('applyDateFilter', () => {
    test('builds a full-day range for dateIs', () => {
      const where = {};

      applyDateFilter(
        where,
        {
          date: [
            {
              matchMode: 'dateIs',
              value: '2026-11-10',
            },
          ],
        },
        'date',
      );

      const start = new Date('2026-11-10');
      start.setHours(0, 0, 0, 0);

      const end = new Date('2026-11-10');
      end.setHours(23, 59, 59, 999);

      expect(where).toEqual({
        createdAt: {
          [Op.between]: [start, end],
        },
      });
    });

    test('combines dateBefore and dateAfter filters', () => {
      const where = {};

      applyDateFilter(
        where,
        {
          date: [
            {
              matchMode: 'dateAfter',
              value: '2026-01-01',
              operator: 'and',
            },
            {
              matchMode: 'dateBefore',
              value: '2026-12-31',
            },
          ],
        },
        'date',
      );

      expect(where).toEqual({
        createdAt: {
          [Op.and]: [
            {
              [Op.gt]: new Date('2026-01-01'),
            },
            {
              [Op.lt]: new Date('2026-12-31'),
            },
          ],
        },
      });
    });

    test('rejects invalid dates and unsupported date match modes', () => {
      expect(() =>
        applyDateFilter(
          {},
          {
            date: [
              {
                matchMode: 'dateIs',
                value: 'not-a-date',
              },
            ],
          },
          'date',
        ),
      ).toThrow(CustomError);

      expect(() =>
        applyDateFilter(
          {},
          {
            date: [
              {
                matchMode: 'unknown',
                value: '2026-11-10',
              },
            ],
          },
          'date',
        ),
      ).toThrow(CustomError);
    });
  });

  test('rejects unsupported filter fields', () => {
    let error;

    try {
      applyNumericFilter(
        {},
        {
          unknownField: [
            {
              matchMode: 'equals',
              value: 1,
            },
          ],
        },
        'unknownField',
      );
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(CustomError);
    expect(error.code).toBe('ERRORS.INVALID_FILTER_VALUE');
    expect(error.statusCode ?? error.status).toBe(400);
  });
});
