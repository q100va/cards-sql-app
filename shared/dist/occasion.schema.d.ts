import { z } from 'zod';
export declare const occasionSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    date: z.ZodOptional<z.ZodString>;
    month: z.ZodOptional<z.ZodString>;
    year: z.ZodString;
    type: z.ZodString;
    status: z.ZodString;
    isDeletable: z.ZodBoolean;
}, z.core.$strict>;
export declare const occasionNameSchema: z.ZodObject<{
    name: z.ZodString;
}, z.core.$strict>;
export declare const occasionIdSchema: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
}, z.core.$strict>;
export declare const occasionDraftSchema: z.ZodObject<{
    name: z.ZodString;
    date: z.ZodNullable<z.ZodString>;
    month: z.ZodNullable<z.ZodString>;
    year: z.ZodString;
    type: z.ZodString;
    status: z.ZodString;
}, z.core.$strict>;
export declare const optionsSchema: z.ZodObject<{
    name: z.ZodArray<z.ZodString>;
    date: z.ZodArray<z.ZodString>;
    month: z.ZodArray<z.ZodString>;
    year: z.ZodArray<z.ZodString>;
    type: z.ZodArray<z.ZodString>;
    status: z.ZodString;
}, z.core.$strict>;
export declare const occasionsListSchema: z.ZodObject<{
    occasions: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        date: z.ZodOptional<z.ZodString>;
        month: z.ZodOptional<z.ZodString>;
        year: z.ZodString;
        type: z.ZodString;
        status: z.ZodString;
        isDeletable: z.ZodBoolean;
    }, z.core.$strict>>;
    options: z.ZodObject<{
        name: z.ZodArray<z.ZodString>;
        date: z.ZodArray<z.ZodString>;
        month: z.ZodArray<z.ZodString>;
        year: z.ZodArray<z.ZodString>;
        type: z.ZodArray<z.ZodString>;
        status: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
export type Occasion = z.infer<typeof occasionSchema>;
export type OccasionDraft = z.infer<typeof occasionDraftSchema>;
export type Options = z.infer<typeof optionsSchema>;
