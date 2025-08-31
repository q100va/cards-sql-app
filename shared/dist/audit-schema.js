import { z } from 'zod';
export const auditQuerySchema = z.object({
    model: z.string().optional(),
    entityId: z.string().optional(),
    action: z.enum(['create', 'update', 'delete']).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});
// 'create' | 'update' | 'delete'
export const AuditActionSchema = z.enum(['create', 'update', 'delete']);
// Diff:
// - create: { after: Record<string, unknown> }
// - delete: { before: Record<string, unknown> }
// - update: { changed: Record<string, [unknown, unknown]> }
export const AuditDiffCreateSchema = z
    .object({
    after: z.record(z.string(), z.unknown()),
})
    .strict();
export const AuditDiffDeleteSchema = z
    .object({
    before: z.record(z.string(), z.unknown()),
})
    .strict();
export const AuditDiffUpdateSchema = z
    .object({
    changed: z.record(z.string(), z.tuple([z.unknown(), z.unknown()])),
})
    .strict();
export const AuditDiffSchema = z.union([
    AuditDiffCreateSchema,
    AuditDiffDeleteSchema,
    AuditDiffUpdateSchema,
]);
export const AuditItemSchema = z
    .object({
    id: z.union([z.string(), z.number()]),
    action: AuditActionSchema,
    model: z.string(),
    entityId: z.string(),
    diff: AuditDiffSchema,
    actorUserId: z.number().nullable(),
    correlationId: z.string().nullable(),
    ip: z.string().nullable(),
    userAgent: z.string().nullable(),
    createdAt: z.string(),
})
    .strict();
export const AuditPageSchema = z
    .object({
    rows: z.array(AuditItemSchema),
    page: z
        .object({
        limit: z.number().int().min(1).max(100),
        offset: z.number().int().min(0),
        count: z.number().int().nonnegative().optional(),
    })
        .strict(),
})
    .strict();
