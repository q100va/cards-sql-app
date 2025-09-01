import { z } from 'zod';

export const clientLogItemSchema = z.object({
  ts: z.iso.datetime(),
  level: z.enum(['error','warn']),
  message: z.string().min(1),
  stack: z.string().optional(),
  pageUrl: z.string().optional(),
  route: z.string().optional(),
  userId: z.union([z.string(), z.number()]).nullable().optional(),
  sessionId: z.string().min(8),
  corrId: z.string().nullable().optional(),
  userAgent: z.string().optional(),
  context: z.record(z.string(), z.any()).optional(),
});
export const clientLogBatchSchema = z.object({
  app: z.string(),
  env: z.string(),
  items: z.array(clientLogItemSchema).max(200),
});
export type ClientLogBatch = z.infer<typeof clientLogBatchSchema>;
