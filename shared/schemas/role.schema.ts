import { z } from 'zod';
import { positiveInt, positiveIntParam } from './common.schema.js';

const roleNameValueSchema = z
  .string()
  .trim()
  .min(1, { message: 'FORM_VALIDATION.REQUIRED' })
  .min(2, { message: 'FORM_VALIDATION.TOO_SHORT_2' })
  .max(50, { message: 'FORM_VALIDATION.TOO_LONG_50' });

const roleDescriptionSchema = z
  .string()
  .trim()
  .min(1, { message: 'FORM_VALIDATION.REQUIRED' })
  .min(5, { message: 'FORM_VALIDATION.TOO_SHORT_5' })
  .max(500, { message: 'FORM_VALIDATION.TOO_LONG_500' });

export const roleNameSchema = z
  .object({
    name: roleNameValueSchema,
  })
  .strict();

export const roleDraftSchema = z
  .object({
    name: roleNameValueSchema,
    description: roleDescriptionSchema,
  })
  .strict();

export const roleSchema = z
  .object({
    id: positiveInt,
    name: roleNameValueSchema,
    description: roleDescriptionSchema,
  })
  .strict();

const roleAccessSchema = z
  .object({
    id: positiveInt,
    roleId: positiveInt,
    access: z.boolean(),
    disabled: z.boolean(),
  })
  .strict();

const operationSchema = z
  .object({
    description: z.string().trim(),
    accessToAllOps: z.boolean(),
    object: z.string().trim(),
    objectName: z.string().trim(),
    operation: z.string().trim(),
    operationName: z.string().trim(),
    rolesAccesses: z.array(roleAccessSchema),
    flag: z.enum(['LIMITED', 'FULL']).optional(),
  })
  .strict()
  .superRefine((op, ctx) => {
    if (op.flag && !/^VIEW_(LIMITED|FULL)_/.test(op.operation)) {
      ctx.addIssue({
        code: 'custom',
        path: ['flag'],
        message: 'FLAG_INVALID',
      });
    }
    if (op.accessToAllOps && op.flag) {
      ctx.addIssue({
        code: 'custom',
        path: ['accessToAllOps'],
        message: 'SUPER_OPS_WITH_FLAG',
      });
    }
  });

export const roleChangeAccessSchema = z
  .object({
    access: z.boolean(),
    roleId: positiveInt,
    operation: operationSchema,
  })
  .strict();

export const roleIdSchema = z
  .object({
    id: positiveIntParam,
  })
  .strict();

export const roleAccessesSchema = z
  .object({
    object: z.string().trim(),
    ops: z.array(roleAccessSchema),
  })
  .strict();

export const rolesListSchema = z
  .object({
    roles: z.array(roleSchema),
    operations: z.array(operationSchema),
  })
  .strict();

const roleShortSchema = z
  .object({
    id: positiveInt,
    name: roleNameValueSchema,
  })
  .strict();

export const rolesNamesListSchema = z.array(roleShortSchema);

export type Role = z.infer<typeof roleSchema>;
export type RoleAccess = z.infer<typeof roleAccessSchema>;
export type Operation = z.infer<typeof operationSchema>;
