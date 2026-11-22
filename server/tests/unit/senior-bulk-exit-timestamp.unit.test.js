import { bulkUpdateSchema } from '../../../shared/dist/schemas/senior.schema.js';

function parseChanges(changes) {
  return bulkUpdateSchema.safeParse({
    homeId: 1,
    dateOfUpdate: '2026-11-25T00:00:00.000Z',
    admitted: [],
    removed: [],
    updated: [{ seniorId: 2, changes }],
  });
}

test('bulk validation preserves exit timestamps, calendar dates, null and omission', () => {
  for (const value of ['2026-11-21T21:00:00.000Z', '2026-11-22T00:00:00+03:00', '2026-11-21', null]) {
    const result = parseChanges({ dateOfExit: value, dateOfConsent: '2026-11-20' });
    expect(result.success).toBe(true);
    expect(result.data.updated[0].changes).toEqual({ dateOfExit: value, dateOfConsent: '2026-11-20' });
  }
  expect(parseChanges({}).data.updated[0].changes).toEqual({});
  expect(parseChanges({ dateOfExit: '' }).data.updated[0].changes).toEqual({ dateOfExit: null });
});

test('bulk validation rejects malformed exit dates and invalid timestamp suffixes', () => {
  for (const value of ['tomorrow', '2026-11-21oops', '2026-02-30', '2026-11-21T25:00:00Z']) {
    expect(parseChanges({ dateOfExit: value }).success).toBe(false);
  }
});
