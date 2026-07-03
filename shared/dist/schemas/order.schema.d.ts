import { z } from 'zod';
export declare const orderDraftSchema: z.ZodObject<{
    occasionId: z.ZodNumber;
    volunteerId: z.ZodNumber;
    userId: z.ZodNumber;
    instituteId: z.ZodNullable<z.ZodNumber>;
    status: z.ZodNumber;
    source: z.ZodNumber;
    contactId: z.ZodNumber;
    amount: z.ZodNumber;
    comment: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export declare const orderFilterSchema: z.ZodObject<{
    addressCategory: z.ZodNumber;
    gender: z.ZodNumber;
    maleAmount: z.ZodNullable<z.ZodNumber>;
    femaleAmount: z.ZodNullable<z.ZodNumber>;
    onlyWithPicture: z.ZodBoolean;
    onlyAnniversaries: z.ZodBoolean;
    onlyAnniversariesAndOldest: z.ZodBoolean;
    onlyWithConcents: z.ZodBoolean;
    year1: z.ZodNullable<z.ZodNumber>;
    year2: z.ZodNullable<z.ZodNumber>;
    date1: z.ZodNullable<z.ZodNumber>;
    date2: z.ZodNullable<z.ZodNumber>;
    regions: z.ZodArray<z.ZodNumber>;
    homes: z.ZodArray<z.ZodNumber>;
    minFromOneHouse: z.ZodNullable<z.ZodNumber>;
    maxFromOneHouse: z.ZodNullable<z.ZodNumber>;
    maxNoAddress: z.ZodNullable<z.ZodNumber>;
}, z.core.$strict>;
export declare const filterSchema: z.ZodOptional<z.ZodObject<{
    addressCategory: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    gender: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    maleAmount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    femaleAmount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    onlyWithPicture: z.ZodOptional<z.ZodOptional<z.ZodLiteral<true>>>;
    onlyAnniversaries: z.ZodOptional<z.ZodOptional<z.ZodLiteral<true>>>;
    onlyAnniversariesAndOldest: z.ZodOptional<z.ZodOptional<z.ZodLiteral<true>>>;
    onlyWithConcents: z.ZodOptional<z.ZodOptional<z.ZodLiteral<true>>>;
    year1: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    year2: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    date1: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    date2: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    regions: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodNumber>>>;
    homes: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodNumber>>>;
    minFromOneHouse: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    maxFromOneHouse: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    maxNoAddress: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>>;
export declare const orderFiltersDataSchema: z.ZodObject<{
    regions: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, z.core.$strip>>;
    homes: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        regionId: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strict>;
export declare const orderSchema: z.ZodObject<{
    id: z.ZodNumber;
}, z.core.$strict>;
declare const orderRecipientSchema: z.ZodObject<{
    index: z.ZodNumber;
    recipientId: z.ZodNumber;
    fullNameSnapshot: z.ZodString;
    specialComment: z.ZodNullable<z.ZodString>;
    birthDay: z.ZodNumber;
    birthMonth: z.ZodNumber;
    birthYear: z.ZodNumber;
    infoNote: z.ZodNullable<z.ZodString>;
    photoLink: z.ZodNullable<z.ZodString>;
    recipientStatus: z.ZodString;
}, z.core.$strip>;
export declare const orderRecipientsSchema: z.ZodArray<z.ZodObject<{
    homeId: z.ZodNumber;
    postAddress: z.ZodString;
    infoNote: z.ZodNullable<z.ZodString>;
    noAddressNote: z.ZodNullable<z.ZodString>;
    homeRecipients: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        recipientId: z.ZodNumber;
        fullNameSnapshot: z.ZodString;
        specialComment: z.ZodNullable<z.ZodString>;
        birthDay: z.ZodNumber;
        birthMonth: z.ZodNumber;
        birthYear: z.ZodNumber;
        infoNote: z.ZodNullable<z.ZodString>;
        photoLink: z.ZodNullable<z.ZodString>;
        recipientStatus: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>>;
export type OrderFiltersData = z.infer<typeof orderFiltersDataSchema>;
export type OrderDraft = z.infer<typeof orderDraftSchema>;
export type OrderFilter = z.infer<typeof orderFilterSchema>;
export type Filter = z.infer<typeof filterSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderRecipients = z.infer<typeof orderRecipientsSchema>;
export type OrderRecipient = z.infer<typeof orderRecipientSchema>;
export {};
