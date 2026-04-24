// schemas/file.schema.js
import { z } from 'zod';
export const downloadQuery = z.object({
    filename: z.string()
        .trim()
        .min(1)
        .refine((s) => !s.includes('/') && !s.includes('\\'), 'Invalid filename'),
}).strip();
