import { z } from 'zod';
import { positiveInt } from './common.schema.js';
export const reportDTOSchema = z
    .object({
    userId: positiveInt.nullable(),
    type: z.number().int().min(1).max(2),
    frequency: z.string(), //MONTHLY, QUARTERLY, ANNUAL
    months: z.array(z.number().int().min(1).max(12)).nullable(),
    quarters: z.array(z.number().int().min(1).max(4)).nullable(),
    years: z.array(z.number().int().min(2022)),
})
    .strict();
