import { z } from 'zod';
export declare const orderDataSchema: z.ZodObject<{
    volunteerId: z.ZodCoercedNumber<unknown>;
    occasionId: z.ZodCoercedNumber<unknown>;
}, z.core.$strict>;
export declare const orderDraftSchema: z.ZodObject<{
    occasionId: z.ZodNumber;
    volunteerId: z.ZodNumber;
    userId: z.ZodNumber;
    instituteId: z.ZodNullable<z.ZodNumber>;
    status: z.ZodNumber;
    source: z.ZodNumber;
    contactId: z.ZodNumber;
    amount: z.ZodNumber;
    comment: z.ZodNullable<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodString>>;
}, z.core.$strict>;
export declare const filterSchema: z.ZodOptional<z.ZodObject<{
    addressCategory: z.ZodOptional<z.ZodNumber>;
    gender: z.ZodOptional<z.ZodNumber>;
    maleAmount: z.ZodOptional<z.ZodNumber>;
    femaleAmount: z.ZodOptional<z.ZodNumber>;
    onlyWithPicture: z.ZodOptional<z.ZodLiteral<true>>;
    onlyAnniversaries: z.ZodOptional<z.ZodLiteral<true>>;
    onlyAnniversariesAndOldest: z.ZodOptional<z.ZodLiteral<true>>;
    onlyWithConcents: z.ZodOptional<z.ZodLiteral<true>>;
    year1: z.ZodOptional<z.ZodNumber>;
    year2: z.ZodOptional<z.ZodNumber>;
    date1: z.ZodOptional<z.ZodNumber>;
    date2: z.ZodOptional<z.ZodNumber>;
    regions: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    homes: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    minFromOneHouse: z.ZodOptional<z.ZodNumber>;
    maxFromOneHouse: z.ZodOptional<z.ZodNumber>;
    maxNoAddress: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>>;
export declare const orderCreateSchema: z.ZodObject<{
    orderDraft: z.ZodObject<{
        occasionId: z.ZodNumber;
        volunteerId: z.ZodNumber;
        userId: z.ZodNumber;
        instituteId: z.ZodNullable<z.ZodNumber>;
        status: z.ZodNumber;
        source: z.ZodNumber;
        contactId: z.ZodNumber;
        amount: z.ZodNumber;
        comment: z.ZodNullable<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodString>>;
    }, z.core.$strict>;
    filters: z.ZodOptional<z.ZodObject<{
        addressCategory: z.ZodOptional<z.ZodNumber>;
        gender: z.ZodOptional<z.ZodNumber>;
        maleAmount: z.ZodOptional<z.ZodNumber>;
        femaleAmount: z.ZodOptional<z.ZodNumber>;
        onlyWithPicture: z.ZodOptional<z.ZodLiteral<true>>;
        onlyAnniversaries: z.ZodOptional<z.ZodLiteral<true>>;
        onlyAnniversariesAndOldest: z.ZodOptional<z.ZodLiteral<true>>;
        onlyWithConcents: z.ZodOptional<z.ZodLiteral<true>>;
        year1: z.ZodOptional<z.ZodNumber>;
        year2: z.ZodOptional<z.ZodNumber>;
        date1: z.ZodOptional<z.ZodNumber>;
        date2: z.ZodOptional<z.ZodNumber>;
        regions: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        homes: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        minFromOneHouse: z.ZodOptional<z.ZodNumber>;
        maxFromOneHouse: z.ZodOptional<z.ZodNumber>;
        maxNoAddress: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
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
declare const occasionNodeDataSchema: z.ZodObject<{
    type: z.ZodNumber;
    month: z.ZodNullable<z.ZodNumber>;
    year: z.ZodNullable<z.ZodNumber>;
}, z.core.$strict>;
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
        }, z.core.$strict>>]>;
        matchMode: z.ZodString;
        operator: z.ZodEnum<{
            and: "and";
            or: "or";
        }>;
    }, z.core.$strict>>>>;
}, z.core.$strict>;
export declare const orderStatusUpdateSchema: z.ZodObject<{
    id: z.ZodNumber;
    status: z.ZodNumber;
}, z.core.$strict>;
export declare const orderIdParamsSchema: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
}, z.core.$strict>;
export declare const orderEditRecipientsSchema: z.ZodObject<{
    id: z.ZodNumber;
    deletingIds: z.ZodArray<z.ZodNumber>;
}, z.core.$strict>;
export declare const orderFilterRegionsAndHomesSchema: z.ZodObject<{
    regions: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, z.core.$strict>>;
    homes: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        regionId: z.ZodNumber;
    }, z.core.$strict>>;
}, z.core.$strict>;
declare const orderRecipientSchema: z.ZodObject<{
    index: z.ZodNumber;
    id: z.ZodNumber;
    fullNameSnapshot: z.ZodString;
    specialComment: z.ZodString;
    birthDay: z.ZodNumber;
    birthMonth: z.ZodNumber;
    birthYear: z.ZodNullable<z.ZodNumber>;
    infoNote: z.ZodNullable<z.ZodString>;
    photoLink: z.ZodNullable<z.ZodString>;
    status: z.ZodString;
    statusId: z.ZodNumber;
}, z.core.$strict>;
export declare const orderRecipientsSchema: z.ZodArray<z.ZodObject<{
    homeId: z.ZodNumber;
    postAddress: z.ZodString;
    infoNote: z.ZodNullable<z.ZodString>;
    noAddressNote: z.ZodNullable<z.ZodString>;
    homeRecipients: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        id: z.ZodNumber;
        fullNameSnapshot: z.ZodString;
        specialComment: z.ZodString;
        birthDay: z.ZodNumber;
        birthMonth: z.ZodNumber;
        birthYear: z.ZodNullable<z.ZodNumber>;
        infoNote: z.ZodNullable<z.ZodString>;
        photoLink: z.ZodNullable<z.ZodString>;
        status: z.ZodString;
        statusId: z.ZodNumber;
    }, z.core.$strict>>;
}, z.core.$strict>>;
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
export type OccasionNodeData = z.infer<typeof occasionNodeDataSchema>;
export interface OccasionNode {
    key: string;
    label: string;
    data: OccasionNodeData;
    children?: OccasionNode[];
}
export declare const occasionNodeSchema: z.ZodType<OccasionNode>;
export declare const occasionNodesSchema: z.ZodArray<z.ZodType<OccasionNode, unknown, z.core.$ZodTypeInternals<OccasionNode, unknown>>>;
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
    length: z.ZodNumber;
    options: z.ZodObject<{
        users: z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            userName: z.ZodString;
        }, z.core.$strict>>;
        statuses: z.ZodArray<z.ZodObject<{
            value: z.ZodNumber;
            label: z.ZodString;
        }, z.core.$strict>>;
        sources: z.ZodArray<z.ZodObject<{
            value: z.ZodNumber;
            label: z.ZodString;
        }, z.core.$strict>>;
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
            specialComment: z.ZodString;
            birthDay: z.ZodNumber;
            birthMonth: z.ZodNumber;
            birthYear: z.ZodNullable<z.ZodNumber>;
            infoNote: z.ZodNullable<z.ZodString>;
            photoLink: z.ZodNullable<z.ZodString>;
            status: z.ZodString;
            statusId: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type OrderFilterRegionsAndHomes = z.infer<typeof orderFilterRegionsAndHomesSchema>;
export type OrderDraft = z.infer<typeof orderDraftSchema>;
export type OrderFilter = z.infer<typeof orderFilterSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderDetails = z.infer<typeof orderDetailsSchema>;
export type OrderRecipients = z.infer<typeof orderRecipientsSchema>;
export type OrderRecipient = z.infer<typeof orderRecipientSchema>;
export type OrderQuery = z.infer<typeof orderQueryDTOSchema>;
export type OrdersList = z.infer<typeof ordersListSchema>;
export {};
