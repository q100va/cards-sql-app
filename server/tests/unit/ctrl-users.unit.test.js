/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';
import { Op, literal } from 'sequelize';

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

// ── import tested helpers ──────────────────────────────────────────────────────
import {
  createSearchString,
  createOutdatedSearchString,
  pruneNulls,
  transformUserData,
  buildOrder,
  betweenDatesInclusive,
  buildSearchContentWhere,
  buildContactUserIdSubquery,
  buildAddressUserIdSubquery,
} from '../../controllers/ctrl-users.js';


// ── tiny helpers ───────────────────────────────────────────────────────────────
const asSQL = (lit) => (lit && (lit.val ?? lit.toString?.())) || '';

describe('search-utils', () => {

  beforeEach(() => {
    for (const M of [Country, Region, District, Locality]) {
      for (const k of Object.keys(M)) {
        if (typeof M[k] === 'function') M[k].mockReset?.();
      }
    }
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('createSearchString', () => {
    it('builds flat string with core fields, status, dates, contacts, first address', () => {
      const user = {
        userName: 'kate',
        role: { name: 'Admin' },
        firstName: 'Kate',
        patronymic: 'J.',
        lastName: 'Smith',
        comment: 'hello',
        isRestricted: true,
        dateOfRestriction: '2024-10-02',
        causeOfRestriction: 'rule',
        dateOfStart: new Date('2023-01-05'),
        contacts: [
          { isRestricted: false, content: 'mail@x.com' },
          { isRestricted: true, content: 'old@mail' },
        ],
        addresses: [
          { isRestricted: true, country: { name: 'RU' } },
          { isRestricted: false, country: { name: 'US' }, region: { name: 'CA' } },
        ],
      };

      const s = createSearchString(user);
      expect(s).toContain('kate');
      expect(s).toContain('Admin');
      expect(s).toContain('Kate');
      expect(s).toContain('Smith');
      expect(s).toContain('hello');
      // status both langs
      expect(s).toContain('заблокирован');
      expect(s).toContain('blocked');
      // dates: ISO + dd.MM.yyyy + MM/dd/yyyy
      expect(s).toContain('2024-10-02');
      expect(s).toContain('02.10.2024');
      expect(s).toContain('10/02/2024');
      expect(s).toContain('2023-01-05');
      expect(s).toContain('05.01.2023');
      expect(s).toContain('01/05/2023');
      // contacts non-restricted only
      expect(s).toContain('mail@x.com');
      expect(s).not.toContain('old@mail');
      // first non-restricted address
      expect(s).toContain('US');
      expect(s).toContain('CA');
    });

    /*     it('returns empty for empty input', () => {
          expect(createSearchString(null)).toBe('');//"активен active"
          expect(createSearchString({})).toBe('');//"активен active"
        }); */
  });

  describe('createOutdatedSearchString', () => {
    it('includes only restricted contacts, all restricted addresses, outdated names', () => {
      const user = {
        contacts: [
          { isRestricted: true, content: 'old@x.com' },
          { isRestricted: false, content: 'live@x.com' },
        ],
        addresses: [
          { isRestricted: true, country: { name: 'RU' }, region: { name: 'MSK' } },
          { isRestricted: false, country: { name: 'US' } },
          { isRestricted: true, country: { name: 'DE' }, locality: { name: 'Berlin' } },
        ],
        outdatedNames: [
          { firstName: 'Old', patronymic: null, lastName: 'Name', userName: null, id: 1 },
          { firstName: null, patronymic: null, lastName: null, userName: 'old_user', id: 2 },
        ],
      };

      const s = createOutdatedSearchString(user);
      expect(s).toContain('old@x.com');
      expect(s).toContain('RU');
      expect(s).toContain('MSK');
      expect(s).toContain('DE');
      expect(s).toContain('Berlin');
      expect(s).toContain('Old');
      expect(s).toContain('Name');
      expect(s).toContain('old_user');
      expect(s).not.toContain('live@x.com');
      expect(s).not.toContain('US');
    });
  });

  describe('pruneNulls', () => {
    it('drops null keys, keeps others', () => {
      const obj = { a: 1, b: null, c: undefined, d: 0, e: '' };
      expect(pruneNulls(obj)).toEqual({ a: 1, c: undefined, d: 0, e: '' });
    });
  });

  describe('transformUserData', () => {
    it('splits contacts into ordered/outdated, picks first actual address, groups outdatedNames', () => {
      const raw = {
        role: { id: 2, name: 'Manager' },
        contacts: [
          { id: 10, type: 'email', isRestricted: false, content: 'x@x.com' },
          { id: 11, type: 'telegramNickname', isRestricted: false, content: '@nick' },
          { id: 12, type: 'telegramId', isRestricted: false, content: '12345' },
          { id: 13, type: 'email', isRestricted: true, content: 'old@x' },
        ],
        addresses: [
          { isRestricted: true, id: 100, country: { id: 1, name: 'RU' } },
          {
            isRestricted: false, id: 200,
            country: { id: 10, name: 'US' },
            region: { id: 20, shortName: 'CA' },
          },
        ],
        outdatedNames: [
          { id: 1, firstName: 'A', patronymic: 'B', lastName: 'C', userName: null },
          { id: 2, firstName: null, patronymic: null, lastName: null, userName: 'old_user' },
        ],
      };

      const res = transformUserData(raw);

      // roleName
      expect(res.roleName).toBe('Manager');
      expect(res.role).toBeUndefined();

      // contacts
      expect(res.orderedContacts.email).toEqual([{ id: 10, content: 'x@x.com' }]);
      // telegram grouped under both telegram + concrete type? (по твоей логике — и в telegram, и в своих типах)
      expect(res.orderedContacts.telegram?.length).toBe(2);
      expect(res.outdatedData.contacts.email).toEqual([{ id: 13, content: 'old@x' }]);

      // addresses
      expect(res.address.country?.name).toBe('US');
      expect(res.outdatedData.addresses[0].country?.name).toBe('RU');
      expect(res.addresses).toBeUndefined();

      // outdated names / usernames
      expect(res.outdatedData.names[0]).toMatchObject({ firstName: 'A', lastName: 'C' });
      expect(res.outdatedData.userNames[0]).toMatchObject({ userName: 'old_user' });
    });
  });

  describe('buildOrder', () => {
    it('defaults to userName ASC', () => {
      expect(buildOrder(undefined)).toEqual([['userName', 'ASC']]);
    });

    it('supports simple field/dir', () => {
      expect(buildOrder([{ field: 'firstName', direction: 'desc' }])).toEqual([['firstName', 'DESC']]);
    });

    it('supports role by literal subselect', () => {
      const ord = buildOrder([{ field: 'role', direction: 'asc' }]);
      expect(Array.isArray(ord)).toBe(true);
      expect(asSQL(ord[0][0])).toContain('SELECT "name" FROM "roles"');
      expect(ord[0][1]).toBe('ASC');
    });
  });

  describe('betweenDatesInclusive', () => {
    it('builds gte/lt with +1 day end', () => {
      const w = betweenDatesInclusive(['2024-10-01', '2024-10-10']);

      // read symbol keys instead of Object.keys
      const keys = Object.getOwnPropertySymbols(w).map(String).sort();
      expect(keys).toEqual([Op.gte, Op.lt].map(String).sort());

      expect(new Date(w[Op.gte]).toISOString().slice(0, 10)).toBe('2024-10-01');
      expect(new Date(w[Op.lt]).toISOString().slice(0, 10)).toBe('2024-10-11'); // +1 day
    });
  });

  describe('buildSearchContentWhere', () => {
    it('returns undefined for empty string', () => {
      expect(buildSearchContentWhere('   ', false)).toBeUndefined();
    });

    it('OR mode when exact=false', () => {
      const w = buildSearchContentWhere('a b', false);
      expect(w[Op.or].length).toBe(2);
      expect(w[Op.or][0].content[Op.iLike]).toBe('%a%');
      expect(w[Op.or][1].content[Op.iLike]).toBe('%b%');
    });

    it('AND mode when exact=true', () => {
      const w = buildSearchContentWhere('a b', true);
      expect(w[Op.and].length).toBe(2);
      expect(w[Op.and][0].content[Op.iLike]).toBe('%a%');
      expect(w[Op.and][1].content[Op.iLike]).toBe('%b%');
    });
  });

  describe('buildContactUserIdSubquery', () => {
    it('weak mode: any of types; respects includeOutdated=false', () => {
      const lit = buildContactUserIdSubquery(['email', 'phoneNumber'], false, false);
      const sql = asSQL(lit);
      expect(sql).toContain('"user-contacts"');
      expect(sql).toContain('"isRestricted" = false');
      expect(sql).toContain(`type IN ('email', 'phoneNumber')`);
    });

    it('strong mode: HAVING COUNT(DISTINCT type)=N', () => {
      const lit = buildContactUserIdSubquery(['email', 'phoneNumber', 'facebook'], true, true);
      const sql = asSQL(lit);
      expect(sql).toContain('GROUP BY "userId"');
      expect(sql).toContain('HAVING COUNT(DISTINCT type) = 3');
      expect(sql).not.toContain('"isRestricted" = false'); // includeOutdated=true
    });
  });

  describe('buildAddressUserIdSubquery', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('weak mode: builds OR of selected toponyms; filters isRestricted=false when includeOutdated=false', async () => {
      // parents not needed here
      Region.findOne.mockResolvedValue(null);
      District.findOne.mockResolvedValue(null);
      Locality.findOne.mockResolvedValue(null);

      const sub = await buildAddressUserIdSubquery(
        {
          countries: [1, 2],
          regions: [10],
          districts: [],
          localities: [],
        },
        false, // includeOutdated
        false  // strictAddressMode
      );

      const sql = asSQL(sub);
      expect(sql).toContain('"user-addresses"');
      expect(sql).toContain('"isRestricted" = false');
      expect(sql).toContain('"countryId" IN (\'1\', \'2\')');
      expect(sql).toContain('"regionId" IN (\'10\')');
      expect(sql).toContain('OR'); // weak OR junction
      expect(sql).not.toContain('GROUP BY "userId"');
    });

    it('strict mode: adds GROUP BY + HAVING per distinct dimension', async () => {
      // emulate parents existence for dedup chain removals (OK to return any)
      Region.findOne.mockResolvedValue({ countryId: 777 });
      District.findOne.mockResolvedValue({ regionId: 555 });
      Locality.findOne.mockResolvedValue({ districtId: 333 });

      const sub = await buildAddressUserIdSubquery(
        {
          countries: [1],
          regions: [10, 11],
          districts: [100],
          localities: [1000, 1001],
        },
        true,  // includeOutdated
        true   // strict
      );

      const sql = asSQL(sub);
      expect(sql).toContain('GROUP BY "userId"');
      expect(sql).toContain('COUNT(DISTINCT "countryId")=1');
      expect(sql).toContain('COUNT(DISTINCT "regionId")=2');
      expect(sql).toContain('COUNT(DISTINCT "districtId")=1');
      expect(sql).toContain('COUNT(DISTINCT "localityId")=2');
      expect(sql).not.toContain('"isRestricted" = false'); // includeOutdated=true
    });
  });
});
