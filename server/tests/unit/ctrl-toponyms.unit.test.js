/** @jest-environment node */

import { describe, expect, jest, test, beforeEach } from '@jest/globals';

import { Op } from 'sequelize';

import CustomError from '../../shared/customError.js';

const Country = {
  count: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
};

const Region = {
  count: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
};

const District = {
  count: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
};

const Locality = {
  count: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
};

const HomeAddress = {
  count: jest.fn(),
  update: jest.fn(),
};

const UserAddress = {
  count: jest.fn(),
  update: jest.fn(),
};

const PartnerAddress = {
  count: jest.fn(),
  update: jest.fn(),
};

const VolunteerAddress = {
  count: jest.fn(),
  update: jest.fn(),
};

jest.unstable_mockModule('../../models/index.js', () =>
({
  Country,
  Region,
  District,
  Locality,
  HomeAddress,
  UserAddress,
  PartnerAddress,
  VolunteerAddress,
}));

const ctrl = await import('../../controllers/ctrl-toponyms.js');

describe('ctrl-toponyms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findDuplicate', () => {
    test('scopes a region duplicate by countryId and excludes the current id', async () => {
      Region.count.mockResolvedValue(2);

      const result = await ctrl.findDuplicate({
        type: 'region',
        name: 'Москва',
        countryId: 1,
        id: 9,
      });

      expect(Region.count).toHaveBeenCalledTimes(1);

      const { where } = Region.count.mock.calls[0][0];

      expect(where.name).toEqual({ [Op.iLike]: 'Москва' });

      expect(where.countryId).toBe(1);

      expect(where.id).toEqual({ [Op.ne]: 9 });

      expect(where).not.toHaveProperty('isRestricted');

      expect(result).toBe(2);
    });

    test('checks a country duplicate without a parent scope', async () => {
      Country.count.mockResolvedValue(1);

      const result = await ctrl.findDuplicate({
        type: 'country',
        name: 'Estonia',
      });

      expect(Country.count).toHaveBeenCalledWith({ where: { name: { [Op.iLike]: 'Estonia' } } });

      expect(result).toBe(1);
    });

    test('throws 422 when a required parent id is missing', async () => {
      let error;

      try {
        await ctrl.findDuplicate({
          type: 'region',
          name: 'Москва',
        });
      } catch (caughtError) {
        error = caughtError;
      }

      expect(error).toBeInstanceOf(CustomError);

      expect(error.code).toBe('ERRORS.VALIDATION');

      expect(error.statusCode ?? error.status).toBe(422);

      expect(error.message).toMatch(/^Error in findDuplicate \(Москва, region\):/);

      expect(Region.count).not.toHaveBeenCalled();
    });
  });

  describe('countToponymDependencies', () => {
    test('counts active addresses and child toponyms', async () => {
      UserAddress.count.mockResolvedValue(1);

      HomeAddress.count.mockResolvedValue(2);

      PartnerAddress.count.mockResolvedValue(3);

      VolunteerAddress.count.mockResolvedValue(4);

      District.count.mockResolvedValue(5);

      const transaction = { id: 'tx-1' };

      const result = await ctrl.countToponymDependencies({
        type: 'region',
        id: 7,
        destroy: false,
      }, ctrl.MAP.region, transaction);

      expect(result).toBe(15);

      for (const model of [UserAddress, HomeAddress, PartnerAddress, VolunteerAddress]) {
        expect(model.count).toHaveBeenCalledWith({
          where: {
            isRestricted: false,
            regionId: 7,
          },
          transaction,
        });
      }

      expect(District.count).toHaveBeenCalledWith({
        where: {
          isRestricted: false,
          regionId: 7,
        },
        transaction,
      });
    });

    test('includes restricted dependencies when destroy is true', async () => {
      UserAddress.count.mockResolvedValue(0);

      HomeAddress.count.mockResolvedValue(0);

      PartnerAddress.count.mockResolvedValue(0);

      VolunteerAddress.count.mockResolvedValue(0);

      District.count.mockResolvedValue(0);

      const transaction = { id: 'tx-2' };

      await ctrl.countToponymDependencies({
        type: 'region',
        id: 7,
        destroy: true,
      }, ctrl.MAP.region, transaction);

      expect(UserAddress.count).toHaveBeenCalledWith({
        where: { regionId: 7 },
        transaction,
      });

      expect(District.count).toHaveBeenCalledWith({
        where: { regionId: 7 },
        transaction,
      });
    });
  });

  describe('addDefaultAddressParams', () => {
    test('extracts locality parent ids and removes raw nested id fields', () => {
      const raw = {
        id: 5,
        name: 'Москва',
        'district.id': 33,
        'district.region.id': 7,
        'district.region.country.id': 1,
      };

      const result = ctrl.addDefaultAddressParams(raw, 'locality');

      expect(result.defaultAddressParams).toEqual({
        countryId: 1,
        regionId: 7,
        districtId: 33,
        localityId: 5,
      });

      expect(result['district.id']).toBeUndefined();

      expect(result['district.region.id']).toBeUndefined();

      expect(result['district.region.country.id']).toBeUndefined();

      expect(result.id).toBe(5);
    });
  });

  describe('addParentsNames', () => {
    test('extracts district parent names and removes raw nested fields', () => {
      const raw = {
        id: 3,
        name: 'Some',
        'region.name': 'Reg',
        'region.country.name': 'Country',
      };

      const result = ctrl.addParentsNames(raw, 'district');

      expect(result.regionName).toBe('Reg');

      expect(result.countryName).toBe('Country');

      expect(result['region.name']).toBeUndefined();

      expect(result['region.country.name']).toBeUndefined();
    });
  });

  describe('getToponymById', () => {
    test('loads a region and adds default address parameters', async () => {
      Region.findOne.mockResolvedValue({
        id: 9,
        name: 'Region',
        'country.id': 1,
      });

      const result = await ctrl.getToponymById(9, 'region');

      expect(Region.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          id: 9,
          isRestricted: false,
        },
        attributes: expect.any(Array),
        include: expect.any(Array),
        raw: true,
      }));

      expect(result.defaultAddressParams).toEqual({
        countryId: 1,
        regionId: 9,
        districtId: null,
        localityId: null,
      });
    });

    test('throws 404 when the toponym does not exist', async () => {
      Region.findOne.mockResolvedValue(null);

      await expect(ctrl.getToponymById(99, 'region')).rejects.toMatchObject({
        code: 'ERRORS.DATA_NOT_FOUND',
      });
    });
  });

  describe('norm', () => {
    test('normalizes NFC, trims, and lowercases', () => {
      expect(ctrl.norm('  E\u0301STONIA  ')).toBe('éstonia');
    });
  });

  describe('MAP_POPULATE.country', () => {
    test('preprocessRow normalizes the country name', () => {
      const result = ctrl.MAP_POPULATE.country.preprocessRow({
        name: '  Алёшкино  ',
        source: 'import',
      });

      expect(result).toEqual({
        name: 'Алешкино',
        source: 'import',
      });
    });

    test('buildPayload returns a single country record', () => {
      const result = ctrl.MAP_POPULATE.country.buildPayload({
        name: 'Estonia',
        shortName: 'EE',
      });

      expect(result).toEqual({ name: 'Estonia' });
    });

    test('findConflicts returns names already present in the database', async () => {
      Country.findAll.mockResolvedValue([{ name: 'Estonia' }]);

      const result = await ctrl.MAP_POPULATE.country.findConflicts([{ name: 'Estonia' }, { name: 'Latvia' }]);

      expect(Country.findAll).toHaveBeenCalledWith(expect.objectContaining({
        attributes: ['name'],
        where: expect.anything(),
        raw: true,
      }));

      expect(result).toEqual(['Estonia']);
    });
  });

  describe('MAP_POPULATE.region', () => {
    test('resolveParents creates a country lookup map', async () => {
      Country.findAll.mockResolvedValue([
        {
          id: 1,
          name: 'Россия',
        },
      ]);

      const parents = await ctrl.MAP_POPULATE.region.resolveParents([{ country: 'Россия' }]);

      expect(parents.countryByLowerName.get('россия')).toEqual({
        id: 1,
        name: 'Россия',
      });

      expect(Country.findAll).toHaveBeenCalledWith(expect.objectContaining({
        attributes: ['id', 'name'],
        where: expect.anything(),
        raw: true,
      }));
    });

    test('findMissingParents returns unique missing country names', () => {
      const parents = {
        countryByLowerName: new Map([
          [
            'россия',
            {
              id: 1,
              name: 'Россия',
            },
          ],
        ]),
      };

      const result = ctrl.MAP_POPULATE.region.findMissingParents(
        [{ country: 'Россия' }, { country: 'Беларусь' }, { country: 'Беларусь' }],
        parents
      );

      expect(result).toEqual(['Беларусь']);
    });

    test('buildPayload uses the resolved country id', () => {
      const parents = {
        countryByLowerName: new Map([
          [
            'россия',
            {
              id: 7,
              name: 'Россия',
            },
          ],
        ]),
      };

      const result = ctrl.MAP_POPULATE.region.buildPayload({
        name: 'Москва',
        shortName: 'Мск.',
        country: 'Россия',
      }, parents);

      expect(result).toEqual({
        name: 'Москва',
        shortName: 'Мск.',
        countryId: 7,
      });
    });
  });

  describe('MAP_POPULATE.locality', () => {
    test('resolveParents builds region and district lookup maps', async () => {
      Region.findAll.mockResolvedValue([
        {
          id: 1,
          name: 'Москва',
        },
      ]);

      District.findAll.mockResolvedValue([
        {
          id: 10,
          name: 'Тверской район',
          regionId: 1,
        },
      ]);

      const parents = await ctrl.MAP_POPULATE.locality.resolveParents([
        {
          region: 'Москва',
          districtFullName: 'Тверской район',
        },
      ]);

      expect(parents.regionByLowerName.get('москва')).toEqual({
        id: 1,
        name: 'Москва',
      });

      expect(parents.districtByKey.get('1|тверской район')).toEqual({
        id: 10,
        name: 'Тверской район',
        regionId: 1,
      });
    });

    test('resolveParents throws 422 when a region cannot be resolved', async () => {
      Region.findAll.mockResolvedValue([]);

      await expect(ctrl.MAP_POPULATE.locality.resolveParents([
        {
          region: 'Неизвестный регион',
          districtFullName: 'Район',
        },
      ])).rejects.toMatchObject({ code: 'ERRORS.TOPONYM.BULK_PARENT_NOT_FOUND' });

      expect(District.findAll).not.toHaveBeenCalled();
    });

    test('findConflicts groups localities by district', async () => {
      const parents = {
        regionByLowerName: new Map([
          [
            'москва',
            {
              id: 1,
              name: 'Москва',
            },
          ],
        ]),
        districtByKey: new Map([
          [
            '1|тверской район',
            {
              id: 10,
              name: 'Тверской район',
              regionId: 1,
            },
          ],
        ]),
      };

      Locality.findAll.mockResolvedValue([
        {
          name: 'Москва',
          'district.name': 'Тверской район',
          'district.region.name': 'Москва',
        },
      ]);

      const result = await ctrl.MAP_POPULATE.locality.findConflicts([
        {
          name: 'Москва',
          region: 'Москва',
          districtFullName: 'Тверской район',
        },
      ], parents);

      expect(Locality.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ districtId: 10 }),
        include: expect.any(Array),
        raw: true,
      }));

      expect(result).toEqual(['Москва (Тверской район, Москва)']);
    });
  });

  describe('markAddressesUnrecoverable', () => {
    test('marks restricted addresses as unrecoverable for a supported toponym type', async () => {
      UserAddress.update.mockResolvedValue([1]);

      HomeAddress.update.mockResolvedValue([1]);

      PartnerAddress.update.mockResolvedValue([1]);

      VolunteerAddress.update.mockResolvedValue([1]);

      const transaction = { id: 'tx-3' };

      await ctrl.markAddressesUnrecoverable('district', 25, transaction);

      for (const model of [UserAddress, HomeAddress, PartnerAddress, VolunteerAddress]) {
        expect(model.update).toHaveBeenCalledWith({ isRecoverable: false }, {
          where: {
            isRestricted: true,
            districtId: 25,
          },
          individualHooks: true,
          transaction,
        });
      }
    });

    test('does nothing for an unsupported toponym type', async () => {
      await ctrl.markAddressesUnrecoverable('unknown', 25, { id: 'tx-4' });

      for (const model of [UserAddress, HomeAddress, PartnerAddress, VolunteerAddress]) {
        expect(model.update).not.toHaveBeenCalled();
      }
    });
  });
});
