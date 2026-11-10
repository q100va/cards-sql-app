import { z } from 'zod';
export declare const occasionIdSchema: z.ZodObject<{
    occasionId: z.ZodNumber;
}, z.core.$strict>;
export declare const recipientListDataSchema: z.ZodObject<{
    seniorsIds: z.ZodArray<z.ZodNumber>;
    occasionId: z.ZodNumber;
}, z.core.$strict>;
export declare const recipientDataSchema: z.ZodObject<{
    type: z.ZodNumber;
    year: z.ZodNumber;
    month: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export declare const recipientDestroySchema: z.ZodObject<{
    recipientIds: z.ZodArray<z.ZodNumber>;
    occasionId: z.ZodNumber;
}, z.core.$strict>;
export declare const recipientQueryDTOSchema: z.ZodObject<{
    occasionId: z.ZodNumber;
    offset: z.ZodNumber;
    limit: z.ZodNumber;
    sortField: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>>;
    sortOrder: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    searchValue: z.ZodOptional<z.ZodString>;
    filters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
        value: z.ZodUnion<readonly [z.ZodString, z.ZodBoolean, z.ZodNumber]>;
        matchMode: z.ZodString;
        operator: z.ZodString;
    }, z.core.$strict>>>>;
}, z.core.$strict>;
export declare const recipientSchema: z.ZodObject<{
    id: z.ZodNumber;
    fullName: z.ZodString;
    birthDay: z.ZodNullable<z.ZodNumber>;
    birthMonth: z.ZodNullable<z.ZodNumber>;
    birthYear: z.ZodNullable<z.ZodNumber>;
    category: z.ZodString;
    acceptableForSchool: z.ZodBoolean;
    regionName: z.ZodString;
    homeName: z.ZodString;
    plusAmount: z.ZodNumber;
    specialComment: z.ZodString;
    isAbsent: z.ZodBoolean;
}, z.core.$strict>;
export declare const recipientsShortSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodNumber;
    fullData: z.ZodString;
}, z.core.$strip>>;
export declare const recipientsListSchema: z.ZodObject<{
    list: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        fullName: z.ZodString;
        birthDay: z.ZodNullable<z.ZodNumber>;
        birthMonth: z.ZodNullable<z.ZodNumber>;
        birthYear: z.ZodNullable<z.ZodNumber>;
        category: z.ZodString;
        acceptableForSchool: z.ZodBoolean;
        regionName: z.ZodString;
        homeName: z.ZodString;
        plusAmount: z.ZodNumber;
        specialComment: z.ZodString;
        isAbsent: z.ZodBoolean;
    }, z.core.$strict>>;
    length: z.ZodNumber;
}, z.core.$strict>;
export type Recipient = z.infer<typeof recipientSchema>;
export type RecipientQuery = z.infer<typeof recipientQueryDTOSchema>;
export type RecipientsShortList = z.infer<typeof recipientsShortSchema>;
