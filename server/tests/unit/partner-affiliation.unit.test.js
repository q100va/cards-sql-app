import {
  PARTNER_AFFILIATIONS,
  PARTNER_AFFILIATION,
} from '../../../shared/dist/constants/partners.js';
import {
  changingMainSchema,
  partnersQueryDTOSchema,
} from '../../../shared/dist/schemas/partner.schema.js';

describe('partner affiliations', () => {
  test('defines a localized entry for every stable numeric affiliation ID', () => {
    const ids = Object.values(PARTNER_AFFILIATION);

    expect(ids).toEqual([1, 2, 3]);
    expect(Object.keys(PARTNER_AFFILIATIONS).map(Number)).toEqual(ids);

    for (const id of ids) {
      expect(PARTNER_AFFILIATIONS[id]).toEqual({
        key: expect.any(String),
        ru: expect.any(String),
        en: expect.any(String),
      });
    }
  });

  test.each(Object.values(PARTNER_AFFILIATION))(
    'accepts affiliation ID %s for updates and filters',
    (affiliationId) => {
      expect(
        changingMainSchema.safeParse({ affiliation: affiliationId }).success,
      ).toBe(true);
      expect(
        partnersQueryDTOSchema.safeParse({
          page: { size: 10, number: 0 },
          filters: { general: { affiliations: [affiliationId] } },
        }).success,
      ).toBe(true);
    },
  );

  test.each(['Coordinator', 'Координатор', 0, 4, 1.5])(
    'rejects invalid affiliation value %p',
    (affiliation) => {
      expect(changingMainSchema.safeParse({ affiliation }).success).toBe(false);
    },
  );
});
