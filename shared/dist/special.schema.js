import { z } from 'zod';
import { toTrim, emptyToNull, nonEmptyTrim, nonEmptyTrimMax, positiveInt, nullableInt, nullableIsoDate, } from './common.schema.js';
export const nullableDateOnly = z.preprocess((v) => {
    if (v == null || v === '')
        return null;
    if (v instanceof Date) {
        // превратим Date -> YYYY-MM-DD (локально)
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return String(v);
}, z.date().nullable());
const nullableString = z.preprocess(emptyToNull, z.string().max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' }).nullable());
/* ===================== DTOs ===================== */
export const checkSeniorDataSchema = z
    .object({
    id: z.coerce.number().int().optional(),
    homeId: z.coerce.number().int(),
    firstName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50'),
    patronymic: z
        .preprocess(toTrim, z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }))
        .nullable(),
    lastName: z
        .preprocess(toTrim, z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }))
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
/* ===================== Senior Draft ===================== */
export const seniorDraftSchema = z
    .object({
    id: nullableInt,
    firstName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50'),
    patronymic: z.preprocess(emptyToNull, z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }).nullable()),
    lastName: z.preprocess(emptyToNull, z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }).nullable()),
    birthDate: nullableIsoDate,
    gender: z.enum(['male', 'female']),
    comment: nullableString,
    infoNote: nullableString,
    photoLink: nullableString,
    dateOfConsent: nullableIsoDate,
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
/* ===================== UpdateSeniorData ===================== */
// ChangingData.main — PATCH-like
export const changingMainSchema = z
    .object({
    firstName: nonEmptyTrimMax(50, 'FORM_VALIDATION.TOO_LONG_50'),
    patronymic: z.preprocess(emptyToNull, z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }).nullable()),
    lastName: z.preprocess(emptyToNull, z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }).nullable()),
    birthDate: nullableIsoDate,
    confirmedFirstName: z.preprocess(emptyToNull, z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }).nullable()),
    confirmedPatronymic: z.preprocess(emptyToNull, z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }).nullable()),
    confirmedLastName: z.preprocess(emptyToNull, z.string().max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' }).nullable()),
    confirmedBirthDate: nullableIsoDate,
    gender: z.enum(['male', 'female']),
    comment: nullableString,
    infoNote: nullableString,
    photoLink: nullableString,
    dateOfConsent: nullableIsoDate,
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
    dateOfStart: nullableIsoDate,
    dateOfExit: nullableIsoDate,
    spouseId: positiveInt.nullable(),
})
    .strict();
export const changingDataSchema = z
    .object({
    main: changingMainSchema.nullable(),
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
    names: z
        .object({
        firstName: nonEmptyTrim,
        patronymic: z.preprocess(emptyToNull, z
            .string()
            .max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' })
            .nullable()),
        lastName: z.preprocess(emptyToNull, z
            .string()
            .max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' })
            .nullable()),
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
