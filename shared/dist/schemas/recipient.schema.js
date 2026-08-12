import { z } from 'zod';
/* export const monthIdSchema = z
  .number({ message: 'FORM_VALIDATION.REQUIRED' })
  .int({ message: 'Must be an integer' })
  .min(1, { message: 'Must be >= 1' })
  .max(12, { message: 'Must be <= 12' }); */
export const recipientSchema = z
    .object({
    id: z.number().int().positive(),
    // name: z.string(),
    fullName: z.string(),
    birthDay: z.number().int().positive().nullable(),
    birthMonth: z.number().int().positive().nullable(),
    birthYear: z.number().int().positive().nullable(),
    category: z.string(),
    acceptableForSchool: z.boolean(),
    regionName: z.string(),
    homeName: z.string(),
    plusAmount: z.number().int().min(0),
    specialComment: z.string(),
    isAbsent: z.boolean(),
})
    .strict();
export const recipientDataSchema = z
    .object({
    type: z.coerce.number().int().min(1).max(6),
    year: z.coerce.number().int().min(2022),
    month: z.coerce.number().int().min(1).max(12).optional(),
})
    .strict();
export const recipientIdSchema = z
    .object({
    id: z.coerce.number().int().positive(),
})
    .strict();
export const recipientQueryDTOSchema = z.object({
    occasionId: z.number().int().positive(),
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
        .record(z.string(), 
    //   z.union([
    z.array(z.object({
        value: z.union([z.string(), z.boolean(), z.number().int()]),
        matchMode: z.string(),
        operator: z.string(),
    })))
        .default({}),
});
export const recipientsShortSchema = z.array(z.object({
    id: z.number().int().positive(),
    fullData: z.string(),
}));
export const recipientsListSchema = z
    .object({
    list: z.array(recipientSchema),
    length: z.coerce.number().int().min(0),
})
    .strict();
