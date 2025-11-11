import { z } from 'zod';
/* ===================== Helpers ===================== */
// Trim string (null/undefined → '')
export const toTrim = (v) => typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
export const emptyToNull = (v) => v == null || String(v).trim() === '' ? null : String(v).trim();
// Lowercase+trim
export const toLowerTrim = (v) => typeof v === 'string'
    ? v.toLowerCase().trim()
    : v == null
        ? ''
        : String(v).toLowerCase().trim();
export const keepE164Chars = (v) => typeof v === 'string' ? v.replace(/[^0-9+]/g, '') : v == null ? '' : v;
export const keepE164CharsNullable = (v) => typeof v === 'string' ? v.replace(/[^0-9+]/g, '') : v;
/* ===================== Reusable atoms ===================== */
export const nonEmpty = z.string().min(1, 'FORM_VALIDATION.REQUIRED');
export const nonEmptyTrim = z.preprocess(toTrim, nonEmpty);
export const nonEmptyTrimMax = (max, msgMax) => z.preprocess(toTrim, z.string().min(1, 'FORM_VALIDATION.REQUIRED').max(max, { message: msgMax }));
export const positiveInt = z.number().int().positive();
export const nullableInt = positiveInt.nullable();
const stringArray = z.array(nonEmptyTrim); // [] ok
// null | '' | Date | ISO → Date|null
export const nullableIsoDate = z.preprocess((v) => {
    if (v == null || v === '')
        return null;
    if (v instanceof Date)
        return v;
    const d = new Date(String(v));
    return Number.isNaN(+d) ? v : d;
}, z.date().nullable());
export const intOptArray = z.array(positiveInt).min(1).optional();
/* ===================== Contacts for array ===================== */
export const emailSchema = z
    .preprocess(toLowerTrim, z.email())
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
export const phoneNumberSchema = z
    .preprocess(keepE164Chars, z.string())
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
export const telegramNicknameSchema = z.preprocess(toTrim, z
    .string()
    .regex(/^@[A-Za-z0-9_]{5,32}$/, 'FORM_VALIDATION.CONTACT.INVALID_CONTACT'));
export const telegramIdSchema = z.preprocess(toTrim, z.string().regex(/^#[0-9]{7,10}$/, 'FORM_VALIDATION.CONTACT.INVALID_CONTACT'));
export const vKontakteSchema = z.preprocess(toTrim, z
    .string()
    .regex(/^[A-Za-z0-9](?:[A-Za-z0-9_]|(?:\.(?!\.))){3,30}[A-Za-z0-9]$/));
export const instagramSchema = z.preprocess(toTrim, z
    .string()
    .regex(/^[A-Za-z0-9_](?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}[A-Za-z0-9_]$/));
export const facebookSchema = z.preprocess(toTrim, z.string().regex(/^[A-Za-z0-9_.]{5,}$/));
export const otherContactSchema = z.preprocess(toTrim, z.string().min(1).max(256));
/* ===================== Address (draft + view) ===================== */
export const draftAddressSchema = z
    .object({
    countryId: nullableInt,
    regionId: nullableInt,
    districtId: nullableInt,
    localityId: nullableInt,
})
    .strict();
export const addressRefFullSchema = z
    .object({ id: positiveInt, name: nonEmpty })
    .strict();
export const addressRefShortSchema = z
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
// View: { id, content }[]
export const contactSchema = z
    .object({ id: positiveInt, content: nonEmpty })
    .strict();
export const nonEmptyContacts = z.array(contactSchema).nonempty();
// Optional contacts object
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
    otherContact: nonEmptyContacts.optional(),
})
    .strict();
/* ===================== UpdateData ===================== */
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
/* ===================== OutdatedData (view) ===================== */
export const outdatedNameItemSchema = z
    .object({
    firstName: nonEmpty,
    patronymic: z.string().nullable(),
    lastName: nonEmpty,
    id: positiveInt,
})
    .strict();
export const outdatedAddressItemSchema = z
    .object({
    country: addressRefFullSchema,
    region: addressRefShortSchema.nullable(),
    district: addressRefShortSchema.nullable(),
    locality: addressRefShortSchema.nullable(),
    id: positiveInt,
    isRecoverable: z.boolean(),
})
    .strict();
export const outdatedCommonSchema = z
    .object({
    contacts: optionalContactsSchema,
    addresses: z.array(outdatedAddressItemSchema),
    names: z.array(outdatedNameItemSchema)
})
    .strict();
