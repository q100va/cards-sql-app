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
declare const orderRecipientSchema: z.ZodObject<{
    index: z.ZodNumber;
    id: z.ZodNumber;
    fullNameSnapshot: z.ZodString;
    specialComment: z.ZodNullable<z.ZodString>;
    birthDay: z.ZodNumber;
    birthMonth: z.ZodNumber;
    birthYear: z.ZodNullable<z.ZodNumber>;
    infoNote: z.ZodNullable<z.ZodString>;
    photoLink: z.ZodNullable<z.ZodString>;
    status: z.ZodString;
    statusId: z.ZodNumber;
}, z.core.$strip>;
export declare const orderRecipientsSchema: z.ZodArray<z.ZodObject<{
    homeId: z.ZodNumber;
    postAddress: z.ZodString;
    infoNote: z.ZodNullable<z.ZodString>;
    noAddressNote: z.ZodNullable<z.ZodString>;
    homeRecipients: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        id: z.ZodNumber;
        fullNameSnapshot: z.ZodString;
        specialComment: z.ZodNullable<z.ZodString>;
        birthDay: z.ZodNumber;
        birthMonth: z.ZodNumber;
        birthYear: z.ZodNullable<z.ZodNumber>;
        infoNote: z.ZodNullable<z.ZodString>;
        photoLink: z.ZodNullable<z.ZodString>;
        status: z.ZodString;
        statusId: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>>;
export declare const orderSchema: z.ZodObject<{
    id: z.ZodNumber;
    date: z.ZodCoercedDate<unknown>;
    amount: z.ZodNumber;
    userName: z.ZodString;
    volunteerName: z.ZodString;
    instituteName: z.ZodNullable<z.ZodString>;
    contact: z.ZodString;
    status: z.ZodString;
    statusId: z.ZodNumber;
    source: z.ZodString;
    occasion: z.ZodString;
    occasionStatus: z.ZodNumber;
    comment: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
declare const occasionNodeDataSchema: z.ZodObject<{
    type: z.ZodNumber;
    month: z.ZodNullable<z.ZodNumber>;
    year: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>;
export type OccasionNodeData = z.infer<typeof occasionNodeDataSchema>;
export interface OccasionNode {
    key: string;
    label: string;
    data: OccasionNodeData;
    children?: OccasionNode[];
}
export declare const occasionNodeSchema: z.ZodType<OccasionNode>;
export declare const occasionNodesSchema: z.ZodArray<z.ZodType<OccasionNode, unknown, z.core.$ZodTypeInternals<OccasionNode, unknown>>>;
export declare const orderQueryDTOSchema: z.ZodObject<{
    offset: z.ZodNumber;
    limit: z.ZodNumber;
    sortField: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>, z.ZodNull, z.ZodUndefined]>;
    sortOrder: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    searchValue: z.ZodOptional<z.ZodString>;
    filters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
        value: z.ZodUnion<readonly [z.ZodString, z.ZodBoolean, z.ZodNumber, z.ZodArray<z.ZodNumber>, z.ZodArray<z.ZodObject<{
            type: z.ZodNumber;
            month: z.ZodNullable<z.ZodNumber>;
            year: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strip>>]>;
        matchMode: z.ZodString;
        operator: z.ZodString;
    }, z.core.$strip>>>>;
}, z.core.$strip>;
export declare const ordersListSchema: z.ZodObject<{
    list: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        date: z.ZodCoercedDate<unknown>;
        amount: z.ZodNumber;
        userName: z.ZodString;
        volunteerName: z.ZodString;
        instituteName: z.ZodNullable<z.ZodString>;
        contact: z.ZodString;
        status: z.ZodString;
        statusId: z.ZodNumber;
        source: z.ZodString;
        occasion: z.ZodString;
        occasionStatus: z.ZodNumber;
        comment: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>>;
    length: z.ZodCoercedNumber<unknown>;
    options: z.ZodObject<{
        users: z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            userName: z.ZodString;
        }, z.core.$strip>>;
        statuses: z.ZodArray<z.ZodObject<{
            value: z.ZodNumber;
            label: z.ZodString;
        }, z.core.$strip>>;
        sources: z.ZodArray<z.ZodObject<{
            value: z.ZodNumber;
            label: z.ZodString;
        }, z.core.$strip>>;
        nodes: z.ZodArray<z.ZodType<OccasionNode, unknown, z.core.$ZodTypeInternals<OccasionNode, unknown>>>;
    }, z.core.$strip>;
}, z.core.$strict>;
export declare const orderDetailsSchema: z.ZodObject<{
    id: z.ZodNumber;
    date: z.ZodCoercedDate<unknown>;
    amount: z.ZodNumber;
    userName: z.ZodString;
    volunteerName: z.ZodString;
    instituteName: z.ZodNullable<z.ZodString>;
    contact: z.ZodString;
    status: z.ZodString;
    statusId: z.ZodNumber;
    source: z.ZodString;
    occasion: z.ZodString;
    occasionStatus: z.ZodNumber;
    comment: z.ZodNullable<z.ZodString>;
    recipients: z.ZodArray<z.ZodObject<{
        homeId: z.ZodNumber;
        postAddress: z.ZodString;
        infoNote: z.ZodNullable<z.ZodString>;
        noAddressNote: z.ZodNullable<z.ZodString>;
        homeRecipients: z.ZodArray<z.ZodObject<{
            index: z.ZodNumber;
            id: z.ZodNumber;
            fullNameSnapshot: z.ZodString;
            specialComment: z.ZodNullable<z.ZodString>;
            birthDay: z.ZodNumber;
            birthMonth: z.ZodNumber;
            birthYear: z.ZodNullable<z.ZodNumber>;
            infoNote: z.ZodNullable<z.ZodString>;
            photoLink: z.ZodNullable<z.ZodString>;
            status: z.ZodString;
            statusId: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strict>;
export declare const orderEditSchema: z.ZodObject<{
    status: z.ZodNumber;
    source: z.ZodNumber;
    comment: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export type OrderFiltersData = z.infer<typeof orderFiltersDataSchema>;
export type OrderDraft = z.infer<typeof orderDraftSchema>;
export type OrderFilter = z.infer<typeof orderFilterSchema>;
export type Filter = z.infer<typeof filterSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderDetails = z.infer<typeof orderDetailsSchema>;
export type OrderEdit = z.infer<typeof orderEditSchema>;
export type OrderRecipients = z.infer<typeof orderRecipientsSchema>;
export type OrderRecipient = z.infer<typeof orderRecipientSchema>;
export type OrderQuery = z.infer<typeof orderQueryDTOSchema>;
export type OrdersList = z.infer<typeof ordersListSchema>;
export {};
