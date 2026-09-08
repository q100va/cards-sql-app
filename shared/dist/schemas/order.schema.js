import { z } from 'zod';
import { positiveInt, positiveIntParam, emptyToNullMax, nonEmptyString, } from './common.schema.js';
import { ADDRESS_CATEGORY, GENDER_FILTER, ORDER_SOURCE, ORDER_STATUS, } from '../constants/orders.js';
import { OCCASION_TYPES, STATUSES as OCCASION_STATUSES, } from '../constants/occasions.js';
const currentYear = new Date().getFullYear();
const addressCategoryFilterSchema = z.union([
    z.literal(ADDRESS_CATEGORY.FOR_SCHOOLS),
    z.literal(ADDRESS_CATEGORY.ONLY_WITH_ADDRESS),
    z.literal(ADDRESS_CATEGORY.NO_RELEASED),
    z.literal(ADDRESS_CATEGORY.ONLY_MENT),
]);
const addressCategoryFormSchema = z.union([
    z.literal(ADDRESS_CATEGORY.ANY),
    z.literal(ADDRESS_CATEGORY.FOR_SCHOOLS),
    z.literal(ADDRESS_CATEGORY.ONLY_WITH_ADDRESS),
    z.literal(ADDRESS_CATEGORY.NO_RELEASED),
    z.literal(ADDRESS_CATEGORY.ONLY_MENT),
]);
const genderFilterSchema = z.union([
    z.literal(GENDER_FILTER.MALE),
    z.literal(GENDER_FILTER.FEMALE),
    z.literal(GENDER_FILTER.PROPORTION),
]);
const genderFormSchema = z.union([
    z.literal(GENDER_FILTER.ANY),
    z.literal(GENDER_FILTER.MALE),
    z.literal(GENDER_FILTER.FEMALE),
    z.literal(GENDER_FILTER.PROPORTION),
]);
const orderDraftStatusSchema = z.union([
    z.literal(ORDER_STATUS.PENDING),
    z.literal(ORDER_STATUS.ACCEPTED),
]);
const orderStatusSchema = z.union([
    z.literal(ORDER_STATUS.PENDING),
    z.literal(ORDER_STATUS.ACCEPTED),
    z.literal(ORDER_STATUS.RETURNED),
    z.literal(ORDER_STATUS.OVERDUE),
]);
const orderSourceSchema = z.union([
    z.literal(ORDER_SOURCE.SUBSCRIPTION),
    z.literal(ORDER_SOURCE.WEBSITE),
    z.literal(ORDER_SOURCE.VK),
    z.literal(ORDER_SOURCE.TELEGRAM),
    z.literal(ORDER_SOURCE.INSTAGRAM),
    z.literal(ORDER_SOURCE.DOBRORU),
    z.literal(ORDER_SOURCE.INFLUENCER),
    z.literal(ORDER_SOURCE.OTHER),
]);
const occasionTypeSchema = positiveInt.refine((value) => OCCASION_TYPES.some((occasionType) => occasionType.id === value));
const occasionStatusSchema = positiveInt.refine((value) => OCCASION_STATUSES.some((status) => status.id === value));
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
    status: orderDraftStatusSchema,
    source: orderSourceSchema,
    forSchoolDepartment: z.boolean(),
    contactId: positiveInt,
    amount: positiveInt,
    comment: emptyToNullMax(500),
})
    .strict();
function isHouseDistributionPossible(amount, min, max) {
    if (min <= 0 ||
        max <= 0 ||
        min > max ||
        amount <= 0) {
        return false;
    }
    const minHouses = Math.ceil(amount / max);
    const maxHouses = Math.floor(amount / min);
    return minHouses <= maxHouses;
}
export const filterSchema = z
    .object({
    addressCategory: addressCategoryFilterSchema.optional(),
    gender: genderFilterSchema.optional(),
    maleAmount: positiveInt.optional(),
    femaleAmount: positiveInt.optional(),
    onlyWithPicture: z.literal(true).optional(),
    onlyAnniversaries: z.literal(true).optional(),
    onlyAnniversariesAndOldest: z.literal(true).optional(),
    onlyWithConcents: z.literal(true).optional(),
    year1: positiveInt
        .min(1900)
        .max(currentYear)
        .optional(),
    year2: positiveInt
        .min(1900)
        .max(currentYear)
        .optional(),
    date1: positiveInt.max(31).optional(),
    date2: positiveInt.max(31).optional(),
    regions: z.array(positiveInt).optional(),
    homes: z.array(positiveInt).optional(),
    minFromOneHouse: positiveInt.optional(),
    maxFromOneHouse: positiveInt.optional(),
    maxNoAddress: positiveInt.optional(),
})
    .strict()
    .superRefine((filters, ctx) => {
    if (filters.date1 != null &&
        filters.date2 != null &&
        filters.date1 > filters.date2) {
        ctx.addIssue({
            code: 'custom',
            path: ['date2'],
            message: 'FORM_VALIDATION.ORDER.INVALID_DATE_RANGE',
        });
    }
    if (filters.year1 != null &&
        filters.year2 != null &&
        filters.year1 > filters.year2) {
        ctx.addIssue({
            code: 'custom',
            path: ['year2'],
            message: 'FORM_VALIDATION.ORDER.INVALID_YEAR_RANGE',
        });
    }
    if (filters.minFromOneHouse != null &&
        filters.maxFromOneHouse != null &&
        filters.minFromOneHouse >
            filters.maxFromOneHouse) {
        ctx.addIssue({
            code: 'custom',
            path: ['maxFromOneHouse'],
            message: 'FORM_VALIDATION.ORDER.MIN_GREATER_THAN_MAX',
        });
    }
    if ((filters.addressCategory ===
        ADDRESS_CATEGORY.ONLY_WITH_ADDRESS ||
        filters.addressCategory ===
            ADDRESS_CATEGORY.ONLY_MENT) &&
        filters.maxNoAddress !== undefined) {
        ctx.addIssue({
            code: 'custom',
            path: ['maxNoAddress'],
            message: 'FORM_VALIDATION.ORDER.MAX_NO_ADDRESS_NOT_ALLOWED',
        });
    }
    if (filters.minFromOneHouse != null &&
        filters.gender ===
            GENDER_FILTER.PROPORTION) {
        ctx.addIssue({
            code: 'custom',
            path: ['gender'],
            message: 'FORM_VALIDATION.GENDER_PROPORTION_NOT_ALLOWED',
        });
    }
    if (filters.gender !==
        GENDER_FILTER.PROPORTION &&
        (filters.maleAmount != null ||
            filters.femaleAmount != null)) {
        ctx.addIssue({
            code: 'custom',
            path: ['gender'],
            message: 'FORM_VALIDATION.GENDER_AMOUNTS_NOT_ALLOWED',
        });
    }
})
    .optional();
export const orderCreateSchema = z
    .object({
    orderDraft: orderDraftSchema,
    filters: filterSchema,
})
    .strict()
    .superRefine(({ orderDraft, filters }, ctx) => {
    if (!filters)
        return;
    const amount = orderDraft.amount;
    if (filters.gender ===
        GENDER_FILTER.PROPORTION &&
        (filters.maleAmount == null ||
            filters.femaleAmount == null ||
            filters.maleAmount +
                filters.femaleAmount !==
                amount)) {
        ctx.addIssue({
            code: 'custom',
            path: [
                'filters',
                'femaleAmount',
            ],
            message: 'FORM_VALIDATION.ORDER.GENDER_AMOUNT_SUM',
        });
    }
    if (filters.maxNoAddress != null &&
        filters.maxNoAddress > amount) {
        ctx.addIssue({
            code: 'custom',
            path: [
                'filters',
                'maxNoAddress',
            ],
            message: 'FORM_VALIDATION.ORDER.MAX_NO_ADDRESS_TOO_BIG',
        });
    }
    if (filters.minFromOneHouse != null &&
        filters.minFromOneHouse > amount) {
        ctx.addIssue({
            code: 'custom',
            path: [
                'filters',
                'minFromOneHouse',
            ],
            message: 'FORM_VALIDATION.ORDER.MIN_FROM_ONE_HOUSE_TOO_BIG',
        });
    }
    if (filters.maxFromOneHouse != null &&
        filters.maxFromOneHouse > amount) {
        ctx.addIssue({
            code: 'custom',
            path: [
                'filters',
                'maxFromOneHouse',
            ],
            message: 'FORM_VALIDATION.ORDER.MAX_FROM_ONE_HOUSE_TOO_BIG',
        });
    }
    if (filters.minFromOneHouse != null &&
        filters.maxFromOneHouse != null &&
        filters.minFromOneHouse <=
            filters.maxFromOneHouse &&
        !isHouseDistributionPossible(amount, filters.minFromOneHouse, filters.maxFromOneHouse)) {
        ctx.addIssue({
            code: 'custom',
            path: [
                'filters',
                'maxFromOneHouse',
            ],
            message: 'FORM_VALIDATION.ORDER.IMPOSSIBLE_HOUSE_DISTRIBUTION',
        });
    }
});
// Form validation.
export const orderFilterSchema = z
    .object({
    addressCategory: addressCategoryFormSchema,
    gender: genderFormSchema,
    maleAmount: positiveInt.nullable(),
    femaleAmount: positiveInt.nullable(),
    onlyWithPicture: z.boolean(),
    onlyAnniversaries: z.boolean(),
    onlyAnniversariesAndOldest: z.boolean(),
    onlyWithConcents: z.boolean(),
    year1: positiveInt
        .min(1900)
        .max(currentYear)
        .nullable(),
    year2: positiveInt
        .min(1900)
        .max(currentYear)
        .nullable(),
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
    type: occasionTypeSchema,
    month: positiveInt.max(12).nullable(),
    year: positiveInt
        .min(2022)
        .nullable(),
})
    .strict();
export const orderQueryDTOSchema = z
    .object({
    offset: z
        .number()
        .int()
        .min(0),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100),
    sortField: z.union([
        z.string(),
        z.array(z.string()),
        z.null(),
        z.undefined(),
    ]),
    // TODO: Restrict to 1 | -1 after frontend cleanup.
    sortOrder: z
        .number()
        .nullable()
        .optional(),
    searchValue: z
        .string()
        .optional(),
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
        // TODO: Restrict to 'and' | 'or' after frontend cleanup.
        operator: z.string(),
    })
        .strict())
        .min(1))
        .default({}),
})
    .strict();
export const orderStatusUpdateSchema = z
    .object({
    id: positiveInt,
    status: orderStatusSchema,
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
    deletingIds: z
        .array(positiveInt)
        .min(1),
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
    statusId: orderStatusSchema,
    source: nonEmptyString,
    occasion: nonEmptyString,
    occasionStatus: occasionStatusSchema,
    comment: nonEmptyString.nullable(),
})
    .strict();
export const occasionNodeSchema = z.lazy(() => z
    .object({
    key: z.string(),
    label: z.string(),
    data: occasionNodeDataSchema,
    children: z
        .array(occasionNodeSchema)
        .optional(),
})
    .strict());
export const occasionNodesSchema = z.array(occasionNodeSchema);
export const ordersListSchema = z
    .object({
    list: z.array(orderSchema),
    length: z
        .number()
        .int()
        .min(0),
    options: z.object({
        users: z.array(z
            .object({
            id: positiveInt,
            userName: nonEmptyString,
        })
            .strict()),
        statuses: z.array(z
            .object({
            value: orderStatusSchema,
            label: nonEmptyString,
        })
            .strict()),
        sources: z.array(z
            .object({
            value: orderSourceSchema,
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
