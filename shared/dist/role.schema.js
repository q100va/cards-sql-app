import { z } from 'zod';
export const roleSchema = z
    .object({
    id: z.number().int().positive(),
    name: z.string().trim().min(2).max(50),
    description: z.string().trim().min(2).max(500),
})
    .strict();
export const roleNameSchema = z
    .object({
    name: z.string().trim().min(2).max(50),
})
    .strict();
export const roleIdSchema = z
    .object({
    id: z.coerce.number().int().positive(),
})
    .strict();
export const roleShortSchema = z
    .object({
    id: z.number().int().positive(),
    name: z.string().trim().min(2).max(50),
})
    .strict();
export const roleDraftSchema = z
    .object({
    name: z
        .string()
        .trim()
        .min(1, { message: 'FORM_VALIDATION.REQUIRED' })
        .min(2, { message: 'FORM_VALIDATION.ROLE.NAME_MIN' })
        .max(50, { message: 'FORM_VALIDATION.ROLE.NAME_MAX' }),
    description: z
        .string({})
        .trim()
        .min(1, { message: 'FORM_VALIDATION.REQUIRED' })
        .min(2, { message: 'FORM_VALIDATION.ROLE.DESCRIPTION_MIN' })
        .max(500, { message: 'FORM_VALIDATION.ROLE.DESCRIPTION_MAX' }),
})
    .strict();
export const roleAccessSchema = z
    .object({
    id: z.number().int().positive(),
    roleId: z.number().int().positive(),
    access: z.boolean(),
    disabled: z.boolean(),
})
    .strict();
export const operationSchema = z
    .object({
    description: z.string().trim(),
    accessToAllOps: z.boolean().optional().default(false),
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
    roleId: z.number().int().positive(),
    operation: operationSchema,
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
export const rolesNamesListSchema = z.array(roleShortSchema);
