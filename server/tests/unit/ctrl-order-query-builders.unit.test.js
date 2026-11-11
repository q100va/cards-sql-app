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
  OCCASION_TYPE,
  OCCASION_TYPES,
} from '../../../shared/dist/constants/occasions.js';
import {
  INSTITUTE_CATEGORIES,
} from '../../../shared/dist/constants/volunteers.js';

const User = { modelName: 'User' };
const Volunteer = { modelName: 'Volunteer' };
const VolunteerContact = { modelName: 'VolunteerContact' };
const VolunteerInstitute = { modelName: 'VolunteerInstitute' };
const Occasion = { modelName: 'Occasion' };

const escapeLikeValue = jest.fn();

const applyDateFilter = jest.fn();
const applyNumericFilter = jest.fn();
const applyStringFilter = jest.fn();

jest.unstable_mockModule('../../models/index.js', () => ({
  User,
  Volunteer,
  VolunteerContact,
  VolunteerInstitute,
  Occasion,
}));

jest.unstable_mockModule(
  '../../controllers/ctrl-common-helpers.js',
  () => ({
    escapeLikeValue,
  }),
);

jest.unstable_mockModule(
  '../../controllers/ctrl-apply-filter.js',
  () => ({
    applyDateFilter,
    applyNumericFilter,
    applyStringFilter,
  }),
);

const {
  applyOrderFilters,
  buildOrderSort,
  dictToOptions,
} = await import(
  '../../controllers/ctrl-order-query-builders.js'
);

describe('ctrl-order-query-builders', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    escapeLikeValue.mockImplementation((value) => `escaped:${value}`);
  });

  describe('buildOrderSort', () => {
    test('uses createdAt DESC by default', () => {
      expect(buildOrderSort()).toEqual([
        ['createdAt', 'DESC'],
        ['id', 'ASC'],
      ]);
    });

    test('builds ascending sort for an included model field', () => {
      expect(buildOrderSort('userName', 1, 'en')).toEqual([
        [
          {
            model: User,
            as: 'user',
          },
          'userName',
          'ASC',
        ],
        ['id', 'ASC'],
      ]);
    });

    test('builds translated status sort expression', () => {
      const result = buildOrderSort('status', 1, 'ru');

      expect(result).toHaveLength(2);
      expect(result[0][0]).toEqual(
        expect.objectContaining({
          val: expect.stringContaining('CASE "order"."status"'),
        }),
      );
      expect(result[0][0].val).toContain('ELSE 999');
      expect(result[0][1]).toBe('ASC');
      expect(result[1]).toEqual(['id', 'ASC']);
    });

    test('sorts occasion name by type, month, year, and id', () => {
      const result = buildOrderSort(
        'occasionName',
        -1,
        'en',
      );

      expect(result).toHaveLength(4);

      expect(result[0][0]).toEqual(
        expect.objectContaining({
          val: expect.stringContaining('CASE "occasion"."type"'),
        }),
      );

      expect(result[0][1]).toBe('DESC');

      expect(result[1][0]).toEqual(
        expect.objectContaining({
          val: expect.stringContaining('CASE "occasion"."month"'),
        }),
      );

      expect(result[1][1]).toBe('DESC');

      expect(result[2]).toEqual([
        {
          model: Occasion,
          as: 'occasion',
        },
        'year',
        'DESC',
      ]);

      expect(result[3]).toEqual(['id', 'ASC']);
    });
  });

  describe('applyOrderFilters', () => {
    test('delegates standard fields to the shared filter helpers', () => {
      const where = {};
      const filters = {
        amount: [{ value: 10 }],
        comment: [{ value: 'test' }],
        userId: [{ value: 5 }],
        status: [{ value: 1 }],
        source: [{ value: 2 }],
        date: [{ value: '2026-01-01' }],
      };

      applyOrderFilters(where, filters, '');

      expect(applyNumericFilter).toHaveBeenNthCalledWith(
        1,
        where,
        filters,
        'amount',
      );

      expect(applyStringFilter).toHaveBeenCalledWith(
        where,
        filters,
        'comment',
      );

      expect(applyNumericFilter).toHaveBeenNthCalledWith(
        2,
        where,
        filters,
        'userId',
      );

      expect(applyNumericFilter).toHaveBeenNthCalledWith(
        3,
        where,
        filters,
        'status',
      );

      expect(applyNumericFilter).toHaveBeenNthCalledWith(
        4,
        where,
        filters,
        'source',
      );

      expect(applyDateFilter).toHaveBeenCalledWith(
        where,
        filters,
        'date',
      );
    });

    test('builds multi-word volunteer and contact searches', () => {
      const where = {};

      applyOrderFilters(
        where,
        {
          volunteerName: [{ value: 'Anna Petrov' }],
          contact: [{ value: '555 email' }],
        },
        '',
      );

      expect(where[Op.and]).toEqual([
        {
          [Op.or]: [
            {
              '$volunteer.firstName$': {
                [Op.iLike]: '%escaped:Anna%',
              },
            },
            {
              '$volunteer.lastName$': {
                [Op.iLike]: '%escaped:Anna%',
              },
            },
            {
              '$volunteer.patronymic$': {
                [Op.iLike]: '%escaped:Anna%',
              },
            },
          ],
        },
        {
          [Op.or]: [
            {
              '$volunteer.firstName$': {
                [Op.iLike]: '%escaped:Petrov%',
              },
            },
            {
              '$volunteer.lastName$': {
                [Op.iLike]: '%escaped:Petrov%',
              },
            },
            {
              '$volunteer.patronymic$': {
                [Op.iLike]: '%escaped:Petrov%',
              },
            },
          ],
        },
        {
          [Op.or]: [
            {
              '$contact.content$': {
                [Op.iLike]: '%escaped:555%',
              },
            },
            {
              '$contact.type$': {
                [Op.iLike]: '%escaped:555%',
              },
            },
          ],
        },
        {
          [Op.or]: [
            {
              '$contact.content$': {
                [Op.iLike]: '%escaped:email%',
              },
            },
            {
              '$contact.type$': {
                [Op.iLike]: '%escaped:email%',
              },
            },
          ],
        },
      ]);
    });

    test('builds a separate institute-name condition for every search word', () => {
      const where = {};

      applyOrderFilters(
        where,
        {
          instituteName: [
            {
              value: 'Alpha Beta',
            },
          ],
        },
        '',
      );

      expect(where[Op.and]).toEqual([
        {
          [Op.or]: [
            {
              '$institute.instituteName$': {
                [Op.iLike]: '%escaped:Alpha%',
              },
            },
          ],
        },
        {
          [Op.or]: [
            {
              '$institute.instituteName$': {
                [Op.iLike]: '%escaped:Beta%',
              },
            },
          ],
        },
      ]);
    });

    test('keeps valid occasion nodes and ignores incomplete birthday nodes', () => {
      const where = {};

      const otherType = OCCASION_TYPES.find(
        (item) => item.id !== OCCASION_TYPE.BIRTHDAY,
      ).id;

      applyOrderFilters(
        where,
        {
          occasionName: [
            {
              value: [
                {
                  type: OCCASION_TYPE.BIRTHDAY,
                  month: null,
                  year: 2027,
                },
                {
                  type: OCCASION_TYPE.BIRTHDAY,
                  month: 5,
                  year: 2027,
                },
                {
                  type: otherType,
                  month: null,
                  year: 2027,
                },
                {
                  type: otherType,
                  month: 1,
                  year: null,
                },
              ],
            },
          ],
        },
        '',
      );

      expect(where[Op.and]).toEqual([
        {
          [Op.or]: [
            {
              [Op.and]: [
                {
                  '$occasion.type$': OCCASION_TYPE.BIRTHDAY,
                },
                {
                  '$occasion.month$': 5,
                },
                {
                  '$occasion.year$': 2027,
                },
              ],
            },
            {
              [Op.and]: [
                {
                  '$occasion.type$': otherType,
                },
                {
                  '$occasion.month$': null,
                },
                {
                  '$occasion.year$': 2027,
                },
              ],
            },
          ],
        },
      ]);
    });

    test('global search covers order and related fields including institute category', () => {
      const where = {};

      const [, category] = Object.entries(
        INSTITUTE_CATEGORIES,
      )[0];

      const search = category.en;

      const matchingCategoryIds = Object.entries(
        INSTITUTE_CATEGORIES,
      )
        .filter(
          ([, item]) =>
            item.en
              .toLocaleLowerCase()
              .includes(search.toLocaleLowerCase()) ||
            item.ru
              .toLocaleLowerCase()
              .includes(search.toLocaleLowerCase()),
        )
        .map(([id]) => Number(id));

      applyOrderFilters(
        where,
        {},
        search,
      );

      const condition = where[Op.and][0][Op.or];

      expect(condition).toEqual(
        expect.arrayContaining([
          {
            comment: {
              [Op.iLike]: `%escaped:${search}%`,
            },
          },
          {
            '$user.userName$': {
              [Op.iLike]: `%escaped:${search}%`,
            },
          },
          {
            '$volunteer.firstName$': {
              [Op.iLike]: `%escaped:${search}%`,
            },
          },
          {
            '$volunteer.lastName$': {
              [Op.iLike]: `%escaped:${search}%`,
            },
          },
          {
            '$institute.instituteName$': {
              [Op.iLike]: `%escaped:${search}%`,
            },
          },
          {
            '$institute.category$': {
              [Op.in]: matchingCategoryIds,
            },
          },
          {
            '$contact.content$': {
              [Op.iLike]: `%escaped:${search}%`,
            },
          },
        ]),
      );
    });
  });

  describe('dictToOptions', () => {
    test('converts a localized dictionary to alphabetically sorted options', () => {
      const dict = {
        1: {
          en: 'Zulu',
          ru: 'Яблоко',
        },
        2: {
          en: 'Alpha',
          ru: 'Абрикос',
        },
      };

      expect(dictToOptions(dict, 'en')).toEqual([
        {
          label: 'Alpha',
          value: 2,
        },
        {
          label: 'Zulu',
          value: 1,
        },
      ]);
    });
  });
});
