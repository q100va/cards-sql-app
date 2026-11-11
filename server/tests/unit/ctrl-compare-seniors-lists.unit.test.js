/** @jest-environment node */

import {
  describe,
  expect,
  test,
} from '@jest/globals';

import {
  compareSeniorLists,
} from '../../controllers/ctrl-compare-seniors-lists.js';

function senior(overrides = {}) {
  return {
    id: 1,
    lastName: 'Ivanova',
    firstName: 'Anna',
    patronymic: 'Petrovna',
    gender: 'female',
    birthDate: '1940-05-12',
    dateOfExit: null,
    dateOfConsent: null,
    comment: null,
    infoNote: null,
    photoLink: null,
    kindergarten: null,
    teacher: null,
    veteran: null,
    childOfWar: null,
    profession: null,
    honoraryStatus: null,
    interests: null,
    orthodoxBeliever: null,
    ...overrides,
  };
}

describe('ctrl-compare-seniors-lists', () => {
  test('treats an exact unchanged match as unchanged', () => {
    const newList = [
      senior({ id: undefined }),
    ];

    const oldList = [
      senior({ id: 10 }),
    ];

    const result = compareSeniorLists(
      newList,
      oldList,
      5,
      false,
    );

    expect(result).toEqual({
      newSeniors: [],
      removedSeniors: [],
      updatedSeniors: [],
      possibleDuplicates: [],
      returnedSeniors: [],
    });

    expect(newList[0].homeId).toBe(5);
    expect(newList[0].dateOfExit).toBeNull();
  });

  test('classifies an exact active match with changed data as updated', () => {
    const newList = [
      senior({
        id: undefined,
        comment: 'New comment',
      }),
    ];

    const oldList = [
      senior({
        id: 10,
        comment: 'Old comment',
      }),
    ];

    const result = compareSeniorLists(
      newList,
      oldList,
      5,
      false,
    );

    expect(result.updatedSeniors).toHaveLength(1);

    expect(result.updatedSeniors[0].changes).toEqual({
      comment: {
        newValue: 'New comment',
        oldValue: 'Old comment',
      },
    });

    expect(result.updatedSeniors[0].changeRows).toEqual([
      {
        field: 'comment',
        label: 'comment',
        newValue: 'New comment',
        oldValue: 'Old comment',
      },
    ]);

    expect(result.newSeniors).toEqual([]);
    expect(result.removedSeniors).toEqual([]);
  });

  test('classifies an exact match with dateOfExit as returned', () => {
    const newList = [
      senior({ id: undefined }),
    ];

    const oldList = [
      senior({
        id: 10,
        dateOfExit: '2026-01-15',
      }),
    ];

    const result = compareSeniorLists(
      newList,
      oldList,
      5,
      false,
    );

    expect(result.returnedSeniors).toHaveLength(1);
    expect(result.returnedSeniors[0].oldSenior.id).toBe(10);

    expect(result.returnedSeniors[0].changes).toEqual({
      dateOfExit: {
        newValue: null,
        oldValue: '2026-01-15',
      },
    });

    expect(result.removedSeniors).toEqual([]);
  });

  test('classifies a completely unmatched senior as new', () => {
    const newSenior = senior({
      id: undefined,
      lastName: 'Petrova',
      firstName: 'Maria',
      patronymic: 'Ivanovna',
      birthDate: '1945-07-20',
    });

    const result = compareSeniorLists(
      [newSenior],
      [
        senior({
          id: 10,
        }),
      ],
      5,
      false,
    );

    expect(result.newSeniors).toEqual([
      expect.objectContaining({
        lastName: 'Petrova',
        firstName: 'Maria',
        homeId: 5,
        dateOfExit: null,
      }),
    ]);

    expect(result.possibleDuplicates).toEqual([]);

    expect(result.removedSeniors).toEqual([
      expect.objectContaining({
        id: 10,
      }),
    ]);
  });

  test('classifies a partial identity match as a possible duplicate', () => {
    const newList = [
      senior({
        id: undefined,
        lastName: 'Petrova',
      }),
    ];

    const oldList = [
      senior({
        id: 10,
        lastName: 'Ivanova',
      }),
    ];

    const result = compareSeniorLists(
      newList,
      oldList,
      5,
      false,
    );

    expect(result.possibleDuplicates).toHaveLength(1);

    expect(result.possibleDuplicates[0].changes).toEqual({
      lastName: {
        newValue: 'Petrova',
        oldValue: 'Ivanova',
      },
    });

    expect(result.newSeniors).toEqual([]);
    expect(result.removedSeniors).toEqual([]);
  });

  test('marks unmatched active old seniors as removed but ignores already exited seniors', () => {
    const oldActive = senior({
      id: 10,
      lastName: 'Ivanova',
    });

    const oldExited = senior({
      id: 11,
      lastName: 'Petrova',
      firstName: 'Maria',
      patronymic: 'Ivanovna',
      birthDate: '1945-07-20',
      dateOfExit: '2025-12-01',
    });

    const result = compareSeniorLists(
      [],
      [
        oldActive,
        oldExited,
      ],
      5,
      false,
    );

    expect(result.removedSeniors).toEqual([
      oldActive,
    ]);

    expect(result.newSeniors).toEqual([]);
    expect(result.returnedSeniors).toEqual([]);
  });

  test('ignores missing optional fields in comments mode', () => {
    const newList = [
      senior({
        id: undefined,
        comment: undefined,
        infoNote: undefined,
      }),
    ];

    const oldList = [
      senior({
        id: 10,
        comment: 'Keep this comment',
        infoNote: 'Keep this note',
      }),
    ];

    const result = compareSeniorLists(
      newList,
      oldList,
      5,
      true,
    );

    expect(result.updatedSeniors).toEqual([]);
  });

  test('treats missing optional fields as null changes when comments mode is off', () => {
    const newList = [
      senior({
        id: undefined,
        comment: undefined,
        infoNote: undefined,
      }),
    ];

    const oldList = [
      senior({
        id: 10,
        comment: 'Old comment',
        infoNote: 'Old note',
      }),
    ];

    const result = compareSeniorLists(
      newList,
      oldList,
      5,
      false,
    );

    expect(result.updatedSeniors).toHaveLength(1);

    expect(result.updatedSeniors[0].changes).toEqual({
      comment: {
        newValue: null,
        oldValue: 'Old comment',
      },
      infoNote: {
        newValue: null,
        oldValue: 'Old note',
      },
    });
  });
});
