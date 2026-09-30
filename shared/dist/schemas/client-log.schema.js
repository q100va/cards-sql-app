import { z } from 'zod';
export const clientLogItemSchema = z
    .object({
    ts: z.iso.datetime(),
    level: z.enum(['error', 'warn']),
    message: z.string().min(1).max(5_000),
    stack: z.string().max(20_000).optional(),
    pageUrl: z.string().max(2_000).optional(),
    route: z.string().max(1_000).optional(),
    userId: z
        .union([z.string().min(1).max(100), z.number().int().positive()])
        .nullable()
        .optional(),
    sessionId: z.string().min(8).max(100),
    corrId: z.string().max(128).nullable().optional(),
    userAgent: z.string().max(1_000).optional(),
    context: z.record(z.string(), z.unknown()).optional(),
})
    .strict();
export const clientLogBatchSchema = z
    .object({
    app: z.literal('cards-sql-app'),
    env: z.enum(['development', 'production']),
    items: z.array(clientLogItemSchema).min(1).max(200),
})
    .strict();
