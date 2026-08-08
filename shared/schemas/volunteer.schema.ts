import { z } from 'zod';
import {
  toTrim,
  emptyToNull,
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
import { draftAddressSchema, addressSchema } from './common.schema.js';
import { contactType, optionalContactsSchema } from './common.schema.js';
import { changingContactsSchema } from './common.schema.js';
import {
  outdatedNameItemSchema,
  outdatedAddressItemSchema,
} from './common.schema.js';

const instituteItemSchema = z
  .object({
    category: nonEmpty,
    instituteName: nonEmpty,
    isDeletable: z.boolean(),
    id: positiveInt,
  })
  .strict();

const draftInstituteItemSchema = z
  .object({
    category: nonEmpty,
    instituteName: nonEmpty,
  })
  .strict();

const subsItemSchema = z
  .object({
    userName: nonEmpty,
    userId: positiveInt,
    id: positiveInt,
    userFullName: nonEmpty,
    isRestricted: z.boolean().optional(),
    isRecoverable: z.boolean().optional(),
    isDeletable: z.boolean().optional(),
  })
  .strict();
const coopItemSchema = z
  .object({
    userName: nonEmpty,
    userId: positiveInt,
    id: positiveInt,
    userFullName: nonEmpty,
    isRestricted: z.boolean().optional(),
    isRecoverable: z.boolean().optional(),
    isDeletable: z.boolean().optional(),
  })
  .strict();

/* ===================== Some Schemas for form validation ===================== */
export const instituteNameControlSchema = z.preprocess(
  toTrim,
  z
    .string()
    .min(1, 'FORM_VALIDATION.REQUIRED')
    .min(5, 'FORM_VALIDATION.TOO_SHORT_5')
    .max(150, 'FORM_VALIDATION.TOO_LONG_150'),
);

export const instituteCategoryControlSchema = z.preprocess(
  emptyToNull,
  z.string({ message: 'FORM_VALIDATION.REQUIRED' }),
);
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
export const checkVolunteerDataSchema = z
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

export const volunteerIdSchema = z
  .object({ id: z.coerce.number().int().positive() })
  .strict();

export const volunteerBlockingSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    causeOfRestriction: nonEmptyTrimMax(500, 'FORM_VALIDATION.TOO_LONG_500'),
  })
  .strict();

/* ===================== Volunteer Draft ===================== */

export const volunteerDraftSchema = z
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
    draftInstitutes: z.array(draftInstituteItemSchema),
    draftSubscriptions: z.array(positiveInt),
    draftCooperations: z.array(positiveInt),
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

/* ===================== UpdateVolunteerData ===================== */

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
    institutes: z.array(draftInstituteItemSchema).nullable(),
    subscriptions: z.array(positiveInt).nullable(),
    cooperations: z.array(positiveInt).nullable(),
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
    institutes: z.array(positiveInt).nullable(),
  })
  .strict();

/* ========= DeletingData ========= */
export const deletingDataSchema = z
  .object({
    names: z.array(positiveInt).nullable(),
    addresses: z.array(positiveInt).nullable(),
    contacts: z.array(positiveInt).nullable(),
    institutes: z.array(positiveInt).nullable(),
    subscriptions: z.array(positiveInt).nullable(),
  })
  .strict();

/* ========= RestoringData ========= */
export const restoringDataSchema = z
  .object({
    addresses: z.array(positiveInt).nullable(),
    names: z.array(positiveInt).nullable(),
    contacts: optionalContactsSchema.nullable(),
    institutes: z.array(positiveInt).nullable(),
  })
  .strict();

/* ========= UpdateVolunteerData wrapper ========= */
export const updateVolunteerDataSchema = z
  .object({
    id: positiveInt,
    changingData: changingDataSchema,
    restoringData: restoringDataSchema,
    outdatingData: outdatingDataSchema,
    deletingData: deletingDataSchema,
  })
  .strict();

/* ========= Volunteer query DTO ========= */

const sortDir = z.enum(['asc', 'desc']);

export const volunteersQueryDTOSchema = z
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
            subscriptions: z.array(positiveInt).min(1).optional(),
            cooperations: z.array(positiveInt).min(1).optional(),
            categories: z.array(nonEmpty).min(1).optional(),
            details: z.array(z.string()).optional(),
            dateBeginningRange: z
              .tuple([z.coerce.date(), z.coerce.date()])
              .optional(),
            dateRestrictionRange: z
              .tuple([z.coerce.date(), z.coerce.date()])
              .optional(),
            dateLastOrderRange: z
              .tuple([z.coerce.date(), z.coerce.date()])
              .optional(),
            contactTypes: z.array(contactType).min(1).optional(),
            hasInstitute: z.boolean().optional(),
            hasSubscription: z.boolean().optional(),
            hasCooperation: z.boolean().optional(),
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

export const outdatedDataSchema = z
  .object({
    contacts: optionalContactsSchema,
    addresses: z.array(outdatedAddressItemSchema),
    names: z.array(outdatedNameItemSchema),
    institutes: z.array(instituteItemSchema), //TODO:
    subscriptions: z.array(subsItemSchema),
    cooperations: z.array(coopItemSchema),
  })
  .strict();

/* ===================== Volunteer (view) & volunteers list ===================== */

export const volunteerSchema = z
  .object({
    id: positiveInt,
    firstName: nonEmpty,
    patronymic: nonEmpty.nullable(),
    lastName: nonEmpty.nullable(),
    isRestricted: z.boolean(),
    dateOfStart: z.coerce.date(),
    causeOfRestriction: nonEmpty.nullable(),
    dateOfRestriction: nullableIsoDate,
    dateOfLastOrder: nullableIsoDate,
    address: addressSchema,
    comment: nonEmpty.nullable(),
    orderedContacts: optionalContactsSchema,
    outdatedData: outdatedDataSchema,
    institutes: z.array(instituteItemSchema),
    subscriptions: z.array(subsItemSchema),
    cooperations: z.array(coopItemSchema),
  })
  .strict();

export const volunteersSchema = z
  .object({
    list: z.array(volunteerSchema),
    length: z.coerce.number().int().min(0),
  })
  .strict();

export const contactOptionSchema = z
  .object({
    id: positiveInt,
    volunteerId: positiveInt,
    type: z.string(),
    content: z.string(),
  })
  .strict();

/* ===================== Types ===================== */
export type VolunteerDraft = z.infer<typeof volunteerDraftSchema>;
export type VolunteerDraftContacts = z.infer<typeof draftContactsSchema>;

export type VolunteerOutdatedData = z.infer<typeof outdatedDataSchema>;

export type VolunteerChangingData = z.infer<typeof changingDataSchema>;
export type VolunteerOutdatingData = z.infer<typeof outdatingDataSchema>;
export type Institute = z.infer<typeof instituteItemSchema>;
export type OutdatedInstitute = z.infer<typeof instituteItemSchema>;
export type Cooperation = z.infer<typeof coopItemSchema>;
export type Subscription = z.infer<typeof subsItemSchema>;
export type ContactOption = z.infer<typeof contactOptionSchema>;
