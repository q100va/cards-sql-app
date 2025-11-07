import { z } from 'zod';
import { emailSchema, facebookSchema, instagramSchema, otherContactSchema, phoneNumberSchema, telegramIdSchema, telegramNicknameSchema, vKontakteSchema, } from './user.schema.js';
/* ===================== Helpers ===================== */
// Trim string (null/undefined → '')
const toTrim = (v) => typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
const emptyToNull = (v) => v == null || String(v).trim() === '' ? null : String(v).trim();
/* ===================== Reusable atoms ===================== */
const nonEmpty = z.string().min(1, 'FORM_VALIDATION.REQUIRED');
const nonEmptyTrim = z.preprocess(toTrim, nonEmpty);
const nonEmptyTrimMax = (max, msgMax) => z.preprocess(toTrim, z.string().min(1, 'FORM_VALIDATION.REQUIRED').max(max, { message: msgMax }));
const positiveInt = z.number().int().positive();
const nullableInt = positiveInt.nullable();
const nullableIsoDate = z.preprocess((v) => {
    if (v == null || v === '')
        return null;
    if (v instanceof Date)
        return v;
    const d = new Date(String(v));
    return Number.isNaN(+d) ? v : d;
}, z.date().nullable());
const intOptArray = z.array(positiveInt).min(1).optional();
/* ===================== Address (draft + view) ===================== */
export const draftAddressSchema = z
    .object({
    countryId: nullableInt,
    regionId: nullableInt,
    districtId: nullableInt,
    localityId: nullableInt,
})
    .strict();
const addressRefFullSchema = z
    .object({ id: positiveInt, name: nonEmpty })
    .strict();
const addressRefShortSchema = z
    .object({ id: positiveInt, shortName: nonEmpty })
    .strict();
export const addressSchema = z
    .object({
    country: addressRefFullSchema.nullable(),
    region: addressRefShortSchema.nullable(),
    district: addressRefShortSchema.nullable(),
    locality: addressRefShortSchema.nullable(),
    id: positiveInt.optional(),
})
    .strict();
/* ===================== Contacts (draft / ordered / optional) ===================== */
export const contactType = z.enum([
    'email',
    'phoneNumber',
    'whatsApp',
    'telegram',
    'telegramNickname',
    'telegramId',
    'telegramPhoneNumber',
    'vKontakte',
    'instagram',
    'facebook',
    'otherContact',
]);
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
    const hasAny = Object.values(o).some((arr) => Array.isArray(arr) && arr.length > 0);
    if (!hasAny) {
        ctx.addIssue({
            code: 'custom',
            path: [],
            message: 'FORM_VALIDATION.MIN_ONE_CONTACT',
        });
    }
});
// View: { id, content }[]
export const contactSchema = z
    .object({ id: positiveInt, content: nonEmpty })
    .strict();
const nonEmptyContacts = z.array(contactSchema).nonempty();
// Ordered contacts object
export const contactsSchema = z
    .object({
    email: nonEmptyContacts.optional(),
    phoneNumber: nonEmptyContacts.optional(),
    whatsApp: nonEmptyContacts.optional(),
    telegram: nonEmptyContacts.optional(),
    telegramNickname: nonEmptyContacts.optional(),
    telegramId: nonEmptyContacts.optional(),
    telegramPhoneNumber: nonEmptyContacts.optional(),
    vKontakte: nonEmptyContacts.optional(),
    instagram: nonEmptyContacts.optional(),
    facebook: nonEmptyContacts.optional(),
    otherContact: nonEmptyContacts.optional(),
})
    .strict();
/* // Optional variant
export const optionalContactsSchema = z
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
/* ===================== DTOs ===================== */
export const checkPartnerDataSchema = z
    .object({
    id: z.coerce.number().int().optional(),
    firstName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50'),
    lastName: z
        .preprocess(toTrim, z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }))
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
        .preprocess(toTrim, z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }))
        .nullable(),
    lastName: z
        .preprocess(toTrim, z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }))
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
    comment: z.preprocess(emptyToNull, z
        .string()
        .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
        .nullable()),
    isRestricted: z.boolean(),
    causeOfRestriction: z.preprocess(emptyToNull, z
        .string()
        .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
        .nullable()),
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
    }
    else {
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
        .preprocess(emptyToNull, z
        .string()
        .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
        .nullable())
        .optional(),
    isRestricted: z.boolean().optional(),
    causeOfRestriction: z
        .preprocess(emptyToNull, z
        .string()
        .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
        .nullable())
        .optional(),
    dateOfRestriction: nullableIsoDate.optional(),
})
    .strict();
// ChangingData.address
export const changingAddressSchema = z
    .object({
    countryId: nullableInt,
    regionId: nullableInt,
    districtId: nullableInt,
    localityId: nullableInt,
})
    .strict();
// ChangingData.contacts
export const changingContactsSchema = z
    .object({
    email: z.array(emailSchema).optional(),
    phoneNumber: z.array(phoneNumberSchema).optional(),
    whatsApp: z.array(phoneNumberSchema).optional(),
    telegramNickname: z.array(telegramNicknameSchema).optional(),
    telegramId: z.array(telegramIdSchema).optional(),
    telegramPhoneNumber: z.array(phoneNumberSchema).optional(),
    vKontakte: z.array(vKontakteSchema).optional(),
    instagram: z.array(instagramSchema).optional(),
    facebook: z.array(facebookSchema).optional(),
    otherContact: z.array(otherContactSchema).optional(),
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
    if (!m)
        return;
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
})
    .strict();
/* ========= DeletingData ========= */
export const deletingDataSchema = z
    .object({
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
    contacts: contactsSchema.nullable(),
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
                .array(z.enum([
                'PARTNER.AFF.VOLUNTEER_COORDINATOR',
                'PARTNER.AFF.HOME_REPRESENTATIVE',
                'PARTNER.AFF.FOUNDATION_STAFF',
            ]))
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
const outdatedNameItemSchema = z
    .object({
    firstName: nonEmpty,
    patronymic: z.string().nullable(),
    lastName: nonEmpty,
    id: positiveInt,
})
    .strict();
const outdatedPartnerNameItemSchema = z
    .object({
    partnerName: nonEmpty,
    id: positiveInt,
})
    .strict();
const outdatedAddressItemSchema = z
    .object({
    country: addressRefFullSchema,
    region: addressRefShortSchema.nullable(),
    district: addressRefShortSchema.nullable(),
    locality: addressRefShortSchema.nullable(),
    id: positiveInt,
    isRecoverable: z.boolean(),
})
    .strict();
export const outdatedDataSchema = z
    .object({
    contacts: contactsSchema,
    addresses: z.array(outdatedAddressItemSchema),
    names: z.array(outdatedNameItemSchema),
    partnerNames: z.array(outdatedPartnerNameItemSchema),
})
    .strict();
/* ===================== Partner (view) & partners list ===================== */
export const partnerSchema = z
    .object({
    id: positiveInt,
    partnerName: nonEmpty,
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
export const partnersSchema = z
    .object({
    partners: z.array(partnerSchema),
    length: z.coerce.number().int().min(0),
})
    .strict();
export const duplicatesSchema = z
    .object({
    duplicatesName: z.array(z.string()),
    duplicatesContact: z.array(z
        .object({
        type: z.string(),
        content: z.string(),
        partners: z.array(z.string()),
    })
        .strict()),
})
    .strict();
