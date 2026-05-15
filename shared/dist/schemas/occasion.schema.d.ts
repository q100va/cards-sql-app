import { z } from 'zod';
export declare const monthIdSchema: z.ZodNumber;
export declare const occasionSchema: z.ZodObject<{
    id: z.ZodNumber;
    type: z.ZodString;
    date: z.ZodNullable<z.ZodString>;
    monthNameKey: z.ZodNullable<z.ZodString>;
    month: z.ZodNullable<z.ZodString>;
    year: z.ZodNumber;
    amount: z.ZodNumber;
    status: z.ZodString;
}, z.core.$strict>;
export declare const occasionDataSchema: z.ZodObject<{
    type: z.ZodCoercedNumber<unknown>;
    year: z.ZodCoercedNumber<unknown>;
    month: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strict>;
export declare const occasionIdSchema: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
}, z.core.$strict>;
export declare const occasionEditSchema: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
    status: z.ZodNumber;
}, z.core.$strict>;
export declare const occasionDraftSchema: z.ZodObject<{
    type: z.ZodNumber;
    year: z.ZodNumber;
    month: z.ZodNullable<z.ZodNumber>;
    status: z.ZodNumber;
}, z.core.$strict>;
export declare const optionsSchema: z.ZodObject<{
    date: z.ZodArray<z.ZodString>;
    month: z.ZodArray<z.ZodString>;
    year: z.ZodArray<z.ZodNumber>;
    type: z.ZodArray<z.ZodString>;
    status: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export declare const occasionsListSchema: z.ZodObject<{
    occasions: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        type: z.ZodString;
        date: z.ZodNullable<z.ZodString>;
        monthNameKey: z.ZodNullable<z.ZodString>;
        month: z.ZodNullable<z.ZodString>;
        year: z.ZodNumber;
        amount: z.ZodNumber;
        status: z.ZodString;
    }, z.core.$strict>>;
    options: z.ZodObject<{
        date: z.ZodArray<z.ZodString>;
        month: z.ZodArray<z.ZodString>;
        year: z.ZodArray<z.ZodNumber>;
        type: z.ZodArray<z.ZodString>;
        status: z.ZodArray<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>;
export type Occasion = z.infer<typeof occasionSchema>;
export type OccasionDraft = z.infer<typeof occasionDraftSchema>;
export type Options = z.infer<typeof optionsSchema>;
