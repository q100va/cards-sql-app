// tests/unit/ctrl-toponyms.unit.test.js
import { jest } from '@jest/globals';
import { Op } from 'sequelize';

// Mock models used inside controller
const mkModel = () => ({
  count: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
});
const Country = mkModel();
const Region = mkModel();
const District = mkModel();
const Locality = mkModel();

jest.unstable_mockModule('../../models/index.js', () => ({
  Country, Region, District, Locality,
}));

// Import controller after mocks
const ctrl = await import('../../controllers/ctrl-toponyms.js');

describe('ctrl-toponyms (unit)', () => {
  beforeEach(() => {
    for (const M of [Country, Region, District, Locality]) {
      for (const k of Object.keys(M)) {
        if (typeof M[k] === 'function') M[k].mockReset?.();
      }
    }
  });

  // ---------------- findDuplicate ------------------------------------------
  test('findDuplicate → counts non-restricted by exact parent context; excludes given id', async () => {
    Region.count.mockResolvedValueOnce(2);

    const n = await ctrl.findDuplicate({ type: 'region', name: 'Москва', countryId: 1, id: 9 });
    const arg = Region.count.mock.calls[0][0];

    expect(arg).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          isRestricted: false,
          countryId: 1,
        }),
      })
    );
    expect(arg.where.name).toEqual(
      expect.objectContaining({ [Op.iLike]: 'Москва' })
    );
    expect(arg.where.id).toEqual(
      expect.objectContaining({ [Op.ne]: 9 })
    );

    expect(n).toBe(2);

  });

test('findDuplicate → throws CustomError(422) if missing required parent', async () => {
  try {
    await ctrl.findDuplicate({ type: 'region', name: 'X' });
    throw new Error('Expected findDuplicate to throw');
  } catch (err) {
    // Check error semantic fields rather than message
    expect(err.code).toBe('ERRORS.VALIDATION');
    const status = err.statusCode ?? err.status;
    expect(status).toBe(422);
    // Optional: message is rewritten by the catch block → assert prefix if нужно
    expect(err.message).toMatch(/^Error in findDuplicate \(X, region\):/);
  }
});

  // ---------------- addDefaultAddressParams / addParentsNames ---------------
  test('addDefaultAddressParams(locality) → plucks and strips nested ids', () => {
    const raw = {
      id: 5, name: 'Город',
      'district.id': 33,
      'district.region.id': 7,
      'district.region.country.id': 1,
    };
    const out = ctrl.addDefaultAddressParams(raw, 'locality');
    // Friendly projection
    expect(out.defaultAddressParams).toEqual({
      countryId: 1, regionId: 7, districtId: 33, localityId: 5,
    });
    // Raw paths removed (except id)
    expect(out['district.id']).toBeUndefined();
    expect(out['district.region.id']).toBeUndefined();
    expect(out['district.region.country.id']).toBeUndefined();
  });

  test('addParentsNames(district) → plucks names and strips raw', () => {
    const raw = {
      id: 3, name: 'Some', 'region.name': 'Reg', 'region.country.name': 'C',
    };
    const out = ctrl.addParentsNames(raw, 'district');
    expect(out.regionName).toBe('Reg');
    expect(out.countryName).toBe('C');
    expect(out['region.name']).toBeUndefined();
    expect(out['region.country.name']).toBeUndefined();
  });

  // ---------------- getToponymById -----------------------------------------
  test('getToponymById(region) → adds defaults and uses include()', async () => {
    Region.findOne.mockResolvedValueOnce({
      id: 9, name: 'R',
      'country.id': 1,
    });
    const res = await ctrl.getToponymById(9, 'region');
    expect(Region.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 9, isRestricted: false },
      attributes: expect.any(Array),
      include: expect.any(Array),
      raw: true,
    }));
    expect(res.defaultAddressParams.countryId).toBe(1);
  });

  // ---------------- MAP_POPULATE: locality existingQuery grouping -----------
  test('MAP_POPULATE.locality.existingQuery → groups by district', async () => {
    // Arrange parents maps as in findParents (we bypass findParents and emulate returned structure)
    const regByLower = new Map([['москва', { id: 1, name: 'Москва' }]]);
    const districtByKey = new Map([['1|тверской район', { id: 10, name: 'Тверской район', regionId: 1 }]]);

    // Names to check exist
    Locality.findAll
      .mockResolvedValueOnce([{ name: 'Москва', 'district.name': 'Тверской район', 'district.region.name': 'Москва' }]);

    const rows = [{ name: 'Москва', region: 'Москва', districtFullName: 'Тверской район' }];

    const conflicts = await ctrl.MAP_POPULATE.locality.existingQuery(rows, { regByLower, districtByKey });
    expect(Locality.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ districtId: 10 }),
      include: expect.any(Array),
      raw: true,
    }));
    expect(conflicts).toEqual(['Москва (Тверской район, Москва)']);
  });

  // ---------------- MAP_POPULATE.country buildPayload -----------------------
  test('MAP_POPULATE.country.buildPayload → flattens to records', () => {
    const r = { name: 'Estonia', shortName: 'EE' };
    const payload = ctrl.MAP_POPULATE.country.buildPayload(r, {});
    expect(payload).toEqual([{ name: 'Estonia', shortName: 'EE' }]);
  });

  // ---------------- norm -----------------------------------------------------
  test('norm() → trims + lowercases NFC', () => {
    const s = '  ĚS T Õ N I A  ';
    expect(ctrl.norm(s)).toBe('ěs t õ n i a');
  });
});
