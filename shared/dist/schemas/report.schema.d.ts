import { z } from 'zod';
export declare const reportDTOSchema: z.ZodObject<{
    userId: z.ZodNullable<z.ZodNumber>;
    type: z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    frequency: z.ZodEnum<{
        readonly MONTHLY: "MONTHLY";
        readonly QUARTERLY: "QUARTERLY";
        readonly ANNUAL: "ANNUAL";
    }>;
    months: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    quarters: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    years: z.ZodArray<z.ZodNumber>;
}, z.core.$strict>;
export declare const reportSchoolCoordinationRowSchema: z.ZodObject<{
    key: z.ZodString;
    periodData: z.ZodObject<{
        year: z.ZodNumber;
        quarter: z.ZodOptional<z.ZodNumber>;
        month: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>;
    ordersCount: z.ZodNumber;
    dobroruCount: z.ZodNumber;
    recipientsCount: z.ZodNumber;
    volunteersCount: z.ZodNumber;
    schoolsCount: z.ZodNumber;
    newSchoolsCount: z.ZodNumber;
}, z.core.$strip>;
export declare const reportGeneralRowSchema: z.ZodObject<{
    key: z.ZodString;
    periodData: z.ZodObject<{
        year: z.ZodNumber;
        quarter: z.ZodOptional<z.ZodNumber>;
        month: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>;
    recipientsCount: z.ZodNumber;
    volunteersCount: z.ZodNumber;
    institutesCount: z.ZodNumber;
    schoolsCount: z.ZodNumber;
    seniorsCount: z.ZodNumber;
    homesCount: z.ZodNumber;
    regionsCount: z.ZodNumber;
    occasions: z.ZodArray<z.ZodObject<{
        occasionId: z.ZodNumber;
        occasionName: z.ZodString;
        recipientsCount: z.ZodNumber;
        seniorsCount: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const reportPersonalRowSchema: z.ZodObject<{
    key: z.ZodString;
    periodData: z.ZodObject<{
        year: z.ZodNumber;
        quarter: z.ZodOptional<z.ZodNumber>;
        month: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>;
    ordersCount: z.ZodNumber;
    seniorsCount: z.ZodNumber;
    recipientsCount: z.ZodNumber;
    volunteersCount: z.ZodNumber;
    institutesCount: z.ZodNumber;
}, z.core.$strip>;
export declare const reportByOccasionRowSchema: z.ZodObject<{
    key: z.ZodNumber;
    occasionName: z.ZodString;
    ordersCount: z.ZodNumber;
    seniorsCount: z.ZodNumber;
    homesCount: z.ZodNumber;
    regionsCount: z.ZodNumber;
    recipientsCount: z.ZodNumber;
    volunteersCount: z.ZodNumber;
    institutesCount: z.ZodNumber;
    schoolsCount: z.ZodNumber;
}, z.core.$strip>;
export declare const reportRowSchema: z.ZodUnion<readonly [z.ZodObject<{
    key: z.ZodString;
    periodData: z.ZodObject<{
        year: z.ZodNumber;
        quarter: z.ZodOptional<z.ZodNumber>;
        month: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>;
    ordersCount: z.ZodNumber;
    dobroruCount: z.ZodNumber;
    recipientsCount: z.ZodNumber;
    volunteersCount: z.ZodNumber;
    schoolsCount: z.ZodNumber;
    newSchoolsCount: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    key: z.ZodString;
    periodData: z.ZodObject<{
        year: z.ZodNumber;
        quarter: z.ZodOptional<z.ZodNumber>;
        month: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>;
    recipientsCount: z.ZodNumber;
    volunteersCount: z.ZodNumber;
    institutesCount: z.ZodNumber;
    schoolsCount: z.ZodNumber;
    seniorsCount: z.ZodNumber;
    homesCount: z.ZodNumber;
    regionsCount: z.ZodNumber;
    occasions: z.ZodArray<z.ZodObject<{
        occasionId: z.ZodNumber;
        occasionName: z.ZodString;
        recipientsCount: z.ZodNumber;
        seniorsCount: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    key: z.ZodString;
    periodData: z.ZodObject<{
        year: z.ZodNumber;
        quarter: z.ZodOptional<z.ZodNumber>;
        month: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>;
    ordersCount: z.ZodNumber;
    seniorsCount: z.ZodNumber;
    recipientsCount: z.ZodNumber;
    volunteersCount: z.ZodNumber;
    institutesCount: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    key: z.ZodNumber;
    occasionName: z.ZodString;
    ordersCount: z.ZodNumber;
    seniorsCount: z.ZodNumber;
    homesCount: z.ZodNumber;
    regionsCount: z.ZodNumber;
    recipientsCount: z.ZodNumber;
    volunteersCount: z.ZodNumber;
    institutesCount: z.ZodNumber;
    schoolsCount: z.ZodNumber;
}, z.core.$strip>]>;
export declare const reportSchema: z.ZodObject<{
    type: z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>]>;
    report: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        key: z.ZodString;
        periodData: z.ZodObject<{
            year: z.ZodNumber;
            quarter: z.ZodOptional<z.ZodNumber>;
            month: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>;
        ordersCount: z.ZodNumber;
        dobroruCount: z.ZodNumber;
        recipientsCount: z.ZodNumber;
        volunteersCount: z.ZodNumber;
        schoolsCount: z.ZodNumber;
        newSchoolsCount: z.ZodNumber;
    }, z.core.$strip>, z.ZodObject<{
        key: z.ZodString;
        periodData: z.ZodObject<{
            year: z.ZodNumber;
            quarter: z.ZodOptional<z.ZodNumber>;
            month: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>;
        recipientsCount: z.ZodNumber;
        volunteersCount: z.ZodNumber;
        institutesCount: z.ZodNumber;
        schoolsCount: z.ZodNumber;
        seniorsCount: z.ZodNumber;
        homesCount: z.ZodNumber;
        regionsCount: z.ZodNumber;
        occasions: z.ZodArray<z.ZodObject<{
            occasionId: z.ZodNumber;
            occasionName: z.ZodString;
            recipientsCount: z.ZodNumber;
            seniorsCount: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        key: z.ZodString;
        periodData: z.ZodObject<{
            year: z.ZodNumber;
            quarter: z.ZodOptional<z.ZodNumber>;
            month: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>;
        ordersCount: z.ZodNumber;
        seniorsCount: z.ZodNumber;
        recipientsCount: z.ZodNumber;
        volunteersCount: z.ZodNumber;
        institutesCount: z.ZodNumber;
    }, z.core.$strip>, z.ZodObject<{
        key: z.ZodNumber;
        occasionName: z.ZodString;
        ordersCount: z.ZodNumber;
        seniorsCount: z.ZodNumber;
        homesCount: z.ZodNumber;
        regionsCount: z.ZodNumber;
        recipientsCount: z.ZodNumber;
        volunteersCount: z.ZodNumber;
        institutesCount: z.ZodNumber;
        schoolsCount: z.ZodNumber;
    }, z.core.$strip>]>>;
    cols: z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        header: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const statisticRowSchema: z.ZodObject<{
    key: z.ZodNumber;
    occasionName: z.ZodString;
    allRecipients: z.ZodNumber;
    partRecipients: z.ZodNumber;
    zeroAll: z.ZodNumber;
    onceAll: z.ZodNumber;
    twiceAll: z.ZodNumber;
    threeTimesAll: z.ZodNumber;
    fourTimesOrMoreAll: z.ZodNumber;
    zeroPart: z.ZodNumber;
    oncePart: z.ZodNumber;
    twicePart: z.ZodNumber;
    threeTimesPart: z.ZodNumber;
    fourTimesOrMorePart: z.ZodNumber;
}, z.core.$strip>;
export declare const statisticSchema: z.ZodObject<{
    report: z.ZodArray<z.ZodObject<{
        key: z.ZodNumber;
        occasionName: z.ZodString;
        allRecipients: z.ZodNumber;
        partRecipients: z.ZodNumber;
        zeroAll: z.ZodNumber;
        onceAll: z.ZodNumber;
        twiceAll: z.ZodNumber;
        threeTimesAll: z.ZodNumber;
        fourTimesOrMoreAll: z.ZodNumber;
        zeroPart: z.ZodNumber;
        oncePart: z.ZodNumber;
        twicePart: z.ZodNumber;
        threeTimesPart: z.ZodNumber;
        fourTimesOrMorePart: z.ZodNumber;
    }, z.core.$strip>>;
    cols: z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        header: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ReportRow = z.infer<typeof reportRowSchema>;
export type StatisticRow = z.infer<typeof statisticRowSchema>;
export type ReportGeneralRow = z.infer<typeof reportGeneralRowSchema>;
export type ReportResponse = z.infer<typeof reportSchema>;
export type StatisticResponse = z.infer<typeof statisticSchema>;
export {};
