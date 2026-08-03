import { z } from 'zod';
export declare const reportDTOSchema: z.ZodObject<{
    userId: z.ZodNullable<z.ZodNumber>;
    type: z.ZodNumber;
    frequency: z.ZodString;
    months: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    quarters: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    years: z.ZodArray<z.ZodNumber>;
}, z.core.$strict>;
export declare const reportSchoolCoordinationRowSchema: z.ZodObject<{
    periodData: z.ZodObject<{
        year: z.ZodNumber;
        quarter: z.ZodOptional<z.ZodNumber>;
        month: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    ordersCount: z.ZodNumber;
    dobroruCount: z.ZodNumber;
    recipientsCount: z.ZodNumber;
    volunteersCount: z.ZodNumber;
    schoolsCount: z.ZodNumber;
    newSchoolsCount: z.ZodNumber;
}, z.core.$strip>;
export declare const reportGeneralRowSchema: z.ZodObject<{
    periodData: z.ZodObject<{
        year: z.ZodNumber;
        quarter: z.ZodOptional<z.ZodNumber>;
        month: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    recipientsCount: z.ZodNumber;
    volunteersCount: z.ZodNumber;
    institutesCount: z.ZodNumber;
    seniorsCount: z.ZodNumber;
    homesCount: z.ZodNumber;
    regionsCount: z.ZodNumber;
}, z.core.$strip>;
export declare const reportRowSchema: z.ZodUnion<readonly [z.ZodObject<{
    periodData: z.ZodObject<{
        year: z.ZodNumber;
        quarter: z.ZodOptional<z.ZodNumber>;
        month: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    ordersCount: z.ZodNumber;
    dobroruCount: z.ZodNumber;
    recipientsCount: z.ZodNumber;
    volunteersCount: z.ZodNumber;
    schoolsCount: z.ZodNumber;
    newSchoolsCount: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    periodData: z.ZodObject<{
        year: z.ZodNumber;
        quarter: z.ZodOptional<z.ZodNumber>;
        month: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    recipientsCount: z.ZodNumber;
    volunteersCount: z.ZodNumber;
    institutesCount: z.ZodNumber;
    seniorsCount: z.ZodNumber;
    homesCount: z.ZodNumber;
    regionsCount: z.ZodNumber;
}, z.core.$strip>]>;
export declare const reportSchema: z.ZodObject<{
    report: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        periodData: z.ZodObject<{
            year: z.ZodNumber;
            quarter: z.ZodOptional<z.ZodNumber>;
            month: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>;
        ordersCount: z.ZodNumber;
        dobroruCount: z.ZodNumber;
        recipientsCount: z.ZodNumber;
        volunteersCount: z.ZodNumber;
        schoolsCount: z.ZodNumber;
        newSchoolsCount: z.ZodNumber;
    }, z.core.$strip>, z.ZodObject<{
        periodData: z.ZodObject<{
            year: z.ZodNumber;
            quarter: z.ZodOptional<z.ZodNumber>;
            month: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>;
        recipientsCount: z.ZodNumber;
        volunteersCount: z.ZodNumber;
        institutesCount: z.ZodNumber;
        seniorsCount: z.ZodNumber;
        homesCount: z.ZodNumber;
        regionsCount: z.ZodNumber;
    }, z.core.$strip>]>>;
    cols: z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        header: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ReportRow = z.infer<typeof reportRowSchema>;
export type ReportResponse = z.infer<typeof reportSchema>;
