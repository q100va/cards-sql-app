import { z } from 'zod';

export const auditActionSchema = z.enum([
  'create',
  'update',
  'delete',
  'auth',
]);

export const auditQuerySchema = z
  .object({
    model: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .optional(),

    entityId: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .optional(),

    action: auditActionSchema.optional(),

    correlationId: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .optional(),

    userId: z.coerce
      .number()
      .int()
      .positive()
      .optional(),

    from: z.coerce
      .date()
      .optional(),

    to: z.coerce
      .date()
      .optional(),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10),

    offset: z.coerce
      .number()
      .int()
      .min(0)
      .default(0),
  })
  .strict();

// Diff:
// - create: { after: Record<string, unknown> }
// - delete: { before: Record<string, unknown> }
// - update: { changed: Record<string, [unknown, unknown]> }
// - auth: { event: string, reason?: string, details?: Record<string, unknown> }

export const auditDiffCreateSchema = z
  .object({
    after: z.record(
      z.string(),
      z.unknown(),
    ),
  })
  .strict();

export const auditDiffDeleteSchema = z
  .object({
    before: z.record(
      z.string(),
      z.unknown(),
    ),
  })
  .strict();

export const auditDiffUpdateSchema = z
  .object({
    changed: z.record(
      z.string(),
      z.tuple([
        z.unknown(),
        z.unknown(),
      ]),
    ),
  })
  .strict();

export const auditDiffAuthSchema = z
  .object({
    event: z
      .string()
      .trim()
      .min(1),

    reason: z
      .string()
      .trim()
      .min(1)
      .optional(),

    details: z
      .record(
        z.string(),
        z.unknown(),
      )
      .optional(),
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
    id: z.union([
      z.string(),
      z.number(),
    ]),

    action: auditActionSchema,

    model: z
      .string()
      .trim()
      .min(1)
      .max(64),

    entityId: z
      .string()
      .trim()
      .max(64)
      .nullable(),

    diff: auditDiffSchema,

    actorUserId: z
      .number()
      .int()
      .positive()
      .nullable(),

    correlationId: z
      .string()
      .trim()
      .max(128)
      .nullable(),

    ip: z
      .string()
      .trim()
      .max(64)
      .nullable(),

    userAgent: z
      .string()
      .trim()
      .nullable(),

    createdAt: z.coerce.date(),
  })
  .strict();

export const auditPageSchema = z
  .object({
    rows: z.array(
      auditItemSchema,
    ),
    count: z
      .number()
      .int()
      .nonnegative(),
  })
  .strict();

export type AuditItem =
  z.infer<typeof auditItemSchema>;

export type AuditPage =
  z.infer<typeof auditPageSchema>;
