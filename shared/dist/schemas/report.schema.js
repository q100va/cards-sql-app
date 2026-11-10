import { z } from 'zod';
import { positiveInt } from './common.schema.js';
import { REPORT_FREQUENCY, REPORT_TYPE } from '../constants/reports.js';
import { FIRST_OCCASION_YEAR } from '../constants/occasions.js';
const integerMinZero = z.number().int().min(0);
const monthSchema = z.number().int().min(1).max(12);
const quarterSchema = z.number().int().min(1).max(4);
const reportYearSchema = z.number().int().min(FIRST_OCCASION_YEAR);
// Current statistics use a separate response schema.
const reportTypeSchema = z.union([
    z.literal(REPORT_TYPE.GENERAL),
    z.literal(REPORT_TYPE.PERSONAL),
    z.literal(REPORT_TYPE.SCHOOL_COORDINATION),
    z.literal(REPORT_TYPE.BY_OCCASION),
]);
export const reportDTOSchema = z
    .object({
    userId: positiveInt.nullable(),
    type: reportTypeSchema,
    frequency: z.enum(REPORT_FREQUENCY),
    months: z.array(monthSchema).nullable(),
    quarters: z.array(quarterSchema).nullable(),
    years: z.array(reportYearSchema).min(1),
})
    .strict()
    .superRefine((data, ctx) => {
    if (data.frequency === REPORT_FREQUENCY.MONTHLY &&
        (!data.months || data.months.length === 0)) {
        ctx.addIssue({
            code: 'custom',
            path: ['months'],
            message: 'FORM_VALIDATION.REPORT.MONTH_REQUIRED',
        });
    }
    if (data.frequency === REPORT_FREQUENCY.QUARTERLY &&
        (!data.quarters || data.quarters.length === 0)) {
        ctx.addIssue({
            code: 'custom',
            path: ['quarters'],
            message: 'FORM_VALIDATION.REPORT.QUARTER_REQUIRED',
        });
    }
    if (data.frequency !== REPORT_FREQUENCY.MONTHLY &&
        data.months !== null) {
        ctx.addIssue({
            code: 'custom',
            path: ['months'],
            message: 'FORM_VALIDATION.REPORT.MONTH_NOT_ALLOWED',
        });
    }
    if (data.frequency !== REPORT_FREQUENCY.QUARTERLY &&
        data.quarters !== null) {
        ctx.addIssue({
            code: 'custom',
            path: ['quarters'],
            message: 'FORM_VALIDATION.REPORT.QUARTER_NOT_ALLOWED',
        });
    }
});
const periodDataSchema = z
    .object({
    year: reportYearSchema,
    quarter: quarterSchema.optional(),
    month: monthSchema.optional(),
})
    .strict();
export const reportSchoolCoordinationRowSchema = z.object({
    key: z.string(),
    periodData: periodDataSchema,
    ordersCount: integerMinZero,
    dobroruCount: integerMinZero,
    recipientsCount: integerMinZero,
    volunteersCount: integerMinZero,
    schoolsCount: integerMinZero,
    newSchoolsCount: integerMinZero,
});
export const reportGeneralRowSchema = z.object({
    key: z.string(),
    periodData: periodDataSchema,
    recipientsCount: integerMinZero,
    volunteersCount: integerMinZero,
    institutesCount: integerMinZero,
    schoolsCount: integerMinZero,
    seniorsCount: integerMinZero,
    homesCount: integerMinZero,
    regionsCount: integerMinZero,
    occasions: z.array(z.object({
        occasionId: positiveInt,
        occasionName: z.string(),
        recipientsCount: integerMinZero,
        seniorsCount: integerMinZero,
    })),
});
export const reportPersonalRowSchema = z.object({
    key: z.string(),
    periodData: periodDataSchema,
    ordersCount: integerMinZero,
    seniorsCount: integerMinZero,
    recipientsCount: integerMinZero,
    volunteersCount: integerMinZero,
    institutesCount: integerMinZero,
});
export const reportByOccasionRowSchema = z.object({
    key: positiveInt,
    occasionName: z.string(),
    ordersCount: integerMinZero,
    seniorsCount: integerMinZero,
    homesCount: integerMinZero,
    regionsCount: integerMinZero,
    recipientsCount: integerMinZero,
    volunteersCount: integerMinZero,
    institutesCount: integerMinZero,
    schoolsCount: integerMinZero,
});
export const reportRowSchema = z.union([
    reportSchoolCoordinationRowSchema,
    reportGeneralRowSchema,
    reportPersonalRowSchema,
    reportByOccasionRowSchema,
]);
export const reportSchema = z.object({
    type: reportTypeSchema,
    report: z.array(reportRowSchema),
    cols: z.array(z.object({
        field: z.string(),
        header: z.string(),
    })),
});
const statisticRowSchema = z.object({
    key: positiveInt,
    occasionName: z.string(),
    allRecipients: integerMinZero,
    partRecipients: integerMinZero,
    zeroAll: integerMinZero,
    onceAll: integerMinZero,
    twiceAll: integerMinZero,
    threeTimesAll: integerMinZero,
    fourTimesOrMoreAll: integerMinZero,
    zeroPart: integerMinZero,
    oncePart: integerMinZero,
    twicePart: integerMinZero,
    threeTimesPart: integerMinZero,
    fourTimesOrMorePart: integerMinZero,
});
export const statisticSchema = z.object({
    report: z.array(statisticRowSchema),
    cols: z.array(z.object({
        field: z.string(),
        header: z.string(),
    })),
});
