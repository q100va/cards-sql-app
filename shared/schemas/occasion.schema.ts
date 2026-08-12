import { z } from 'zod';
import {
  positiveInt,
  requiredNumber,
  positiveIntParam,
} from './common.schema.js';

const occasionType = requiredNumber().int().min(1).max(6);
const occasionYear = requiredNumber().int().min(2022);
const occasionStatus = requiredNumber().int().min(1).max(2);
const occasionMonth = requiredNumber().int().min(1).max(12);

export const occasionDataSchema = z
  .object({
    type: positiveIntParam.max(6),
    year: positiveIntParam.min(2022),
    month: positiveIntParam.max(12).optional(),
  })
  .strict();

export const occasionDraftSchema = z
  .object({
    type: occasionType,
    year: occasionYear,
    month: occasionMonth.nullable(),
    status: occasionStatus,
  })
  .strict();

export const monthIdSchema = occasionMonth;

export const occasionEditSchema = z
  .object({
    id: positiveInt,
    status: occasionStatus,
  })
  .strict();

export const occasionIdSchema = z
  .object({
    id: positiveIntParam,
  })
  .strict();

export const occasionTypeIdSchema = z
  .object({
    typeId: positiveIntParam.max(6),
  })
  .strict();

export const occasionSchema = z
  .object({
    id: positiveInt,
    type: z.string(),
    date: z.string().nullable(),
    monthNameKey: z.string().nullable(),
    month: z.string().nullable(),
    year: z.number().int().min(2022),
    amount: z.number().int().min(0),
    status: z.string(),
  })
  .strict();

export const optionsSchema = z
  .object({
    date: z.array(z.string()),
    month: z.array(z.string()),
    year: z.array(z.number()),
    type: z.array(z.string()),
    status: z.array(z.string()),
  })
  .strict();

export const occasionsListSchema = z
  .object({
    occasions: z.array(occasionSchema),
    options: optionsSchema,
  })
  .strict();

export type OccasionDraft = z.infer<typeof occasionDraftSchema>;
export type Options = z.infer<typeof optionsSchema>;
export type Occasion = z.infer<typeof occasionSchema>;
