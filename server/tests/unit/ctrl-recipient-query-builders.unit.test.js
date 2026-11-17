/** @jest-environment node */

import {
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { Op } from 'sequelize';

const Region = {
  modelName: 'Region',
};

const Home = {
  modelName: 'Home',
};

const escapeLikeValue = jest.fn();

jest.unstable_mockModule('../../models/index.js', () => ({
  Region,
  Home,
}));

jest.unstable_mockModule(
  '../../controllers/ctrl-common-helpers.js',
  () => ({
    escapeLikeValue,
  }),
);

const {
  buildGlobalSearchWhere,
  buildRecipientOrderField,
} = await import(
  '../../controllers/ctrl-recipient-query-builders.js'
);

describe('ctrl-recipient-query-builders', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    escapeLikeValue.mockImplementation((value) => `escaped:${value}`);
  });

  describe('buildRecipientOrderField', () => {
    test('maps regular recipient fields to snapshot columns', () => {
      expect(buildRecipientOrderField('fullName')).toBe('fullNameSnapshot');
      expect(buildRecipientOrderField('birthDay')).toBe('daySnapshot');
      expect(buildRecipientOrderField('plusAmount')).toBe('plusAmount');
    });

    test('maps related home and region fields to association paths', () => {
      expect(buildRecipientOrderField('regionName')).toEqual([
        {
          model: Region,
          as: 'snapshotRegion',
        },
        'name',
      ]);

      expect(buildRecipientOrderField('homeName')).toEqual([
        {
          model: Home,
          as: 'snapshotHome',
        },
        'homeName',
      ]);
    });

    test('falls back to homeIdSnapshot for an unknown field', () => {
      expect(
        buildRecipientOrderField('unknown'),
      ).toBe('homeIdSnapshot');
    });
  });

  describe('buildGlobalSearchWhere', () => {
    test('returns null for empty search and otherwise searches all supported fields', () => {
      expect(buildGlobalSearchWhere('   ')).toBeNull();

      const result = buildGlobalSearchWhere(' Anna ');

      expect(escapeLikeValue).toHaveBeenCalledWith('Anna');

      expect(result).toEqual({
        [Op.or]: [
          {
            fullNameSnapshot: {
              [Op.iLike]: '%escaped:Anna%',
            },
          },
          {
            addressSnapshot: {
              [Op.iLike]: '%escaped:Anna%',
            },
          },
          {
            specialComment: {
              [Op.iLike]: '%escaped:Anna%',
            },
          },
          {
            category: {
              [Op.iLike]: '%escaped:Anna%',
            },
          },
          {
            '$snapshotHome.homeName$': {
              [Op.iLike]: '%escaped:Anna%',
            },
          },
          {
            '$snapshotRegion.name$': {
              [Op.iLike]: '%escaped:Anna%',
            },
          },
        ],
      });
    });
  });
});
