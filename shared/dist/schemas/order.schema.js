import { z } from 'zod';
import { positiveInt, positiveIntParam, emptyToNullMax, nonEmptyString, } from './common.schema.js';
const currentYear = new Date().getFullYear();
export const orderDataSchema = z
    .object({
    volunteerId: positiveIntParam,
    occasionId: positiveIntParam,
})
    .strict();
export const orderDraftSchema = z
    .object({
    occasionId: positiveInt,
    volunteerId: positiveInt,
    userId: positiveInt,
    instituteId: positiveInt.nullable(),
    status: positiveInt.max(2),
    source: positiveInt.max(9),
    contactId: positiveInt,
    amount: positiveInt,
    comment: emptyToNullMax(500),
})
    .strict();
export const filterSchema = z
    .object({
    addressCategory: positiveInt.min(2).max(5).optional(),
    gender: positiveInt.min(2).max(4).optional(),
    maleAmount: positiveInt.optional(),
    femaleAmount: positiveInt.optional(),
    onlyWithPicture: z.literal(true).optional(),
    onlyAnniversaries: z.literal(true).optional(),
    onlyAnniversariesAndOldest: z.literal(true).optional(),
    onlyWithConcents: z.literal(true).optional(),
    year1: positiveInt.min(1900).max(currentYear).optional(),
    year2: positiveInt.min(1900).max(currentYear).optional(),
    date1: positiveInt.max(31).optional(),
    date2: positiveInt.max(31).optional(),
    regions: z.array(positiveInt).optional(),
    homes: z.array(positiveInt).optional(),
    minFromOneHouse: positiveInt.optional(),
    maxFromOneHouse: positiveInt.optional(),
    maxNoAddress: positiveInt.optional(),
})
    .strict()
    .optional();
export const orderCreateSchema = z
    .object({
    orderDraft: orderDraftSchema,
    filters: filterSchema,
})
    .strict();
//for form validation
export const orderFilterSchema = z
    .object({
    addressCategory: positiveInt.max(5),
    gender: positiveInt.max(4),
    maleAmount: positiveInt.nullable(),
    femaleAmount: positiveInt.nullable(),
    onlyWithPicture: z.boolean(),
    onlyAnniversaries: z.boolean(),
    onlyAnniversariesAndOldest: z.boolean(),
    onlyWithConcents: z.boolean(),
    year1: positiveInt.min(1900).max(currentYear).nullable(),
    year2: positiveInt.min(1900).max(currentYear).nullable(),
    date1: positiveInt.max(31).nullable(),
    date2: positiveInt.max(31).nullable(),
    regions: z.array(positiveInt),
    homes: z.array(positiveInt),
    minFromOneHouse: positiveInt.nullable(),
    maxFromOneHouse: positiveInt.nullable(),
    maxNoAddress: positiveInt.nullable(),
})
    .strict();
const occasionNodeDataSchema = z
    .object({
    type: positiveInt.max(6),
    month: positiveInt.max(12).nullable(),
    year: positiveInt.min(2022).nullable(),
})
    .strict();
export const orderQueryDTOSchema = z
    .object({
    offset: z.number().int().min(0),
    limit: z.number().int().min(1).max(100),
    sortField: z.union([
        z.string(),
        z.array(z.string()),
        z.null(),
        z.undefined(),
    ]),
    sortOrder: z.number().nullable().optional(), //.union([z.literal(1), z.literal(-1)])
    searchValue: z.string().optional(),
    filters: z
        .record(z.string(), z
        .array(z
        .object({
        value: z.union([
            z.string(),
            z.boolean(),
            z.number().int(),
            z.array(positiveInt),
            z.array(occasionNodeDataSchema),
        ]),
        matchMode: z.string(),
        operator: z.enum(['and', 'or']),
    })
        .strict())
        .min(1))
        .default({}),
})
    .strict();
export const orderStatusUpdateSchema = z
    .object({
    id: positiveInt,
    status: positiveInt.max(4),
})
    .strict();
export const orderIdParamsSchema = z
    .object({
    id: positiveIntParam,
})
    .strict();
export const orderEditRecipientsSchema = z
    .object({
    id: positiveInt,
    deletingIds: z.array(positiveInt).min(1),
})
    .strict();
export const orderFilterRegionsAndHomesSchema = z
    .object({
    regions: z.array(z
        .object({
        id: positiveInt,
        name: nonEmptyString,
    })
        .strict()),
    homes: z.array(z
        .object({
        id: positiveInt,
        name: nonEmptyString,
        regionId: positiveInt,
    })
        .strict()),
})
    .strict();
const orderRecipientSchema = z
    .object({
    index: positiveInt,
    id: positiveInt,
    fullNameSnapshot: nonEmptyString,
    specialComment: z.string(),
    birthDay: positiveInt.max(31),
    birthMonth: positiveInt.max(12),
    birthYear: positiveInt.nullable(),
    infoNote: nonEmptyString.nullable(),
    photoLink: nonEmptyString.nullable(),
    status: nonEmptyString,
    statusId: positiveInt,
})
    .strict();
export const orderRecipientsSchema = z.array(z
    .object({
    homeId: positiveInt,
    postAddress: nonEmptyString,
    infoNote: nonEmptyString.nullable(),
    noAddressNote: nonEmptyString.nullable(),
    homeRecipients: z.array(orderRecipientSchema),
})
    .strict());
export const orderSchema = z
    .object({
    id: positiveInt,
    date: z.coerce.date(),
    amount: positiveInt,
    userName: nonEmptyString,
    volunteerName: nonEmptyString,
    instituteName: nonEmptyString.nullable(),
    contact: nonEmptyString,
    status: nonEmptyString,
    statusId: positiveInt.max(4),
    source: nonEmptyString,
    occasion: nonEmptyString,
    occasionStatus: positiveInt.max(2),
    comment: nonEmptyString.nullable(),
})
    .strict();
export const occasionNodeSchema = z.lazy(() => z
    .object({
    key: z.string(),
    label: z.string(),
    data: occasionNodeDataSchema,
    children: z.array(occasionNodeSchema).optional(),
})
    .strict());
export const occasionNodesSchema = z.array(occasionNodeSchema);
export const ordersListSchema = z
    .object({
    list: z.array(orderSchema),
    length: z.number().int().min(0),
    options: z.object({
        users: z.array(z
            .object({
            id: positiveInt,
            userName: nonEmptyString,
        })
            .strict()),
        statuses: z.array(z
            .object({
            value: positiveInt,
            label: nonEmptyString,
        })
            .strict()),
        sources: z.array(z
            .object({
            value: positiveInt,
            label: nonEmptyString,
        })
            .strict()),
        nodes: occasionNodesSchema,
    }),
})
    .strict();
export const orderDetailsSchema = orderSchema.extend({
    recipients: orderRecipientsSchema,
});
