import { z } from 'zod';

export const occasionSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().trim(),
    date: z.string().trim().optional(),
    month: z.string().trim().optional(),
    year: z.string().trim(),
    type: z.string().trim(),
    isActive: z.boolean(),
    isDeletable: z.boolean(),
  })
  .strict();

export const occasionNameSchema = z
  .object({
    name: z.string().trim(),
  })
  .strict();

export const occasionIdSchema = z
  .object({
    id: z.coerce.number().int().positive(),
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
    name: z.string().trim(),
    date: z.string().trim().nullable(),
    month: z.string().trim().nullable(),
    year: z.string().trim(),
    type: z.string().trim(),
    isActive: z.boolean(),
  })
  .strict();

  export const optionsSchema = z.object({
      name: z.array(z.string()),
      date: z.array(z.string()),
      month: z.array(z.string()),
      year: z.array(z.string()),
      type: z.array(z.string()),
      isActive: z.array(z.string()),
    })
  .strict();


export const occasionsListSchema = z
  .object({
    occasions: z.array(occasionSchema),
    options: optionsSchema,
  })
  .strict();

//export const occasionsNamesListSchema = z.array(roleShortSchema);

export type Occasion = z.infer<typeof occasionSchema>;
export type OccasionDraft = z.infer<typeof occasionDraftSchema>;
export type Options = z.infer<typeof optionsSchema>;
