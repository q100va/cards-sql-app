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

const District = {
  modelName: 'District',
  findOne: jest.fn(),
};

const Home = {
  modelName: 'Home',
};

const HomeAddress = {
  modelName: 'HomeAddress',
};

const Locality = {
  modelName: 'Locality',
  findOne: jest.fn(),
};

const Region = {
  modelName: 'Region',
  findOne: jest.fn(),
};

jest.unstable_mockModule('../../models/index.js', () => ({
  District,
  Home,
  HomeAddress,
  Locality,
  Region,
}));

const {
  betweenDatesInclusive,
  buildAddressOwnerIdSubquery,
  buildContactOwnerIdSubquery,
  buildOrderFor,
  buildSearchContentWhere,
} = await import(
  '../../controllers/ctrl-owner-query-builders.js'
);

describe('ctrl-owner-query-builders', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('buildOrderFor', () => {
    test('uses the configured default sort when no sort is provided', () => {
      expect(buildOrderFor('user')).toEqual([
        ['userName', 'ASC'],
      ]);

      expect(buildOrderFor('home', [])).toEqual([
        ['homeName', 'ASC'],
      ]);
    });

    test('builds association-path sorting for home region name', () => {
      expect(
        buildOrderFor(
          'home',
          [
            {
              field: 'regionName',
              direction: 'ASC',
            },
          ],
        ),
      ).toEqual([
        [
          {
            model: HomeAddress,
            as: 'activeAddress',
          },
          {
            model: Region,
            as: 'region',
          },
          'name',
          'ASC',
        ],
      ]);
    });

    test('builds literal sorting and normalizes direction', () => {
      const result = buildOrderFor(
        'volunteer',
        [
          {
            field: 'dateOfLastOrder',
            direction: 'desc',
          },
        ],
      );

      expect(result).toHaveLength(1);
      expect(result[0][0].val).toContain(
        'SELECT MAX(o."createdAt")',
      );
      expect(result[0][0].val).toContain(
        'o."volunteerId" = "volunteer"."id"',
      );
      expect(result[0][1]).toBe('DESC');
    });

    test('throws 500 for an unsupported owner kind', () => {
      let error;

      try {
        buildOrderFor('unknown', []);
      } catch (caughtError) {
        error = caughtError;
      }

      expect(error).toBeInstanceOf(CustomError);
      expect(error.code).toBe('ERRORS.UNSUPPORTED_TYPE');
      expect(error.statusCode ?? error.status).toBe(500);
    });
  });

  describe('betweenDatesInclusive', () => {
    test('uses an exclusive next-day upper bound', () => {
      const result = betweenDatesInclusive([
        '2026-11-01',
        '2026-11-10',
      ]);

      expect(result[Op.gte]).toEqual(
        new Date('2026-11-01'),
      );

      expect(result[Op.lt]).toEqual(
        new Date('2026-11-11'),
      );
    });
  });

  describe('buildSearchContentWhere', () => {
    test('builds OR or AND word clauses depending on exact mode', () => {
      expect(
        buildSearchContentWhere(
          ' Anna   Ivan ',
          false,
        ),
      ).toEqual({
        [Op.or]: [
          {
            content: {
              [Op.iLike]: '%Anna%',
            },
          },
          {
            content: {
              [Op.iLike]: '%Ivan%',
            },
          },
        ],
      });

      expect(
        buildSearchContentWhere(
          'Anna Ivan',
          true,
        ),
      ).toEqual({
        [Op.and]: [
          {
            content: {
              [Op.iLike]: '%Anna%',
            },
          },
          {
            content: {
              [Op.iLike]: '%Ivan%',
            },
          },
        ],
      });
    });
  });

  describe('buildContactOwnerIdSubquery', () => {
    test('builds a weak contact subquery for any selected type', () => {
      const result = buildContactOwnerIdSubquery(
        'volunteer',
        ['email', 'phone'],
        false,
        false,
      );

      expect(result.val).toContain(
        'SELECT DISTINCT "volunteerId" FROM "volunteer-contacts"',
      );

      expect(result.val).toContain(
        '"isRestricted" = false AND',
      );

      expect(result.val).toContain(
        "type IN ('email', 'phone')",
      );

      expect(result.val).not.toContain('GROUP BY');
      expect(result.val).not.toContain('HAVING');
    });

    test('builds a strong subquery requiring every selected contact type', () => {
      const result = buildContactOwnerIdSubquery(
        'partner',
        ['email', 'phone'],
        true,
        true,
      );

      expect(result.val).toContain(
        'SELECT DISTINCT "partnerId" FROM "partner-contacts"',
      );

      expect(result.val).toContain(
        'GROUP BY "partnerId"',
      );

      expect(result.val).toContain(
        'HAVING COUNT(DISTINCT type) = 2',
      );

      expect(result.val).not.toContain(
        '"isRestricted" = false',
      );
    });
  });

  describe('buildAddressOwnerIdSubquery', () => {
    test('drops selected parent toponyms when a locality already represents them', async () => {
      Locality.findOne.mockResolvedValue({
        districtId: 20,
      });

      District.findOne.mockResolvedValue({
        regionId: 10,
      });

      Region.findOne.mockResolvedValue({
        countryId: 1,
      });

      const result = await buildAddressOwnerIdSubquery(
        'partner',
        {
          countries: [1],
          regions: [10],
          districts: [20],
          localities: [30],
        },
        false,
        false,
      );

      expect(Locality.findOne).toHaveBeenCalledWith({
        where: {
          id: 30,
        },
        attributes: ['districtId'],
        raw: true,
      });

      expect(District.findOne).toHaveBeenCalledWith({
        where: {
          id: 20,
        },
        attributes: ['regionId'],
        raw: true,
      });

      expect(Region.findOne).toHaveBeenCalledWith({
        where: {
          id: 10,
        },
        attributes: ['countryId'],
        raw: true,
      });

      expect(result.val).toContain(
        'SELECT DISTINCT "partnerId" FROM "partner-addresses"',
      );

      expect(result.val).toContain(
        '"localityId" IN (\'30\')',
      );

      expect(result.val).not.toContain(
        '"districtId" IN',
      );

      expect(result.val).not.toContain(
        '"regionId"   IN',
      );

      expect(result.val).not.toContain(
        '"countryId"  IN',
      );
    });

    test('uses 1=0 when no address filters are selected', async () => {
      const result = await buildAddressOwnerIdSubquery(
        'user',
        {},
        false,
        false,
      );

      expect(result.val).toContain(
        'SELECT DISTINCT "userId" FROM "user-addresses"',
      );

      expect(result.val).toContain(
        '"isRestricted" = false AND',
      );

      expect(result.val).toContain('(1=0)');

      expect(Locality.findOne).not.toHaveBeenCalled();
      expect(District.findOne).not.toHaveBeenCalled();
      expect(Region.findOne).not.toHaveBeenCalled();
    });

    test('builds strict address mode requiring every selected value', async () => {
      const result = await buildAddressOwnerIdSubquery(
        'user',
        {
          countries: [1, 2],
        },
        true,
        true,
      );

      expect(result.val).toContain(
        '"countryId"  IN (\'1\', \'2\')',
      );

      expect(result.val).toContain(
        'GROUP BY "userId"',
      );

      expect(result.val).toContain('HAVING');

      expect(result.val).toContain(
        '"countryId" IN (\'1\', \'2\')',
      );

      expect(result.val).toContain(
        ') = 2',
      );

      expect(result.val).not.toContain(
        '"isRestricted" = false',
      );
    });
  });
});
