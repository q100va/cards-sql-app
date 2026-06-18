import { z } from 'zod';
import { positiveInt, } from './common.schema.js';
const currentYear = new Date().getFullYear();
export const orderDraftSchema = z
    .object({
    occasionId: positiveInt,
    volunteerId: positiveInt,
    userId: positiveInt,
    instituteId: positiveInt.nullable(),
    status: z.number().int().min(1).max(2),
    source: z.number().int().min(1).max(9),
    contactId: positiveInt,
    amount: positiveInt,
    comment: z
        .string()
        .trim()
        .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
        .nullable(),
})
    .strict();
export const orderFilterSchema = z
    .object({
    addressCategory: z.number().int().min(1).max(5),
    gender: z.number().int().min(1).max(4),
    maleAmount: z.number().int().min(1).nullable(),
    femaleAmount: z.number().int().min(1).nullable(),
    onlyWithPicture: z.boolean(),
    onlyAnniversaries: z.boolean(),
    onlyAnniversariesAndOldest: z.boolean(),
    onlyWithConcents: z.boolean(),
    year1: z.number().int().min(1900).max(currentYear).nullable(),
    year2: z.number().int().min(1900).max(currentYear).nullable(),
    date1: z.number().int().min(1).max(31).nullable(),
    date2: z.number().int().min(1).max(31).nullable(),
    regions: z.array(positiveInt),
    homes: z.array(positiveInt),
    //addSpareRegions: z.boolean(),
    minFromOneHouse: z.number().int().min(1).nullable(),
    maxFromOneHouse: z.number().int().min(1).nullable(),
    maxNoAddress: z.number().int().min(1).nullable(),
})
    .strict();
export const filterSchema = z
    .object({
    addressCategory: z.number().int().min(2).max(5).optional(),
    gender: z.number().int().min(2).max(4).optional(),
    maleAmount: z.number().int().min(1).optional(),
    femaleAmount: z.number().int().min(1).optional(),
    onlyWithPicture: z.literal(true).optional(),
    onlyAnniversaries: z.literal(true).optional(),
    onlyAnniversariesAndOldest: z.literal(true).optional(),
    onlyWithConcents: z.literal(true).optional(),
    year1: z.number().int().min(1900).max(currentYear).optional(),
    year2: z.number().int().min(1900).max(currentYear).optional(),
    date1: z.number().int().min(1).max(31).optional(),
    date2: z.number().int().min(1).max(31).optional(),
    regions: z.array(positiveInt).optional(),
    homes: z.array(positiveInt).optional(),
    //addSpareRegions: z.boolean(),
    minFromOneHouse: z.number().int().min(1).optional(),
    maxFromOneHouse: z.number().int().min(1).optional(),
    maxNoAddress: z.number().int().min(1).optional(),
})
    .partial()
    .optional();
export const orderFiltersDataSchema = z
    .object({
    regions: z.array(z.object({
        id: positiveInt,
        name: z.string().min(1),
        //neighbors: z.array(positiveInt),
    })),
    homes: z.array(z.object({
        id: positiveInt,
        name: z.string().min(1),
        regionId: positiveInt,
    })),
})
    .strict();
export const orderSchema = z
    .object({
    id: positiveInt,
})
    .strict();
