/** @jest-environment node */

import {
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';

const fn = jest.fn();
const literal = jest.fn();
const where = jest.fn();

jest.unstable_mockModule('sequelize', () => ({
  fn,
  literal,
  where,
  Op: {},
}));

const {
  buildFullName,
  escapeLikeValue,
  getByBirthMonth,
  getCategory,
  getSpecialComment,
} = await import(
  '../../controllers/ctrl-common-helpers.js'
);

describe('ctrl-common-helpers', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    fn.mockImplementation((...args) => ({
      type: 'fn',
      args,
    }));

    literal.mockImplementation((value) => ({
      type: 'literal',
      value,
    }));

    where.mockImplementation((left, right) => ({
      type: 'where',
      left,
      right,
    }));
  });

  describe('getByBirthMonth', () => {
    test('builds a birth-month Sequelize condition', () => {
      expect(getByBirthMonth(5)).toEqual({
        type: 'where',
        left: {
          type: 'fn',
          args: [
            'EXTRACT',
            {
              type: 'literal',
              value: 'MONTH FROM "birthDate"',
            },
          ],
        },
        right: 5,
      });

      expect(literal).toHaveBeenCalledWith(
        'MONTH FROM "birthDate"',
      );

      expect(fn).toHaveBeenCalledWith(
        'EXTRACT',
        {
          type: 'literal',
          value: 'MONTH FROM "birthDate"',
        },
      );
    });
  });

  describe('buildFullName', () => {
    test('does not add a gender comment when male gender is clear from the name', () => {
      expect(
        buildFullName({
          lastName: 'Иванов',
          firstName: 'Иван',
          patronymic: 'Петрович',
          gender: 'male',
        }),
      ).toBe('Иванов Иван Петрович');
    });

    test('does not add a gender comment when female gender is clear from the name', () => {
      expect(
        buildFullName({
          lastName: 'Иванова',
          firstName: 'Анна',
          patronymic: 'Петровна',
          gender: 'female',
        }),
      ).toBe('Иванова Анна Петровна');
    });

    test('adds explicit gender comment when the name cannot reliably determine gender', () => {
      expect(
        buildFullName({
          lastName: 'Иванова',
          firstName: 'Алекс',
          patronymic: 'Петрович',
          gender: 'female',
        }),
      ).toBe('Иванова Алекс Петрович /жен./');

      expect(
        buildFullName({
          lastName: null,
          firstName: 'Саша',
          patronymic: null,
          gender: 'male',
        }),
      ).toBe('Саша /муж./');
    });
  });

  describe('getCategory', () => {
    test('builds category from home type, age group, and gender', () => {
      expect(
        getCategory(
          {
            gender: 'male',
            personalNoAddr: false,
            home: {
              specialHome: false,
              noAddress: false,
            },
          },
          1988,
          2027,
        ),
      ).toBe('gen_young_male');

      expect(
        getCategory(
          {
            gender: 'female',
            personalNoAddr: false,
            home: {
              specialHome: false,
              noAddress: false,
            },
          },
          1977,
          2027,
        ),
      ).toBe('gen_middle_female');

      expect(
        getCategory(
          {
            gender: 'male',
            personalNoAddr: true,
            home: {
              specialHome: false,
              noAddress: false,
            },
          },
          1940,
          2027,
        ),
      ).toBe('ment_old_male');

      expect(
        getCategory(
          {
            gender: 'female',
            personalNoAddr: false,
            home: {
              specialHome: true,
              noAddress: false,
            },
          },
          1940,
          2027,
        ),
      ).toBe('spec_old_female');
    });
  });

  describe('getSpecialComment', () => {
    test('returns anniversary comment for ages divisible by five', () => {
      expect(
        getSpecialComment(1947, 2027),
      ).toBe('Юбилей 80 лет!');

      expect(
        getSpecialComment(1932, 2027),
      ).toBe('Юбилей 95 лет!');
    });

    test('uses the correct Russian age word for people older than 90', () => {
      expect(getSpecialComment(1936, 2027)).toBe('91 год!');
      expect(getSpecialComment(1935, 2027)).toBe('92 года!');
      expect(getSpecialComment(1933, 2027)).toBe('94 года!');
      expect(getSpecialComment(1931, 2027)).toBe('96 лет!');
    });

    test('returns an empty string for a regular non-anniversary age', () => {
      expect(
        getSpecialComment(1969, 2027),
      ).toBe('');
    });
  });

  describe('escapeLikeValue', () => {
    test('escapes SQL LIKE wildcard characters', () => {
      expect(
        escapeLikeValue('50%_test\\value'),
      ).toBe('50\\%\\_test\\\\value');

      expect(
        escapeLikeValue('normal text'),
      ).toBe('normal text');
    });
  });
});
