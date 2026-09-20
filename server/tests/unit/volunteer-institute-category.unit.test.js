import {
  INSTITUTE_CATEGORIES,
  INSTITUTE_CATEGORY,
} from '../../../shared/dist/constants/volunteers.js';
import {
  instituteCategoryControlSchema,
} from '../../../shared/dist/schemas/volunteer.schema.js';

describe('volunteer institute categories', () => {
  test('defines a localized entry for every stable numeric category ID', () => {
    const ids = Object.values(INSTITUTE_CATEGORY);

    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(Object.keys(INSTITUTE_CATEGORIES).map(Number)).toEqual(ids);

    for (const id of ids) {
      expect(INSTITUTE_CATEGORIES[id]).toEqual({
        key: expect.any(String),
        ru: expect.any(String),
        en: expect.any(String),
      });
    }
  });

  test.each(Object.values(INSTITUTE_CATEGORY))(
    'accepts category ID %s',
    (categoryId) => {
      expect(instituteCategoryControlSchema.parse(categoryId)).toBe(categoryId);
    },
  );

  test.each(['School', 'школа', 0, 13, 1.5])(
    'rejects invalid stored category value %p',
    (category) => {
      expect(instituteCategoryControlSchema.safeParse(category).success).toBe(false);
    },
  );
});
