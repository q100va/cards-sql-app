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

export const orderQueryDTOSchema = z.object({
  //userId: z.number().int().positive(),
  offset: z.number().int().min(0),
  limit: z.number().int().min(1).max(100),
  sortField: z.union([
    z.string(),
    z.array(z.string()),
    z.null(),
    z.undefined(),
  ]),
  sortOrder: z.number().nullable().optional(),
  searchValue: z.string().optional(),
  filters: z
    .record(
      z.string(),
      //   z.union([
      z.array(
        z.object({
          value: z.union([z.string(), z.boolean(), z.number().int()]),
          matchMode: z.string(),
          operator: z.string(),
        }),
      ),
      //   z.boolean()
      //  ])
    )
    .default({}),
});

export const orderSchema = z
  .object({
    id: positiveInt,
    date: z.coerce.date(),
    amount: positiveInt,
    userName: z.string(),
    volunteerName: z.string(),
    instituteName: z.string().nullable(),
    contact: z.string(),
    status: z.string(),
    source: z.string(),
    occasion: z.string(),
    comment: z.string().nullable(),
  })
  .strict();

export const ordersListSchema = z
  .object({
    list: z.array(orderSchema),
    length: z.coerce.number().int().min(0),
  })
  .strict();

export const orderDetailsSchema = z
  .object({
    id: positiveInt,
    occasionId: positiveInt,
    volunteerId: positiveInt,
    userId: positiveInt,
    contactId: positiveInt,
    instituteId: positiveInt.nullable(),
    date: z.coerce.date(),
    amount: positiveInt,
    status: z.number().int().min(1).max(4),
    source: z.number().int().min(1).max(9),
    comment: z.string().nullable(),
    userName: z.string(),
    volunteerName: z.string(),
    contact: z.string(),
    instituteName: z.string().nullable(),
    occasion: z.string(),
    recipients: orderRecipientsSchema,
  })
  .strict();

export const orderEditSchema = z
  .object({
    status: z.number().int().min(1).max(4),
    source: z.number().int().min(1).max(9),
    comment: z
      .string()
      .trim()
      .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' })
      .nullable(),
  })
  .strict();

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
