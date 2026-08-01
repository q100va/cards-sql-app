import { z } from 'zod';
export declare const reportDTOSchema: z.ZodObject<{
    userId: z.ZodNullable<z.ZodNumber>;
    type: z.ZodNumber;
    frequency: z.ZodString;
    months: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    quarters: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    years: z.ZodArray<z.ZodNumber>;
}, z.core.$strict>;
