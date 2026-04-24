import { z } from 'zod';
/* export const occasionIndexSchema = z
  .number({ message: 'FORM_VALIDATION.REQUIRED' })
  .int({ message: 'Must be an integer' })
  .min(1, { message: 'Must be >= 1' })
  .max(6, { message: 'Must be <= 6' }); */
export const monthIdSchema = z
    .number({ message: 'FORM_VALIDATION.REQUIRED' })
    .int({ message: 'Must be an integer' })
    .min(1, { message: 'Must be >= 1' })
    .max(12, { message: 'Must be <= 12' });
export const occasionSchema = z
    .object({
    id: z.number().int().positive(),
    // name: z.string(),
    type: z.string(),
    date: z.string().nullable(),
    monthNameKey: z.string().nullable(),
    month: z.string().nullable(),
    year: z.number().int().min(2022),
    status: z.string(),
    // isDeletable: z.boolean(),
})
    .strict();
export const occasionDataSchema = z
    .object({
    type: z.coerce.number().int().min(1).max(6),
    year: z.coerce.number().int().min(2022),
    month: z.coerce.number().int().min(1).max(12).optional(),
})
    .strict();
export const occasionIdSchema = z
    .object({
    id: z.coerce.number().int().positive(),
})
    .strict();
export const occasionEditSchema = z
    .object({
    id: z.coerce.number().int().positive(),
    status: z
        .number()
        .int({ message: 'Must be an integer' })
        .min(1, { message: 'Must be >= 1' })
        .max(2, { message: 'Must be <= 2' }),
})
    .strict();
/* export const occasionShortSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().trim().min(2).max(50),
  })
  .strict(); */
export const occasionDraftSchema = z
    .object({
    type: z
        .number({ message: 'FORM_VALIDATION.REQUIRED' })
        .int({ message: 'Must be an integer' })
        .min(1, { message: 'Must be >= 1' })
        .max(6, { message: 'Must be <= 6' }),
    year: z
        .number({ message: 'FORM_VALIDATION.REQUIRED' })
        .int({ message: 'Must be an integer' })
        .min(2022, { message: 'Must be >= 2022' }),
    month: z.number().int().min(1).max(12).nullable(),
    status: z.number().int().min(1).max(2),
})
    .strict();
export const optionsSchema = z
    .object({
    // name: z.array(z.string()),
    date: z.array(z.string()),
    month: z.array(z.string()),
    year: z.array(z.number()),
    type: z.array(z.string()),
    status: z.array(z.string()),
    // isActive: z.array(z.string()),
})
    .strict();
export const occasionsListSchema = z
    .object({
    occasions: z.array(occasionSchema),
    options: optionsSchema,
})
    .strict();
//export type Options = z.infer<typeof optionsSchema>;
