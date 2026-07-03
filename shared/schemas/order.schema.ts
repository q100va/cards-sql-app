import { z } from 'zod';
import {
  toTrim,
  emptyToNull,
  keepE164Chars,
  keepE164CharsNullable,
  nonEmpty,
  nonEmptyTrim,
  nonEmptyTrimMax,
  positiveInt,
  nullableInt,
  nullableIsoDate,
  intOptArray,
} from './common.schema.js';

const currentYear = new Date().getFullYear();

export const orderDraftSchema = z
  .object({
    occasionId: positiveInt,
    //occasionType: z.number().int().min(1).max(6),
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
    regions: z.array(
      z.object({
        id: positiveInt,
        name: z.string().min(1),
        //neighbors: z.array(positiveInt),
      }),
    ),
    homes: z.array(
      z.object({
        id: positiveInt,
        name: z.string().min(1),
        regionId: positiveInt,
      }),
    ),
  })
  .strict();
export const orderSchema = z
  .object({
    id: positiveInt,
  })
  .strict();

const orderRecipientSchema = z.object({
  index: positiveInt,
  recipientId: positiveInt,
  fullNameSnapshot: z.string(),
  specialComment: z.string().nullable(),
  birthDay: positiveInt,
  birthMonth: positiveInt,
  birthYear: positiveInt,
  infoNote: z.string().nullable(),
  photoLink: z.string().nullable(),
  recipientStatus: z.string(),
});

export const orderRecipientsSchema = z.array(
  z.object({
    homeId: positiveInt,
    postAddress: z.string(),
    infoNote: z.string().nullable(),
    noAddressNote: z.string().nullable(),
    homeRecipients: z.array(orderRecipientSchema),
  }),
);

export type OrderFiltersData = z.infer<typeof orderFiltersDataSchema>;
export type OrderDraft = z.infer<typeof orderDraftSchema>;
export type OrderFilter = z.infer<typeof orderFilterSchema>;
export type Filter = z.infer<typeof filterSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderRecipients = z.infer<typeof orderRecipientsSchema>;
export type OrderRecipient = z.infer<typeof orderRecipientSchema>;
