export const INSTITUTE_CATEGORY = {
  SCHOOL: 1,
  KINDERGARTEN: 2,
  COLLEGE: 3,
  UNIVERSITY: 4,
  GOVERNMENT: 5,
  BUSINESS: 6,
  CHURCH: 7,
  CHARITY: 8,
  CHILDREN: 9,
  YOUTH: 10,
  ADULTS: 11,
  OTHER: 12,
} as const;

export type InstituteCategoryId =
  (typeof INSTITUTE_CATEGORY)[keyof typeof INSTITUTE_CATEGORY];

type InstituteCategoryInfo = {
  key: string;
  ru: string;
  en: string;
};

export const INSTITUTE_CATEGORIES: Record<
  number,
  InstituteCategoryInfo
> = {
  [INSTITUTE_CATEGORY.SCHOOL]: {
    key: 'VOLUNTEER.CATEGORIES.SCHOOL',
    ru: 'школа',
    en: 'School',
  },
  [INSTITUTE_CATEGORY.KINDERGARTEN]: {
    key: 'VOLUNTEER.CATEGORIES.KINDERGARTEN',
    ru: 'дошкольное ОУ',
    en: 'Preschool',
  },
  [INSTITUTE_CATEGORY.COLLEGE]: {
    key: 'VOLUNTEER.CATEGORIES.COLLEGE',
    ru: 'профессиональное ОУ',
    en: 'College',
  },
  [INSTITUTE_CATEGORY.UNIVERSITY]: {
    key: 'VOLUNTEER.CATEGORIES.UNIVERSITY',
    ru: 'ВУЗ',
    en: 'University',
  },
  [INSTITUTE_CATEGORY.GOVERNMENT]: {
    key: 'VOLUNTEER.CATEGORIES.GOVERNMENT',
    ru: 'бюджетная орг-я',
    en: 'Government organization',
  },
  [INSTITUTE_CATEGORY.BUSINESS]: {
    key: 'VOLUNTEER.CATEGORIES.BUSINESS',
    ru: 'коммерческая орг-я',
    en: 'Business organization',
  },
  [INSTITUTE_CATEGORY.CHURCH]: {
    key: 'VOLUNTEER.CATEGORIES.CHURCH',
    ru: 'религиозная орг-я',
    en: 'Religious organization',
  },
  [INSTITUTE_CATEGORY.CHARITY]: {
    key: 'VOLUNTEER.CATEGORIES.CHARITY',
    ru: 'благотворительная орг-я',
    en: 'Charitable organization',
  },
  [INSTITUTE_CATEGORY.CHILDREN]: {
    key: 'VOLUNTEER.CATEGORIES.CHILDREN',
    ru: 'детский коллектив',
    en: 'Children volunteers',
  },
  [INSTITUTE_CATEGORY.YOUTH]: {
    key: 'VOLUNTEER.CATEGORIES.YOUTH',
    ru: 'юношеский коллектив',
    en: 'Youth volunteers',
  },
  [INSTITUTE_CATEGORY.ADULTS]: {
    key: 'VOLUNTEER.CATEGORIES.ADULTS',
    ru: 'взрослые волонтеры',
    en: 'Adult volunteers',
  },
  [INSTITUTE_CATEGORY.OTHER]: {
    key: 'VOLUNTEER.CATEGORIES.OTHER',
    ru: 'другое',
    en: 'Other',
  },
} as const;

export const INSTITUTE_CATEGORY_OPTIONS = Object.entries(
  INSTITUTE_CATEGORIES,
).map(([id, category]) => ({
  id: Number(id) as InstituteCategoryId,
  optionKey: category.key,
}));

