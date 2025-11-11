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
  changingAddressSchema,
  changingContactsSchema,
} from './common.schema.js';
import {
  outdatedNameItemSchema,
  outdatedAddressItemSchema,
} from './common.schema.js';

/* ===================== Contacts (draft / ordered / optional) ===================== */

// Draft
export const draftContactsSchema = z
  .object({
    email: z.array(emailSchema),
    phoneNumber: z.array(phoneNumberSchema),
    whatsApp: z.array(phoneNumberSchema),
    telegramNickname: z.array(telegramNicknameSchema),
    telegramId: z.array(telegramIdSchema),
    telegramPhoneNumber: z.array(phoneNumberSchema),
    vKontakte: z.array(vKontakteSchema),
    instagram: z.array(instagramSchema),
    facebook: z.array(facebookSchema),
    otherContact: z.array(otherContactSchema),
  })
  .strict()
  .superRefine((o, ctx) => {
    const hasAny = Object.values(o).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    );
    if (!hasAny) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'FORM_VALIDATION.MIN_ONE_CONTACT',
      });
    }
  });

/* ===================== DTOs ===================== */
export const checkPartnerDataSchema = z
  .object({
    id: z.coerce.number().int().optional(),
    firstName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50'),
    lastName: z
      .preprocess(
        toTrim,
        z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' })
      )
      .nullable(),
    contacts: draftContactsSchema,
  })
  .strict();

export const partnerIdSchema = z
  .object({ id: z.coerce.number().int().positive() })
  .strict();

export const partnerBlockingSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    causeOfRestriction: nonEmptyTrimMax(500, 'FORM_VALIDATION.TOO_LONG_500'),
  })
  .strict();

/* ===================== Partner Draft ===================== */

export const partnerDraftSchema = z
  .object({
    id: nullableInt,
    firstName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50'),
    patronymic: z
      .preprocess(
        toTrim,
        z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' })
      )
      .nullable(),
    lastName: z
      .preprocess(
        toTrim,
        z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' })
      )
      .nullable(),
    affiliation: z.enum([
      'PARTNER.AFF.VOLUNTEER_COORDINATOR',
      'PARTNER.AFF.HOME_REPRESENTATIVE',
      'PARTNER.AFF.FOUNDATION_STAFF',
    ]),
    position: z
      .string()
      .trim()
      .max(150, { message: 'FORM_VALIDATION.TOO_LONG_150' })
      .nullable(),

    draftAddress: draftAddressSchema,
    comment: z.preprocess(
      emptyToNull,
      z
        .string()
        .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
        .nullable()
    ),

    isRestricted: z.boolean(),
    causeOfRestriction: z.preprocess(
      emptyToNull,
      z
        .string()
        .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
        .nullable()
    ),
    dateOfRestriction: nullableIsoDate,

    draftContacts: draftContactsSchema,
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

/* ===================== UpdatePartnerData ===================== */

// ChangingData.main — PATCH-like
export const changingMainSchema = z
  .object({
    firstName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50').optional(),
    patronymic: z
      .string()
      .trim()
      .max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' })
      .nullable()
      .optional(),
    lastName: z
      .string()
      .trim()
      .max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' })
      .nullable()
      .optional(),

    affiliation: z.enum([
      'PARTNER.AFF.VOLUNTEER_COORDINATOR',
      'PARTNER.AFF.HOME_REPRESENTATIVE',
      'PARTNER.AFF.FOUNDATION_STAFF',
    ]),

    position: z
      .string()
      .trim()
      .max(150, { message: 'FORM_VALIDATION.TOO_LONG_150' })
      .nullable()
      .optional(),

    comment: z
      .preprocess(
        emptyToNull,
        z
          .string()
          .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
          .nullable()
      )
      .optional(),

    isRestricted: z.boolean().optional(),
    causeOfRestriction: z
      .preprocess(
        emptyToNull,
        z
          .string()
          .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
          .nullable()
      )
      .optional(),
    dateOfRestriction: nullableIsoDate.optional(),
  })
  .strict();

export const changingDataSchema = z
  .object({
    main: changingMainSchema.nullable(),
    address: changingAddressSchema.nullable(),
    contacts: changingContactsSchema.nullable(),
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
    address: positiveInt.nullable(),
    names: z
      .object({
        firstName: nonEmptyTrim,
        patronymic: z.preprocess(toTrim, z.string().min(1)).nullable(),
        lastName: z.preprocess(toTrim, z.string().min(1)).nullable(),
      })
      .strict()
      .nullable(),
    contacts: z.array(positiveInt).nullable(),
    homes: z.array(positiveInt).nullable(),
  })
  .strict();

/* ========= DeletingData ========= */
export const deletingDataSchema = z
  .object({
    names: z.array(positiveInt).nullable(),
    addresses: z.array(positiveInt).nullable(),
    contacts: z.array(positiveInt).nullable(),
    homes: z.array(positiveInt).nullable(),
  })
  .strict();

/* ========= RestoringData ========= */
export const restoringDataSchema = z
  .object({
    addresses: z.array(positiveInt).nullable(),
    names: z.array(positiveInt).nullable(),
    contacts: optionalContactsSchema.nullable(),
    homes: z.array(positiveInt).nullable(),
  })
  .strict();

/* ========= UpdatePartnerData wrapper ========= */
export const updatePartnerDataSchema = z
  .object({
    id: positiveInt,
    changes: changingDataSchema,
    restoringData: restoringDataSchema,
    outdatingData: outdatingDataSchema,
    deletingData: deletingDataSchema,
  })
  .strict();

/* ========= Partner query DTO ========= */

const sortDir = z.enum(['asc', 'desc']);

export const partnersQueryDTOSchema = z
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
        includeOutdated: z.boolean().optional(),
      })
      .optional(),
    filters: z
      .object({
        general: z
          .object({
            affiliations: z
              .array(
                z.enum([
                  'PARTNER.AFF.VOLUNTEER_COORDINATOR',
                  'PARTNER.AFF.HOME_REPRESENTATIVE',
                  'PARTNER.AFF.FOUNDATION_STAFF',
                ])
              )
              .min(1)
              .optional(),
            comment: z.boolean().optional(),
            dateBeginningRange: z
              .tuple([z.coerce.date(), z.coerce.date()])
              .optional(),
            dateRestrictionRange: z
              .tuple([z.coerce.date(), z.coerce.date()])
              .optional(),
            contactTypes: z.array(contactType).min(1).optional(),
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
          })
          .partial()
          .optional(),
        //houses
      })
      .partial()
      .optional(),
  })
  .strict();

/* ===================== OutdatedData (view) ===================== */

const outdatedHomesItemSchema = z
  .object({
    name: nonEmpty,
    id: positiveInt,
  })
  .strict();

export const outdatedDataSchema = z
  .object({
    contacts: optionalContactsSchema,
    addresses: z.array(outdatedAddressItemSchema),
    names: z.array(outdatedNameItemSchema),
    homes: z.array(outdatedHomesItemSchema), //TODO:
  })
  .strict();

/* ===================== Partner (view) & partners list ===================== */

export const partnerSchema = z
  .object({
    id: positiveInt,
    partnerName: nonEmpty,
    firstName: nonEmpty,
    patronymic: nonEmpty.nullable(),
    lastName: nonEmpty.nullable(),
    affiliation: nonEmpty,
    position: nonEmpty.nullable(),
    isRestricted: z.boolean(),
    dateOfStart: z.coerce.date(),
    causeOfRestriction: nonEmpty.nullable(),
    dateOfRestriction: nullableIsoDate,
    address: addressSchema,
    comment: nonEmpty.nullable(),
    orderedContacts: optionalContactsSchema,
    outdatedData: outdatedDataSchema,
    homes: z.array(outdatedHomesItemSchema).nullable(),
  })
  .strict();

export const partnersSchema = z
  .object({
    list: z.array(partnerSchema),
    length: z.coerce.number().int().min(0),
  })
  .strict();

export const duplicatesSchema = z
  .object({
    duplicatesName: z.array(z.string()),
    duplicatesContact: z.array(
      z
        .object({
          type: z.string(),
          content: z.string(),
          partners: z.array(z.string()),
        })
        .strict()
    ),
  })
  .strict();

/* ===================== Types ===================== */
export type PartnerDuplicates = z.infer<typeof duplicatesSchema>;
export type PartnerDraft = z.infer<typeof partnerDraftSchema>;
export type PartnerDraftContacts = z.infer<typeof draftContactsSchema>;

export type PartnerOutdatedData = z.infer<typeof outdatedDataSchema>;

export type PartnerChangingData = z.infer<typeof changingDataSchema>;
//export type PartnerRestoringData = z.infer<typeof restoringDataSchema>;
export type PartnerOutdatingData = z.infer<typeof outdatingDataSchema>;
//export type PartnerDeletingData = z.infer<typeof deletingDataSchema>;
export type OutdatedHome = z.infer<typeof outdatedHomesItemSchema>;
