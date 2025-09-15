import { z } from 'zod';

export const auditQuerySchema = z.object({
  model: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  action: z.enum(['create', 'update', 'delete']).optional(),
  correlationId: z.string().trim().min(1).optional(),
  userId: z.coerce.number().int().positive().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

// 'create' | 'update' | 'delete' | 'auth'
export const auditActionSchema = z.enum(['create', 'update', 'delete', 'auth']);

// Diff:
// - create: { after: Record<string, unknown> }
// - delete: { before: Record<string, unknown> }
// - update: { changed: Record<string, [unknown, unknown]> }
// - auth: { event: string, reason?: string, details?: Record<string, [unknown, unknown]> }
export const auditDiffCreateSchema = z
  .object({
    after: z.record(z.string(), z.unknown()),
  })
  .strict();

export const auditDiffDeleteSchema = z
  .object({
    before: z.record(z.string(), z.unknown()),
  })
  .strict();

export const auditDiffUpdateSchema = z
  .object({
    changed: z.record(z.string(), z.tuple([z.unknown(), z.unknown()])),
  })
  .strict();

  export const auditDiffAuthSchema = z
  .object({
    event: z.string().trim(),
    reason: z.string().trim().optional(),
    details: z.record(z.string(), z.tuple([z.unknown(), z.unknown()])).optional(),
  })
  .strict();


export const auditDiffSchema = z.union([
  auditDiffCreateSchema,
  auditDiffDeleteSchema,
  auditDiffUpdateSchema,
  auditDiffAuthSchema,
]);

export const auditItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    action: auditActionSchema,
    model: z.string().trim(),
    entityId: z.string().trim(),
    diff: auditDiffSchema,
    actorUserId: z.number().nullable(),
    correlationId: z.string().trim().nullable(),
    ip: z.string().trim().nullable(),
    userAgent: z.string().trim().nullable(),
    createdAt: z.string().trim(),
  })
  .strict();

export const auditPageSchema = z
  .object({
    rows: z.array(auditItemSchema),
    count: z.number().int().nonnegative(),
  })
  .strict();

export type AuditItem = z.infer<typeof auditItemSchema>;
export type AuditPage = z.infer<typeof auditPageSchema>;
