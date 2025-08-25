import { z } from 'zod';

export const roleSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(2).max(50),
  description: z.string().trim().min(2).max(500),
}).strict();

export const roleNameSchema = z.object({
  name: z.string().trim().min(2).max(50),
}).strict();

export const roleIdSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

export const roleShortSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(2).max(50),
}).strict();

export const roleDraftSchema = z.object({
  name: z.string().trim()
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(50, 'Имя не должно быть длиннее 50 символов'),
  description: z.string().trim()
    .min(2, 'Описание должно содержать минимум 2 символа')
    .max(500, 'Описание не должно быть длиннее 500 символов'),
}).strict();

export const roleAccessSchema = z.object({
  id: z.number().int().positive(),
  roleId: z.number().int().positive(),
  access: z.boolean(),
  disabled: z.boolean(),
}).strict();

export const operationSchema = z.object({
  description: z.string().trim(),
  accessToAllOps: z.boolean().optional().default(false),
  object: z.string().trim(),
  objectName: z.string().trim(),
  operation: z.string().trim(),
  operationName: z.string().trim(),
  rolesAccesses: z.array(roleAccessSchema),
  flag: z.enum(['LIMITED', 'FULL']).optional(),
}).strict().superRefine((op, ctx) => {
  if (op.flag && !/^VIEW_(LIMITED|FULL)_/.test(op.operation)) {
    ctx.addIssue({
      code: 'custom',
      path: ['flag'],
      message: 'flag допустим только для VIEW_LIMITED_* или VIEW_FULL_* операций',
    });
  }
  if (op.accessToAllOps && op.flag) {
    ctx.addIssue({
      code: 'custom',
      path: ['accessToAllOps'],
      message: 'Супер-операции (accessToAllOps=true) не должны иметь flag',
    });
  }
});

export const roleChangeAccessSchema = z.object({
  access: z.boolean(),
  roleId: z.number().int().positive(),
  operation: operationSchema /* z.object({
    object: z.string().trim(),
    operation: z.string().trim(),
    accessToAllOps: z.boolean().optional().default(false),
    flag: z.enum(['LIMITED', 'FULL']).optional(),
  }).strict() */,
}).strict();

export const roleAccessesSchema = z.object({
  object: z.string().trim(),
  ops: z.array(roleAccessSchema),
}).strict();

export const rolesListSchema = z.object({
  roles: z.array(roleSchema),
  operations: z.array(operationSchema),
}).strict();

export const rolesNamesListSchema = z.array(roleShortSchema);

export type Role = z.infer<typeof roleSchema>;
export type RoleAccess = z.infer<typeof roleAccessSchema>;
export type Operation = z.infer<typeof operationSchema>;
