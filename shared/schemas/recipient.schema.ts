import { z } from 'zod';
import { positiveInt } from './common.schema.js';

export const occasionIdSchema = z
  .object({
    occasionId: positiveInt,
  })
  .strict();

export const recipientListDataSchema = z
  .object({
    seniorsIds: z.array(positiveInt).min(1),
    occasionId: positiveInt,
  })
  .strict();

export const recipientDataSchema = z
  .object({
    type: positiveInt.max(6),
    year: positiveInt.min(2022),
    month: positiveInt.max(12).optional(),
  })
  .strict();

export const recipientDestroySchema = z
  .object({
    recipientIds: z.array(positiveInt).min(1),
    occasionId: positiveInt,
  })
  .strict();

export const recipientQueryDTOSchema = z
  .object({
    occasionId: positiveInt,
    offset: z.number().int().min(0),
    limit: z.number().int().min(1).max(100),
    sortField: z
      .union([z.string(), z.array(z.string())])
      .nullable()
      .optional(),
    sortOrder: z
      .number() //z.union([z.literal(1), z.literal(-1)])
      .nullable()
      .optional(),
    searchValue: z.string().optional(),
    filters: z
      .record(
        z.string(),
        z
          .array(
            z
              .object({
                value: z.union([z.string(), z.boolean(), z.number().int()]),
                matchMode: z.string(),
                operator: z.string(),
              })
              .strict(),
          )
          .min(1),
      )
      .default({}),
  })
  .strict();

export const recipientSchema = z
  .object({
    id: positiveInt,
    fullName: z.string(),
    birthDay: positiveInt.max(31).nullable(),
    birthMonth: positiveInt.max(12).nullable(),
    birthYear: positiveInt.nullable(),
    category: z.string(),
    acceptableForSchool: z.boolean(),
    regionName: z.string(),
    homeName: z.string(),
    plusAmount: z.number().int().min(0),
    specialComment: z.string(),
    isAbsent: z.boolean(),
  })
  .strict();

export const recipientsShortSchema = z.array(
  z.object({
    id: positiveInt,
    fullData: z.string(),
  }),
);

export const recipientsListSchema = z
  .object({
    list: z.array(recipientSchema),
    length: z.number().int().min(0),
  })
  .strict();

export type Recipient = z.infer<typeof recipientSchema>;
export type RecipientQuery = z.infer<typeof recipientQueryDTOSchema>;
export type RecipientsShortList = z.infer<typeof recipientsShortSchema>;
