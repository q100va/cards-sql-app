import { z } from 'zod';
import { toTrim, emptyToNull, keepE164Chars, keepE164CharsNullable, nonEmpty, nonEmptyTrim, nonEmptyTrimMax, positiveInt, nullableInt, nullableIsoDate, intOptArray, nonEmptyContacts, addressRefFullSchema, addressRefShortSchema, } from './common.schema.js';
import { emailSchema, facebookSchema, instagramSchema, otherContactSchema, phoneNumberSchema, telegramIdSchema, telegramNicknameSchema, vKontakteSchema, websiteSchema, } from './common.schema.js';
import { contactType } from './common.schema.js';
//TODO:
const partnerItemSchema = z
    .object({
    partnerContacts: nonEmpty,
    partnerName: nonEmpty,
    partnerId: positiveInt,
    isRecoverable: z.boolean(),
    id: positiveInt,
})
    .strict();
export const optionalContactsSchema = z
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
    website: nonEmptyContacts.optional(),
    otherContact: nonEmptyContacts.optional(),
})
    .strict();
/* ===================== Some Schemas for form validation ===================== */
export const emailControlSchema = z
    .preprocess(emptyToNull, z.email({ message: 'FORM_VALIDATION.CONTACT.INVALID_CONTACT' }).nullable())
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
export const telegramIdControlSchema = z.preprocess(emptyToNull, z
    .string()
    .regex(/^#[0-9]{7,10}$/, 'FORM_VALIDATION.CONTACT.INVALID_CONTACT')
    .nullable());
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
export const telegramNicknameControlSchema = z.preprocess(emptyToNull, z
    .string()
    .regex(/^@[A-Za-z0-9_]{5,32}$/, 'FORM_VALIDATION.CONTACT.INVALID_CONTACT')
    .nullable());
export const vKontakteControlSchema = z.preprocess(emptyToNull, z
    .string()
    .regex(/^[A-Za-z0-9](?:[A-Za-z0-9_]|(?:\.(?!\.))){3,30}[A-Za-z0-9]$/, 'FORM_VALIDATION.CONTACT.INVALID_CONTACT')
    .nullable());
export const instagramControlSchema = z.preprocess(emptyToNull, z
    .string()
    .regex(/^[A-Za-z0-9_](?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}[A-Za-z0-9_]$/, 'FORM_VALIDATION.CONTACT.INVALID_CONTACT')
    .nullable());
export const facebookControlSchema = z.preprocess(emptyToNull, z
    .string()
    .regex(/^[A-Za-z0-9_.]{5,}$/, 'FORM_VALIDATION.CONTACT.INVALID_CONTACT')
    .nullable());
export const websiteControlSchema = z.preprocess(emptyToNull, z
    .string()
    .regex(/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i, 'FORM_VALIDATION.CONTACT.INVALID_URL' //"Invalid website URL"
)
    .nullable());
export const otherContactControlSchema = z.preprocess(emptyToNull, z.string().max(256, { message: 'FORM_VALIDATION.TOO_LONG_256' }).nullable());
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
    .strict();
/* ===================== DTOs ===================== */
export const checkHomeNameSchema = z
    .object({
    id: z.coerce.number().int().optional(),
    homeName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50'),
})
    .strict();
export const homeIdSchema = z
    .object({ id: z.coerce.number().int().positive() })
    .strict();
/* export const homeBlockingSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    causeOfRestriction: nonEmptyTrimMax(500, 'FORM_VALIDATION.TOO_LONG_500'),
  })
  .strict(); */
/* ===================== Home Draft ===================== */
export const draftAddressSchema = z
    .object({
    countryId: positiveInt,
    regionId: positiveInt,
    districtId: positiveInt,
    localityId: positiveInt,
})
    .strict();
export const homeDraftSchema = z
    .object({
    id: nullableInt,
    homeName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50'),
    officialName: nonEmptyTrimMax(500, 'FORM_VALIDATION.TOO_LONG_500'),
    postalName: nonEmptyTrimMax(500, 'FORM_VALIDATION.TOO_LONG_500'),
    // type: z.enum(['NURSING_HOME', 'SPECIAL_HOME', 'PSYCH_NEURO_HOME', 'HOSPICE', 'OTHER']),
    noAddress: z.boolean(),
    specialHome: z.boolean(),
    acceptableForSchool: z.boolean(),
    postalCode: z.preprocess(toTrim, z
        .string()
        .min(1, { message: 'FORM_VALIDATION.REQUIRED' })
        .min(6, { message: 'FORM_VALIDATION.TOO_SHORT_6' })
        .max(6, { message: 'FORM_VALIDATION.TOO_LONG_6' })),
    draftAddress: draftAddressSchema,
    postalAddressPart: z.preprocess(emptyToNull, z
        .string()
        .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
        .nullable()),
    comment: z.preprocess(emptyToNull, z
        .string()
        .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
        .nullable()),
    infoNote: z
        .preprocess(toTrim, z.string().max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' }))
        .nullable(),
    isRestricted: z.boolean(),
    causeOfRestriction: z.preprocess(emptyToNull, z
        .string()
        .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
        .nullable()),
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
/* ===================== UpdateHomeData ===================== */
export const changingAddressSchema = z
    .object({
    postalCode: z.preprocess(toTrim, z
        .string()
        .min(1, { message: 'FORM_VALIDATION.REQUIRED' })
        .min(6, { message: 'FORM_VALIDATION.TOO_SHORT_6' })
        .max(6, { message: 'FORM_VALIDATION.TOO_LONG_6' })),
    countryId: positiveInt,
    regionId: positiveInt,
    districtId: positiveInt,
    localityId: positiveInt,
    postalAddressPart: z.preprocess(emptyToNull, z
        .string()
        .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
        .nullable()),
})
    .strict();
// ChangingData.main — PATCH-like
export const changingMainSchema = z
    .object({
    homeName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50').optional(),
    officialName: nonEmptyTrimMax(500, 'FORM_VALIDATION.TOO_LONG_500').optional(),
    postalName: nonEmptyTrimMax(500, 'FORM_VALIDATION.TOO_LONG_500').optional(),
    noAddress: z.boolean().optional(),
    specialHome: z.boolean().optional(),
    acceptableForSchool: z.boolean().optional(),
    comment: z
        .preprocess(emptyToNull, z
        .string()
        .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
        .nullable())
        .optional(),
    infoNote: z
        .preprocess(toTrim, z.string().max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' }))
        .nullable()
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
    website: z.array(websiteSchema).optional(),
    otherContact: z.array(otherContactSchema).optional(),
})
    .strict();
export const changingDataSchema = z
    .object({
    main: changingMainSchema.nullable(),
    address: changingAddressSchema.nullable(),
    contacts: changingContactsSchema.nullable(),
    partners: z.array(positiveInt).nullable(),
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
        officialName: nonEmptyTrim,
    })
        .strict()
        .nullable(),
    contacts: z.array(positiveInt).nullable(),
    partners: z.array(positiveInt).nullable(),
})
    .strict();
/* ========= DeletingData ========= */
export const deletingDataSchema = z
    .object({
    names: z.array(positiveInt).nullable(),
    addresses: z.array(positiveInt).nullable(),
    contacts: z.array(positiveInt).nullable(),
    partners: z.array(positiveInt).nullable(),
})
    .strict();
/* ========= RestoringData ========= */
export const restoringDataSchema = z
    .object({
    addresses: z.array(positiveInt).nullable(),
    names: z.array(positiveInt).nullable(),
    contacts: optionalContactsSchema.nullable(),
    partners: z.array(positiveInt).nullable(),
})
    .strict();
/* ========= UpdateHomeData wrapper ========= */
export const updateHomeDataSchema = z
    .object({
    id: positiveInt,
    changingData: changingDataSchema,
    restoringData: restoringDataSchema,
    outdatingData: outdatingDataSchema,
    deletingData: deletingDataSchema,
})
    .strict();
/* ========= Home query DTO ========= */
const sortDir = z.enum(['asc', 'desc']);
export const homesQueryDTOSchema = z
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
            //  partners: z.array(positiveInt).min(1).optional(),
            noAddress: z.boolean().optional(),
            specialHome: z.boolean().optional(),
            acceptableForSchool: z.boolean().optional(),
            comment: z.boolean().optional(),
            infoNote: z.boolean().optional(),
            dateBeginningRange: z
                .tuple([z.coerce.date(), z.coerce.date()])
                .optional(),
            dateRestrictionRange: z
                .tuple([z.coerce.date(), z.coerce.date()])
                .optional(),
            dateUpdateRange: z
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
export const outdatedNameItemSchema = z
    .object({
    officialName: nonEmpty,
    id: positiveInt,
})
    .strict();
export const outdatedAddressItemSchema = z
    .object({
    postalCode: nonEmpty,
    country: addressRefFullSchema,
    region: addressRefShortSchema,
    district: addressRefShortSchema,
    locality: addressRefShortSchema,
    postalAddressPart: nonEmpty.nullable(),
    id: positiveInt,
    isRecoverable: z.boolean(),
})
    .strict();
export const outdatedDataSchema = z
    .object({
    contacts: optionalContactsSchema,
    addresses: z.array(outdatedAddressItemSchema),
    names: z.array(outdatedNameItemSchema),
    partners: z.array(partnerItemSchema),
})
    .strict();
/* ===================== Home (view) & homes list ===================== */
export const addressSchema = z
    .object({
    postalCode: nonEmpty,
    postalAddressPart: nonEmpty.nullable(),
    country: addressRefFullSchema.nullable(),
    region: addressRefShortSchema.nullable(),
    district: addressRefShortSchema.nullable(),
    locality: addressRefShortSchema.nullable(),
    id: positiveInt.optional(),
})
    .strict();
export const homeSchema = z
    .object({
    id: positiveInt,
    homeName: nonEmpty,
    officialName: nonEmpty,
    postalName: nonEmpty,
    noAddress: z.boolean(),
    specialHome: z.boolean(),
    acceptableForSchool: z.boolean(),
    isRestricted: z.boolean(),
    dateOfStart: z.coerce.date(),
    causeOfRestriction: nonEmpty.nullable(),
    dateOfRestriction: nullableIsoDate,
    address: addressSchema,
    comment: nonEmpty.nullable(),
    infoNote: nonEmpty.nullable(),
    orderedContacts: optionalContactsSchema,
    outdatedData: outdatedDataSchema,
    partners: z.array(partnerItemSchema),
    dateOfLastUpdate: z.coerce.date(),
})
    .strict();
export const homesSchema = z
    .object({
    list: z.array(homeSchema),
    length: z.coerce.number().int().min(0),
})
    .strict();
