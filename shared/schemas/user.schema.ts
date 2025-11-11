import { z } from 'zod';
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

/* ===================== Some Schemas for form validation ===================== */

export const causeOfRestrictionControlSchema = z.preprocess(
  toTrim,
  z
    .string()
    .min(1, 'FORM_VALIDATION.REQUIRED')
    .min(5, 'FORM_VALIDATION.TOO_SHORT_5')
    .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
);

export const emailControlSchema = z
  .preprocess(
    toLowerTrim,
    z.email({ message: 'FORM_VALIDATION.CONTACT.INVALID_CONTACT' })
  )
  .superRefine((v, ctx) => {
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
  });

export const phoneNumberControlSchema = z
  .preprocess(keepE164Chars, z.string().min(1, 'FORM_VALIDATION.REQUIRED'))
  .superRefine((val, ctx) => {
    if (!val.startsWith('+')) {
      ctx.addIssue({
        code: 'custom',
        message: 'FORM_VALIDATION.CONTACT.INVALID_CONTACT',
      });
      return;
    }
    if (val.startsWith('+7')) {
      if (!/^\+7\d{10}$/.test(val)) {
        ctx.addIssue({
          code: 'custom',
          message: 'FORM_VALIDATION.CONTACT.INVALID_CONTACT',
        });
      }
      return;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(val)) {
      ctx.addIssue({
        code: 'custom',
        message: 'FORM_VALIDATION.CONTACT.INVALID_CONTACT',
      });
    }
  });
export const telegramIdControlSchema = z.preprocess(
  toTrim,
  z
    .string()
    .min(1, 'FORM_VALIDATION.REQUIRED')
    .regex(/^#[0-9]{7,10}$/, 'FORM_VALIDATION.CONTACT.INVALID_CONTACT')
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
    .nullable()
);

export const vKontakteControlSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(
      /^[A-Za-z0-9](?:[A-Za-z0-9_]|(?:\.(?!\.))){3,30}[A-Za-z0-9]$/,
      'FORM_VALIDATION.CONTACT.INVALID_CONTACT'
    )
    .nullable()
);

export const instagramControlSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(
      /^[A-Za-z0-9_](?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}[A-Za-z0-9_]$/,
      'FORM_VALIDATION.CONTACT.INVALID_CONTACT'
    )
    .nullable()
);

export const facebookControlSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^[A-Za-z0-9_.]{5,}$/, 'FORM_VALIDATION.CONTACT.INVALID_CONTACT')
    .nullable()
);

export const otherContactControlSchema = z.preprocess(
  emptyToNull,
  z.string().max(256, { message: 'FORM_VALIDATION.TOO_LONG_256' }).nullable()
);

/* ===================== Contacts (draft / ordered / optional) ===================== */

// Draft
export const draftContactsSchema = z
  .object({
    email: z.array(emailSchema).nonempty('FORM_VALIDATION.CONTACT.MIN_CONTACT'),
    phoneNumber: z
      .array(phoneNumberSchema)
      .nonempty('FORM_VALIDATION.CONTACT.MIN_CONTACT'),
    whatsApp: z.array(phoneNumberSchema),
    telegramNickname: z.array(telegramNicknameSchema),
    telegramId: z
      .array(telegramIdSchema)
      .nonempty('FORM_VALIDATION.CONTACT.MIN_CONTACT'),
    telegramPhoneNumber: z
      .array(phoneNumberSchema)
      .nonempty('FORM_VALIDATION.CONTACT.MIN_CONTACT'),
    vKontakte: z.array(vKontakteSchema),
    instagram: z.array(instagramSchema),
    facebook: z.array(facebookSchema),
    otherContact: z.array(otherContactSchema),
  })
  .strict();

// Ordered contacts object
export const contactsSchema = z
  .object({
    email: nonEmptyContacts,
    phoneNumber: nonEmptyContacts,
    whatsApp: nonEmptyContacts.optional(),
    telegram: nonEmptyContacts,
    telegramNickname: nonEmptyContacts.optional(),
    telegramId: nonEmptyContacts,
    telegramPhoneNumber: nonEmptyContacts,
    vKontakte: nonEmptyContacts.optional(),
    instagram: nonEmptyContacts.optional(),
    facebook: nonEmptyContacts.optional(),
    otherContact: nonEmptyContacts.optional(),
  })
  .strict();

// Optional variant
/* export const optionalContactsSchema = z
  .object({
    email: z.array(contactSchema).optional(),
    phoneNumber: z.array(contactSchema).optional(),
    whatsApp: z.array(contactSchema).optional(),
    telegram: z.array(contactSchema).optional(),
    telegramNickname: z.array(contactSchema).optional(),
    telegramId: z.array(contactSchema).optional(),
    telegramPhoneNumber: z.array(contactSchema).optional(),
    vKontakte: z.array(contactSchema).optional(),
    instagram: z.array(contactSchema).optional(),
    facebook: z.array(contactSchema).optional(),
    otherContact: z.array(contactSchema).optional(),
  })
  .strict(); */

/* ===================== Small DTOs ===================== */

export const userIdSchema = z
  .object({ id: z.coerce.number().int().positive() })
  .strict();

export const userBlockingSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    causeOfRestriction: nonEmptyTrimMax(500, 'FORM_VALIDATION.TOO_LONG_500'),
  })
  .strict();

export const checkUserNameSchema = z
  .object({
    userName: z.preprocess(toTrim, z.string().min(1).max(20)),
    id: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const checkUserDataSchema = z
  .object({
    id: z.coerce.number().int().optional(),
    firstName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50'),
    lastName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50'),
    contacts: draftContactsSchema,
  })
  .strict();

/* ===================== User Draft ===================== */

export const userDraftSchema = z
  .object({
    id: nullableInt,
    userName: z.preprocess(
      toTrim,
      z
        .string()
        .min(5, { message: 'FORM_VALIDATION.TOO_SHORT_5' })
        .max(20, { message: 'FORM_VALIDATION.TOO_LONG_20' })
    ),
    password: z.preprocess(
      toTrim,
      z
        .string()
        .min(8, 'FORM_VALIDATION.USER.MIN_PASSWORD')
        .regex(/[A-Za-z]/, 'FORM_VALIDATION.USER.LETTER_PASSWORD')
        .regex(/\d/, 'FORM_VALIDATION.USER.DIGIT_PASSWORD')
    ),
    firstName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50'),
    patronymic: z
      .preprocess(
        toTrim,
        z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' })
      )
      .nullable(),
    lastName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50'),
    roleId: z.number({ message: 'FORM_VALIDATION.REQUIRED' }).int().positive(),

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

/* ===================== Password change ===================== */

export const changePasswordSchema = z
  .object({
    userId: positiveInt,
    newPassword: z.preprocess(
      toTrim,
      z
        .string()
        .min(8, 'FORM_VALIDATION.USER.MIN_PASSWORD')
        .regex(/[A-Za-z]/, 'FORM_VALIDATION.USER.LETTER_PASSWORD')
        .regex(/\d/, 'FORM_VALIDATION.USER.DIGIT_PASSWORD')
    ),
    currentPassword: z.string().trim().min(8).optional(),
  })
  .strict();

/* ===================== UpdateUserData ===================== */

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
    lastName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50').optional(),

    userName: z
      .preprocess(
        toTrim,
        z
          .string()
          .min(5, { message: 'FORM_VALIDATION.TOO_SHORT_5' })
          .max(20, { message: 'FORM_VALIDATION.TOO_LONG_20' })
      )
      .optional(),
    roleId: positiveInt.optional(),
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
        lastName: nonEmptyTrim,
      })
      .strict()
      .nullable(),
    userName: z.preprocess(toTrim, z.string().min(1)).nullable(),
    contacts: z.array(positiveInt).nullable(),
  })
  .strict();

/* ========= DeletingData ========= */
export const deletingDataSchema = z
  .object({
    userNames: z.array(positiveInt).nullable(),
    names: z.array(positiveInt).nullable(),
    addresses: z.array(positiveInt).nullable(),
    contacts: z.array(positiveInt).nullable(),
  })
  .strict();

/* ========= RestoringData ========= */
export const restoringDataSchema = z
  .object({
    addresses: z.array(positiveInt).nullable(),
    names: z.array(positiveInt).nullable(),
    userNames: z.array(positiveInt).nullable(),
    contacts: optionalContactsSchema.nullable(),
  })
  .strict();

/* ========= UpdateUserData wrapper ========= */
export const updateUserDataSchema = z
  .object({
    id: positiveInt,
    changes: changingDataSchema,
    restoringData: restoringDataSchema,
    outdatingData: outdatingDataSchema,
    deletingData: deletingDataSchema,
  })
  .strict();

/* ========= Users query DTO ========= */

const sortDir = z.enum(['asc', 'desc']);

export const usersQueryDTOSchema = z
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
            roles: z.array(positiveInt).min(1).optional(),
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
      })
      .partial()
      .optional(),
  })
  .strict();

/* ===================== OutdatedData (view) ===================== */


const outdatedUserNameItemSchema = z
  .object({
    userName: nonEmpty,
    id: positiveInt,
  })
  .strict();


export const outdatedDataSchema = z
  .object({
    contacts: optionalContactsSchema,
    addresses: z.array(outdatedAddressItemSchema),
    names: z.array(outdatedNameItemSchema),
    userNames: z.array(outdatedUserNameItemSchema),
  })
  .strict();

/* ===================== User (view) & users list ===================== */

export const userSchema = z
  .object({
    id: positiveInt,
    userName: nonEmpty,
    firstName: nonEmpty,
    patronymic: nonEmpty.nullable(),
    lastName: nonEmpty,
    roleId: positiveInt,
    roleName: nonEmpty,
    isRestricted: z.boolean(),
    dateOfStart: z.coerce.date(),
    causeOfRestriction: nonEmpty.nullable(),
    dateOfRestriction: nullableIsoDate,
    address: addressSchema,
    comment: nonEmpty.nullable(),
    orderedContacts: contactsSchema,
    outdatedData: outdatedDataSchema,
  })
  .strict();

export const usersSchema = z
  .object({
    list: z.array(userSchema),
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
          users: z.array(z.string()),
        })
        .strict()
    ),
  })
  .strict();

/* ===================== Types ===================== */
export type UserDuplicates = z.infer<typeof duplicatesSchema>;
export type UserDraft = z.infer<typeof userDraftSchema>;
export type UserDraftContacts = z.infer<typeof draftContactsSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;

export type UserContacts = z.infer<typeof contactsSchema>;

export type OutdatedUserName = z.infer<typeof outdatedUserNameItemSchema>;
export type UserOutdatedData = z.infer<typeof outdatedDataSchema>;

export type UserChangingData = z.infer<typeof changingDataSchema>;
//export type UserRestoringData = z.infer<typeof restoringDataSchema>;
export type UserOutdatingData = z.infer<typeof outdatingDataSchema>;
//export type UserDeletingData = z.infer<typeof deletingDataSchema>;
