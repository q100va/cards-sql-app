/** @jest-environment node */

import {
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';

import CustomError from '../../shared/customError.js';
import {
  INSTITUTE_CATEGORIES,
} from '../../../shared/dist/constants/volunteers.js';
import {
  PARTNER_AFFILIATIONS,
} from '../../../shared/dist/constants/partners.js';

const Volunteer = {
  findByPk: jest.fn(),
};

const VolunteerAddress = {};
const VolunteerInstitute = {};
const VolunteerSubscription = {};
const VolunteerCooperation = {};
const VolunteerContact = {};

const VolunteerSearch = {
  update: jest.fn(),
};

const Country = {};
const Region = {};
const District = {};
const Locality = {};
const User = {};
const Order = {};

const fullName = jest.fn();

jest.unstable_mockModule('../../models/index.js', () => ({
  Volunteer,
  VolunteerAddress,
  VolunteerContact,
  VolunteerInstitute,
  VolunteerSubscription,
  VolunteerCooperation,
  VolunteerSearch,
  Country,
  Region,
  District,
  Locality,
  User,
  Order,
}));

jest.unstable_mockModule(
  '../../controllers/ctrl-create-owner-contacts-address.js',
  () => ({
    fullName,
  }),
);

const {
  createOutdatedSearchStringFor,
  createSearchStringFor,
  dateVariants,
  refreshVolunteerSearch,
  toSearchToken,
} = await import(
  '../../controllers/ctrl-search-string.js'
);

describe('ctrl-search-string', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    fullName.mockReturnValue('Mock Full Name');
  });

  describe('dateVariants', () => {
    test('returns ISO, Russian, and US variants for an ISO date string', () => {
      expect(dateVariants('2026-11-05')).toEqual([
        '2026-11-05',
        '05.11.2026',
        '11/05/2026',
      ]);
    });

    test('uses UTC for Date values and returns empty array for invalid values', () => {
      expect(
        dateVariants(new Date('2026-02-03T23:30:00Z')),
      ).toEqual([
        '2026-02-03',
        '03.02.2026',
        '02/03/2026',
      ]);

      expect(dateVariants('not-a-date')).toEqual([]);
      expect(dateVariants(null)).toEqual([]);
    });
  });

  test('toSearchToken trims values and converts nullish values to empty string', () => {
    expect(toSearchToken('  Anna  ')).toBe('Anna');
    expect(toSearchToken(123)).toBe('123');
    expect(toSearchToken(null)).toBe('');
    expect(toSearchToken(undefined)).toBe('');
  });

  describe('createSearchStringFor', () => {
    test('includes user data, active contacts, and the first active address only', () => {
      const result = createSearchStringFor('user', {
        userName: 'oksana',
        role: { name: 'admin' },
        firstName: 'Oksana',
        lastName: 'Finch',
        comment: 'Test comment',
        isRestricted: false,
        dateOfStart: '2026-01-05',
        contacts: [
          { content: 'active@test.com', isRestricted: false },
          { content: 'old@test.com', isRestricted: true },
        ],
        addresses: [
          {
            isRestricted: true,
            fullPostalAddress: 'Old Address',
          },
          {
            isRestricted: false,
            country: { name: 'USA' },
            region: { name: 'New York' },
            locality: { name: 'Queens' },
            fullPostalAddress: 'Fresh Meadows',
          },
        ],
      });

      expect(result).toContain('oksana');
      expect(result).toContain('admin');
      expect(result).toContain('Oksana');
      expect(result).toContain('Finch');
      expect(result).toContain('активен active');
      expect(result).toContain('active@test.com');
      expect(result).not.toContain('old@test.com');
      expect(result).toContain('USA');
      expect(result).toContain('New York');
      expect(result).toContain('Queens');
      expect(result).toContain('Fresh Meadows');
      expect(result).not.toContain('Old Address');
      expect(result).toContain('2026-01-05');
      expect(result).toContain('05.01.2026');
    });

    test('builds volunteer search content with institute, subscription, cooperation, and last order', () => {
      const [categoryId, category] = Object.entries(
        INSTITUTE_CATEGORIES,
      )[0];

      const result = createSearchStringFor('volunteer', {
        firstName: 'Anna',
        lastName: 'Ivanova',
        contacts: [
          { content: '555-1111', isRestricted: false },
          { content: '555-9999', isRestricted: true },
        ],
        addresses: [],
        institutes: [
          {
            instituteName: 'School 1',
            category: Number(categoryId),
            isRestricted: false,
          },
          {
            instituteName: 'Old School',
            category: Number(categoryId),
            isRestricted: true,
          },
        ],
        subscriptions: [
          {
            user: {
              userName: 'user-one',
            },
          },
        ],
        cooperations: [
          {
            user: {
              userName: 'user-two',
            },
          },
        ],
        orders: [
          {
            createdAt: '2026-10-15',
          },
        ],
      });

      expect(result).toContain('Anna');
      expect(result).toContain('Ivanova');
      expect(result).toContain('555-1111');
      expect(result).not.toContain('555-9999');
      expect(result).toContain('School 1');
      expect(result).not.toContain('Old School');
      expect(result).toContain(category.en);
      expect(result).toContain(category.ru);
      expect(result).toContain('subscription подписка');
      expect(result).toContain('user-one');
      expect(result).toContain('user-two');
      expect(result).toContain('2026-10-15');
    });

    test('includes partner affiliation and only active coordinations', () => {
      const [affiliationId, affiliation] = Object.entries(
        PARTNER_AFFILIATIONS,
      )[0];

      const result = createSearchStringFor('partner', {
        firstName: 'John',
        affiliation: Number(affiliationId),
        contacts: [],
        addresses: [],
        coordinations: [
          {
            homeName: 'Active Home',
            regionName: 'Queens',
            isRestricted: false,
          },
          {
            homeName: 'Old Home',
            regionName: 'Brooklyn',
            isRestricted: true,
          },
        ],
      });

      expect(result).toContain('John');
      expect(result).toContain(affiliation.en);
      expect(result).toContain(affiliation.ru);
      expect(result).toContain('Active Home');
      expect(result).toContain('Queens');
      expect(result).not.toContain('Old Home');
      expect(result).not.toContain('Brooklyn');
    });

    test('includes senior-specific data, spouse, home, and active home address', () => {
      fullName.mockReturnValue('Ivan Petrov');

      const result = createSearchStringFor('senior', {
        firstName: 'Anna',
        lastName: 'Ivanova',
        gender: 'female',
        birthDate: '1940-05-12',
        profession: 'Teacher',
        home: {
          homeName: 'Senior Home',
          addresses: [
            {
              isRestricted: false,
              country: { name: 'USA' },
              region: { name: 'New York' },
              fullPostalAddress: 'Main Street 10',
            },
          ],
        },
        spouse: {
          firstName: 'Ivan',
          lastName: 'Petrov',
          birthDate: '1938-07-04',
        },
      });

      expect(result).toContain('Anna');
      expect(result).toContain('Ivanova');
      expect(result).toContain('female жен.');
      expect(result).toContain('1940-05-12');
      expect(result).toContain('12.05.1940');
      expect(result).toContain('Teacher');
      expect(result).toContain('Senior Home');
      expect(result).toContain('USA');
      expect(result).toContain('New York');
      expect(result).toContain('Main Street 10');
      expect(result).toContain('Ivan Petrov');
      expect(result).toContain('1938-07-04');

      expect(fullName).toHaveBeenCalledWith({
        firstName: 'Ivan',
        lastName: 'Petrov',
        birthDate: '1938-07-04',
      });
    });
  });

  describe('createOutdatedSearchStringFor', () => {
    test('includes restricted volunteer contacts, addresses, institutes, and outdated names', () => {
      const [categoryId, category] = Object.entries(
        INSTITUTE_CATEGORIES,
      )[0];

      const result = createOutdatedSearchStringFor(
        'volunteer',
        {
          contacts: [
            { content: 'old@email.com', isRestricted: true },
            { content: 'active@email.com', isRestricted: false },
          ],
          addresses: [
            {
              isRestricted: true,
              country: { name: 'USA' },
              fullPostalAddress: 'Old Address',
            },
            {
              isRestricted: false,
              fullPostalAddress: 'Current Address',
            },
          ],
          outdatedNames: [
            {
              firstName: 'Old',
              lastName: 'Name',
            },
          ],
          institutes: [
            {
              instituteName: 'Old Institute',
              category: Number(categoryId),
              isRestricted: true,
            },
            {
              instituteName: 'Current Institute',
              category: Number(categoryId),
              isRestricted: false,
            },
          ],
        },
      );

      expect(result).toContain('old@email.com');
      expect(result).not.toContain('active@email.com');
      expect(result).toContain('USA');
      expect(result).toContain('Old Address');
      expect(result).not.toContain('Current Address');
      expect(result).toContain('Old Name');
      expect(result).toContain('Old Institute');
      expect(result).not.toContain('Current Institute');
      expect(result).toContain(category.en);
      expect(result).toContain(category.ru);
    });

    test('includes restricted home coordination partner data and active partner contacts', () => {
      fullName.mockReturnValue('Partner Name');

      const result = createOutdatedSearchStringFor(
        'home',
        {
          contacts: [],
          addresses: [],
          outdatedNames: [],
          coordinations: [
            {
              isRestricted: true,
              partner: {
                firstName: 'Partner',
                contacts: [
                  {
                    content: 'partner@test.com',
                    isRestricted: false,
                  },
                  {
                    content: 'old@test.com',
                    isRestricted: true,
                  },
                ],
              },
            },
          ],
        },
      );

      expect(result).toContain('Partner Name');
      expect(result).toContain('partner@test.com');
      expect(result).not.toContain('old@test.com');
    });
  });

  test('throws 500 for an unsupported owner kind', () => {
    let actualError;
    let outdatedError;

    try {
      createSearchStringFor('unknown', {});
    } catch (error) {
      actualError = error;
    }

    try {
      createOutdatedSearchStringFor('unknown', {});
    } catch (error) {
      outdatedError = error;
    }

    expect(actualError).toBeInstanceOf(CustomError);
    expect(actualError.code).toBe('ERRORS.UNSUPPORTED_TYPE');
    expect(actualError.statusCode ?? actualError.status).toBe(500);

    expect(outdatedError).toBeInstanceOf(CustomError);
    expect(outdatedError.code).toBe('ERRORS.UNSUPPORTED_TYPE');
    expect(outdatedError.statusCode ?? outdatedError.status).toBe(500);
  });

  describe('refreshVolunteerSearch', () => {
    test('does not update search content when the volunteer does not exist', async () => {
      Volunteer.findByPk.mockResolvedValue(null);

      await refreshVolunteerSearch(
        10,
        { id: 'tx-10' },
      );

      expect(VolunteerSearch.update).not.toHaveBeenCalled();
    });

    test('rebuilds and updates the active volunteer search row', async () => {
      const transaction = { id: 'tx-11' };

      const volunteer = {
        id: 10,
        firstName: 'Anna',
        lastName: 'Ivanova',
        contacts: [
          {
            content: 'anna@test.com',
            isRestricted: false,
          },
        ],
        addresses: [],
        institutes: [],
        subscriptions: [],
        cooperations: [],
        orders: [],
      };

      Volunteer.findByPk.mockResolvedValue(volunteer);

      await refreshVolunteerSearch(
        10,
        transaction,
      );

      expect(Volunteer.findByPk).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          transaction,
          include: expect.any(Array),
        }),
      );

      expect(VolunteerSearch.update).toHaveBeenCalledTimes(1);

      const [
        updateData,
        updateOptions,
      ] = VolunteerSearch.update.mock.calls[0];

      expect(updateData.content).toContain('Anna');
      expect(updateData.content).toContain('Ivanova');
      expect(updateData.content).toContain('anna@test.com');

      expect(updateOptions).toEqual({
        where: {
          volunteerId: 10,
          isRestricted: false,
        },
        transaction,
      });
    });
  });
});
