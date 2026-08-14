import { number, z } from 'zod';
import {
  toTrim,
  emptyToNull,
  toLowerTrim,
  keepE164Chars,
  keepE164CharsNullable,
  nonEmptyString,
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

/* ===================== Some Schemas for form validation ===================== */

export const emailControlSchema = z
  .preprocess(
    emptyToNull,
    z.email({ message: 'FORM_VALIDATION.CONTACT.INVALID_CONTACT' }).nullable(),
  )
  .superRefine((v, ctx) => {
    if (v) {
      if (v.length > 254)
        ctx.addIssue({
          code: 'custom',
          message: 'FORM_VALIDATION.CONTACT.INVALID_CONTACT',
        });
      const [local] = v.split('@');
      if (local && local.length > 64)
        ctx.addIssue({
          code: 'custom',
          message: 'FORM_VALIDATION.CONTACT.INVALID_CONTACT',
        });
    }
  });

export const phoneNumberControlSchema = z
  .preprocess(keepE164Chars, z.string().nullable())
  .superRefine((val, ctx) => {
    if (val && !val.startsWith('+')) {
      ctx.addIssue({
        code: 'custom',
        message: 'FORM_VALIDATION.CONTACT.INVALID_CONTACT',
      });
      return;
    }
    if (val && val.startsWith('+7')) {
      if (!/^\+7\d{10}$/.test(val)) {
        ctx.addIssue({
          code: 'custom',
          message: 'FORM_VALIDATION.CONTACT.INVALID_CONTACT',
        });
      }
      return;
    }
    if (val && !/^\+[1-9]\d{7,14}$/.test(val)) {
      ctx.addIssue({
        code: 'custom',
        message: 'FORM_VALIDATION.CONTACT.INVALID_CONTACT',
      });
    }
  });

export const telegramIdControlSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^#[0-9]{7,10}$/, 'FORM_VALIDATION.CONTACT.INVALID_CONTACT')
    .nullable(),
);

export const whatsAppControlSchema = z
  .preprocess(keepE164CharsNullable, z.string().nullable())
  .superRefine((val, ctx) => {
    if (val && !val.startsWith('+')) {
      ctx.addIssue({
        code: 'custom',
        message: 'FORM_VALIDATION.CONTACT.INVALID_CONTACT',
      });
      return;
    }
    if (val && val.startsWith('+7')) {
      if (!/^\+7\d{10}$/.test(val)) {
        ctx.addIssue({
          code: 'custom',
          message: 'FORM_VALIDATION.CONTACT.INVALID_CONTACT',
        });
      }
      return;
    }
    if (val && !/^\+[1-9]\d{7,14}$/.test(val)) {
      ctx.addIssue({
        code: 'custom',
        message: 'FORM_VALIDATION.CONTACT.INVALID_CONTACT',
      });
    }
  });

export const telegramNicknameControlSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^@[A-Za-z0-9_]{5,32}$/, 'FORM_VALIDATION.CONTACT.INVALID_CONTACT')
    .nullable(),
);

export const vKontakteControlSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(
      /^[A-Za-z0-9](?:[A-Za-z0-9_]|(?:\.(?!\.))){3,30}[A-Za-z0-9]$/,
      'FORM_VALIDATION.CONTACT.INVALID_CONTACT',
    )
    .nullable(),
);

export const instagramControlSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(
      /^[A-Za-z0-9_](?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}[A-Za-z0-9_]$/,
      'FORM_VALIDATION.CONTACT.INVALID_CONTACT',
    )
    .nullable(),
);

export const facebookControlSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^[A-Za-z0-9_.]{5,}$/, 'FORM_VALIDATION.CONTACT.INVALID_CONTACT')
    .nullable(),
);

export const websiteControlSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(
      /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i,
      'Invalid website URL',
    )
    .nullable(),
);

export const otherContactControlSchema = z.preprocess(
  emptyToNull,
  z.string().max(256, { message: 'FORM_VALIDATION.TOO_LONG_256' }).nullable(),
);

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
    website: z.array(websiteSchema),
    otherContact: z.array(otherContactSchema),
  })
  .strict()
  .superRefine((o, ctx) => {
    const hasAny = Object.values(o).some(
      (arr) => Array.isArray(arr) && arr.length > 0,
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
        z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }),
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
    patronymic: z.preprocess(
      emptyToNull,
      z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }).nullable(),
    ),
    lastName: z.preprocess(
      emptyToNull,
      z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }).nullable(),
    ),
    affiliation: nonEmptyString,
    position: z.preprocess(
      emptyToNull,
      z
        .string()
        .trim()
        .max(150, { message: 'FORM_VALIDATION.TOO_LONG_150' })
        .nullable(),
    ),

    draftAddress: draftAddressSchema,
    comment: z.preprocess(
      emptyToNull,
      z
        .string()
        .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
        .nullable(),
    ),

    isRestricted: z.boolean(),
    causeOfRestriction: z.preprocess(
      emptyToNull,
      z
        .string()
        .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
        .nullable(),
    ),
    dateOfRestriction: nullableIsoDate,
    draftContacts: draftContactsSchema,
    draftCoordinations: z.array(positiveInt),
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
      .preprocess(
        emptyToNull,
        z
          .string()
          .max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' })
          .nullable(),
      )
      .optional(),
    lastName: z
      .preprocess(
        emptyToNull,
        z
          .string()
          .max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' })
          .nullable(),
      )
      .optional(),

    affiliation: z.string().optional(),

    position: z
      .preprocess(
        emptyToNull,
        z
          .string()
          .max(150, { message: 'FORM_VALIDATION.TOO_LONG_150' })
          .nullable(),
      )
      .optional(),

    comment: z
      .preprocess(
        emptyToNull,
        z
          .string()
          .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
          .nullable(),
      )
      .optional(),

    isRestricted: z.boolean().optional(),
    causeOfRestriction: z
      .preprocess(
        emptyToNull,
        z
          .string()
          .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
          .nullable(),
      )
      .optional(),
    dateOfRestriction: nullableIsoDate.optional(),
  })
  .strict();

export const changingDataSchema = z
  .object({
    main: changingMainSchema.nullable(),
    address: draftAddressSchema.nullable(),
    contacts: changingContactsSchema.nullable(),
    coordinations: z.array(positiveInt).nullable(),
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
    coordinations: z.array(positiveInt).nullable(),
  })
  .strict();

/* ========= DeletingData ========= */
export const deletingDataSchema = z
  .object({
    names: z.array(positiveInt).nullable(),
    addresses: z.array(positiveInt).nullable(),
    contacts: z.array(positiveInt).nullable(),
    coordinations: z.array(positiveInt).nullable(),
  })
  .strict();

/* ========= RestoringData ========= */
export const restoringDataSchema = z
  .object({
    addresses: z.array(positiveInt).nullable(),
    names: z.array(positiveInt).nullable(),
    contacts: optionalContactsSchema.nullable(),
    coordinations: z.array(positiveInt).nullable(),
  })
  .strict();

/* ========= UpdatePartnerData wrapper ========= */
export const updatePartnerDataSchema = z
  .object({
    id: positiveInt,
    changingData: changingDataSchema,
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
      size: z.number().int().min(0),
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
            affiliations: z.array(nonEmptyString).min(1).optional(),
            dateBeginningRange: z
              .tuple([z.coerce.date(), z.coerce.date()])
              .optional(),
            dateRestrictionRange: z
              .tuple([z.coerce.date(), z.coerce.date()])
              .optional(),
            contactTypes: z.array(contactType).min(1).optional(),
            details: z.array(z.string()).optional(),
            hasCoordination: z.boolean().optional(),
            homes: intOptArray,
            homeRegions: intOptArray,
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
        //houses
      })
      .partial()
      .optional(),
  })
  .strict();

/* ===================== OutdatedData (view) ===================== */

const coordinationItemSchema = z.object({
  partnerContacts: optionalContactsSchema.optional(),
  partnerName: nonEmptyString.optional(),
  homeName: nonEmptyString.optional(),
  regionName: nonEmptyString.optional(),
  partnerId: positiveInt,
  homeId: positiveInt,
  isRecoverable: z.boolean(),
  id: positiveInt,
  homeStatus: z.string().optional(),
});

export const outdatedDataSchema = z
  .object({
    contacts: optionalContactsSchema,
    addresses: z.array(outdatedAddressItemSchema),
    names: z.array(outdatedNameItemSchema),
    coordinations: z.array(coordinationItemSchema), //TODO:
  })
  .strict();

/* ===================== Partner (view) & partners list ===================== */

export const partnerSchema = z
  .object({
    id: positiveInt,
    firstName: nonEmptyString,
    patronymic: nonEmptyString.nullable(),
    lastName: nonEmptyString.nullable(),
    affiliation: nonEmptyString,
    position: nonEmptyString.nullable(),
    isRestricted: z.boolean(),
    dateOfStart: z.coerce.date(),
    causeOfRestriction: nonEmptyString.nullable(),
    dateOfRestriction: nullableIsoDate,
    address: addressSchema,
    comment: nonEmptyString.nullable(),
    orderedContacts: optionalContactsSchema,
    outdatedData: outdatedDataSchema,
    coordinations: z.array(coordinationItemSchema),
  })
  .strict();

export const partnersSchema = z
  .object({
    list: z.array(partnerSchema),
    length: z.coerce.number().int().min(0),
  })
  .strict();

/* ===================== Types ===================== */
//export type PartnerDuplicates = z.infer<typeof duplicatesSchema>;
export type PartnerDraft = z.infer<typeof partnerDraftSchema>;
export type PartnerDraftContacts = z.infer<typeof draftContactsSchema>;

export type PartnerOutdatedData = z.infer<typeof outdatedDataSchema>;

export type PartnerChangingData = z.infer<typeof changingDataSchema>;
//export type PartnerRestoringData = z.infer<typeof restoringDataSchema>;
export type PartnerOutdatingData = z.infer<typeof outdatingDataSchema>;
//export type PartnerDeletingData = z.infer<typeof deletingDataSchema>;
export type OutdatedHome = z.infer<typeof coordinationItemSchema>;
