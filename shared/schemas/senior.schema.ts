import { number, z } from 'zod';
import {
  toTrim,
  emptyToNull,
  toLowerTrim,
  keepE164Chars,
  keepE164CharsNullable,
  nonEmpty,
  nonEmptyTrim,
  nonEmptyTrimMax,
  positiveInt,
  nullableInt,
  nullableIsoDate,
  intOptArray,
} from './common.schema.js';
import {
  emailSchema,
  facebookSchema,
  instagramSchema,
  otherContactSchema,
  phoneNumberSchema,
  telegramIdSchema,
  telegramNicknameSchema,
  vKontakteSchema,
  websiteSchema,
} from './common.schema.js';
import {
  draftAddressSchema,
  addressSchema,
  addressRefFullSchema,
  addressRefShortSchema,
} from './common.schema.js';
import {
  contactType,
  contactSchema,
  nonEmptyContacts,
  optionalContactsSchema,
} from './common.schema.js';
import {
  //changingAddressSchema,
  changingContactsSchema,
} from './common.schema.js';
import {
  outdatedNameItemSchema,
  outdatedAddressItemSchema,
} from './common.schema.js';

export const nullableDateOnly = z.preprocess(
  (v: unknown) => {
    if (v == null || v === '') return null;

    if (v instanceof Date) {
      const y = v.getFullYear();
      const m = String(v.getMonth() + 1).padStart(2, '0');
      const d = String(v.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // если пришло ISO типа 1942-02-17T05:00:00.000Z — режем до даты
    if (typeof v === 'string') {
      return v.slice(0, 10);
    }

    return String(v);
  },
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
);

const nullableString = z.preprocess(
  emptyToNull,
  z.string().max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' }).nullable(),
);

/* ===================== DTOs ===================== */
export const checkSeniorDataSchema = z
  .object({
    id: z.coerce.number().int().optional(),
    homeId: z.coerce.number().int(),
    firstName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50'),
    patronymic: z
      .preprocess(
        toTrim,
        z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }),
      )
      .nullable(),
    lastName: z
      .preprocess(
        toTrim,
        z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }),
      )
      .nullable(),
    birthDate: nullableDateOnly,
  })
  .strict();

export const seniorIdSchema = z
  .object({ id: z.coerce.number().int().positive() })
  .strict();

export const seniorBlockingSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    causeOfRestriction: nonEmptyTrimMax(500, 'FORM_VALIDATION.TOO_LONG_500'),
  })
  .strict();

export const homeControlSchema = z.object(
  {
    id: z.number().int().positive(),
    name: z.string().min(1),
    fullPostalAddress: z.string().min(1),
    countryId: z.number().int().positive(),
    regionId: z.number().int().positive(),
    districtId: z.number().int().positive(),
    localityId: z.number().int().positive(),
  },
  'FORM_VALIDATION.REQUIRED',
);
export const spouseControlSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
  })
  .nullable();

/* ===================== Senior Draft ===================== */

export const seniorDraftSchema = z
  .object({
    id: nullableInt,
    firstName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50'),
    patronymic: z.preprocess(
      emptyToNull,
      z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }).nullable(),
    ),
    lastName: z.preprocess(
      emptyToNull,
      z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }).nullable(),
    ),
    birthDate: nullableDateOnly,
    confirmedFirstName: z.boolean(),
    confirmedPatronymic: z.boolean(),
    confirmedLastName: z.boolean(),
    confirmedBirthDate: z.boolean(),
    gender: z.enum(['male', 'female']),
    comment: nullableString,
    infoNote: nullableString,
    photoLink: nullableString,
    dateOfConsent: nullableDateOnly,
    personalNoAddr: z.boolean(),
    isRestricted: z.boolean(),
    causeOfRestriction: nullableString,
    dateOfRestriction: nullableIsoDate,
    kindergarten: nullableString,
    teacher: nullableString,
    veteran: nullableString,
    childOfWar: nullableString,
    profession: nullableString,
    honoraryStatus: nullableString,
    interests: nullableString,
    orthodoxBeliever: nullableString,
    dateOfStart: nullableIsoDate,
    dateOfExit: nullableIsoDate,
    homeId: positiveInt,
    spouseId: positiveInt.nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.isRestricted) {
      if (data.causeOfRestriction !== null) {
        ctx.addIssue({
          code: 'custom',
          path: ['causeOfRestriction'],
          message: 'Must be null when isRestricted is false',
        });
      }
      if (data.dateOfRestriction !== null) {
        ctx.addIssue({
          code: 'custom',
          path: ['dateOfRestriction'],
          message: 'Must be null when isRestricted is false',
        });
      }
    } else {
      if (!data.causeOfRestriction) {
        ctx.addIssue({
          code: 'custom',
          path: ['causeOfRestriction'],
          message: 'Required when isRestricted is true',
        });
      }
      if (!data.dateOfRestriction) {
        ctx.addIssue({
          code: 'custom',
          path: ['dateOfRestriction'],
          message: 'Required when isRestricted is true',
        });
      }
    }
  });

/* ===================== UpdateSeniorData ===================== */

// ChangingData.main — PATCH-like
export const changingMainSchema = z.object({
  firstName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50').optional(),
  patronymic: nullableString.optional(), //TODO: add TOO_LONG_50
  lastName: nullableString.optional(), //TODO: add TOO_LONG_50
  birthDate: nullableDateOnly.optional(),
  confirmedFirstName: z.boolean().optional(),
  confirmedPatronymic: z.boolean().optional(),
  confirmedLastName: z.boolean().optional(),
  confirmedBirthDate: z.boolean().optional(),
  gender: z.enum(['male', 'female']).optional(),
  comment: nullableString.optional(),
  infoNote: nullableString.optional(),
  photoLink: nullableString.optional(),
  dateOfConsent: nullableDateOnly.optional(),
  personalNoAddr: z.boolean().optional(),
  isRestricted: z.boolean().optional(),
  causeOfRestriction: nullableString.optional(),
  dateOfRestriction: nullableIsoDate.optional(),
  kindergarten: nullableString.optional(),
  teacher: nullableString.optional(),
  veteran: nullableString.optional(),
  childOfWar: nullableString.optional(),
  profession: nullableString.optional(),
  honoraryStatus: nullableString.optional(),
  interests: nullableString.optional(),
  orthodoxBeliever: nullableString.optional(),
  dateOfStart: nullableIsoDate.optional(),
  dateOfExit: nullableIsoDate.optional(),
  spouseId: positiveInt.nullable().optional(),
});

export const changingDataSchema = z
  .object({
    main: changingMainSchema.nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const m = data.main;
    if (!m) return;

    if (m.isRestricted === false) {
      if (m.causeOfRestriction !== undefined && m.causeOfRestriction !== null) {
        ctx.addIssue({
          code: 'custom',
          path: ['main', 'causeOfRestriction'],
          message: 'Must be null when isRestricted is false',
        });
      }
      if (m.dateOfRestriction !== undefined && m.dateOfRestriction !== null) {
        ctx.addIssue({
          code: 'custom',
          path: ['main', 'dateOfRestriction'],
          message: 'Must be null when isRestricted is false',
        });
      }
    }

    if (m.isRestricted === true) {
      if (m.causeOfRestriction === undefined || m.causeOfRestriction === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['main', 'causeOfRestriction'],
          message: 'Required when isRestricted is true',
        });
      }
      if (m.dateOfRestriction === undefined || m.dateOfRestriction === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['main', 'dateOfRestriction'],
          message: 'Required when isRestricted is true',
        });
      }
    }
  });

/* ========= OutdatingData ========= */
export const outdatingDataSchema = z
  .object({
    names: z
      .object({
        firstName: nonEmptyTrim,
        patronymic: z.preprocess(
          emptyToNull,
          z
            .string()
            .max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' })
            .nullable(),
        ),
        lastName: z.preprocess(
          emptyToNull,
          z
            .string()
            .max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' })
            .nullable(),
        ),
      })
      .strict()
      .nullable(),
  })
  .strict();

/* ========= DeletingData ========= */
export const deletingDataSchema = z
  .object({
    names: z.array(positiveInt).nullable(),
  })
  .strict();

/* ========= RestoringData ========= */
export const restoringDataSchema = z
  .object({
    names: z.array(positiveInt).nullable(),
  })
  .strict();

/* ========= UpdateSeniorData wrapper ========= */
export const updateSeniorDataSchema = z
  .object({
    id: positiveInt,
    changingData: changingDataSchema,
    restoringData: restoringDataSchema,
    outdatingData: outdatingDataSchema,
    deletingData: deletingDataSchema,
  })
  .strict();

/* ========= Senior query DTO ========= */
const sortDir = z.enum(['asc', 'desc']);

export const seniorsQueryDTOSchema = z
  .object({
    page: z.object({
      size: z.number().int().min(1),
      number: z.number().int().min(0),
    }),
    sort: z
      .array(z.object({ field: z.string().min(1), direction: sortDir }))
      .optional(),
    search: z
      .object({ value: z.string().min(1), exact: z.boolean().optional() })
      .optional(),
    view: z
      .object({
        option: z.string().min(1).optional(),
        homeOption: z.string().min(1).optional(),
        includeOutdated: z.boolean().optional(),
      })
      .optional(),
    filters: z
      .object({
        general: z
          .object({
            dateBeginningRange: z
              .tuple([z.coerce.date(), z.coerce.date()])
              .optional(),
            dateRestrictionRange: z
              .tuple([z.coerce.date(), z.coerce.date()])
              .optional(),
            dateExitRange: z
              .tuple([z.coerce.date(), z.coerce.date()])
              .optional(),

            dayRange: z.tuple([nullableInt, nullableInt]).optional(),
            monthRange: z.tuple([nullableInt, nullableInt]).optional(),
            yearRange: z.tuple([nullableInt, nullableInt]).optional(),

            homes: intOptArray,
            gender: z.enum(['male', 'female']),
            noAddress: z.boolean().optional(),
            specialHome: z.boolean().optional(),
            acceptableForSchool: z.boolean().optional(),

            details: z.array(z.string()).optional(),

            /* hasComment: z.boolean().optional(),
            hasPhotoLink: z.boolean().optional(),
            hasConsent: z.boolean().optional(),
            hasKindergartenStatus: z.boolean().optional(),
            hasTeacherStatus: z.boolean().optional(),
            hasHonoraryStatus: z.boolean().optional(),
            hasVeteranStatus: z.boolean().optional(),
            hasChildOfWarStatus: z.boolean().optional(),
            hasOrthodoxBelieverStatus: z.boolean().optional(),
            hasProfession: z.boolean().optional(),
            hasInterests: z.boolean().optional(),
            hasSpouse: z.boolean().optional(), */

            hideWithoutYear: z.boolean().optional(),
            hideWithoutBirthday: z.boolean().optional(),
          })
          .partial()
          .optional(),
        address: z
          .object({
            countries: intOptArray,
            regions: intOptArray,
            districts: intOptArray,
            localities: intOptArray,
          })
          .partial()
          .optional(),

        mode: z
          .object({
            strictAddress: z.boolean().optional(),
            strictContact: z.boolean().optional(),
            strictDetail: z.boolean().optional(),
          })
          .partial()
          .optional(),
      })
      .partial()
      .optional(),
  })
  .strict();

/* ===================== OutdatedData (view) ===================== */

export const outdatedDataSchema = z
  .object({
    names: z.array(outdatedNameItemSchema),
  })
  .strict();

/* ===================== Senior (view) & seniors list ===================== */
export const seniorAddressSchema = z
  .object({
    country: addressRefFullSchema,
    region: addressRefShortSchema,
    district: addressRefShortSchema,
    locality: addressRefShortSchema,
    fullPostalAddress: nonEmpty,
    // id: positiveInt
  })
  .strict();

export const seniorSchema = z
  .object({
    id: positiveInt,
    firstName: nonEmpty,
    patronymic: nonEmpty.nullable(),
    lastName: nonEmpty.nullable(),
    isRestricted: z.boolean(),
    dateOfStart: z.coerce.date(),
    causeOfRestriction: nonEmpty.nullable(),
    dateOfRestriction: nullableIsoDate,
    address: seniorAddressSchema,
    comment: nonEmpty.nullable(),

    birthDate: nullableIsoDate,
    confirmedFirstName: z.boolean(),
    confirmedPatronymic: z.boolean(),
    confirmedLastName: z.boolean(),
    confirmedBirthDate: z.boolean(),

    gender: z.enum(['male', 'female']),
    infoNote: nullableString,
    photoLink: nullableString,
    dateOfConsent: nullableIsoDate,

    personalNoAddr: z.boolean(),
    kindergarten: nullableString,
    teacher: nullableString,
    veteran: nullableString,
    childOfWar: nullableString,
    profession: nullableString,
    honoraryStatus: nullableString,
    interests: nullableString,
    orthodoxBeliever: nullableString,
    dateOfExit: nullableIsoDate,
    spouseFullName: nonEmpty.nullable(),
    spouseId: positiveInt.nullable(),
    homeId: positiveInt,
    home: z.object({
      homeName: nonEmpty,
      noAddress: z.boolean(),
      specialHome: z.boolean(),
      acceptableForSchool: z.boolean(),
      isRestricted: z.boolean(),
      dateOfRestriction: z.coerce.date(),
      isClose: z.boolean(),
      dateOfClose: z.coerce.date(),
    }),
    //homeName: nonEmpty,
    outdatedData: outdatedDataSchema,
  })
  .strict();

export const seniorsSchema = z
  .object({
    list: z.array(seniorSchema),
    length: z.coerce.number().int().min(0),
  })
  .strict();

/* ===================== Types ===================== */
//export type SeniorDuplicates = z.infer<typeof duplicatesSchema>;
//export type SeniorDraft = z.infer<typeof seniorDraftSchema>;

export type SeniorOutdatedData = z.infer<typeof outdatedDataSchema>;

export type SeniorChangingData = z.infer<typeof changingDataSchema>;
//export type SeniorRestoringData = z.infer<typeof restoringDataSchema>;
//export type SeniorOutdatingData = z.infer<typeof outdatingDataSchema>;
//export type SeniorDeletingData = z.infer<typeof deletingDataSchema>;
//export type OutdatedHome = z.infer<typeof coordinationItemSchema>;
export type SeniorAddress = z.infer<typeof seniorAddressSchema>;
