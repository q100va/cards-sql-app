import { z } from 'zod';
export const roleSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().trim().min(2).max(50),
    description: z.string().trim().min(2).max(500),
});
export const roleNameSchema = z.object({
    name: z.string().trim().min(2).max(50)
});
export const roleIdSchema = z.object({
    id: z
        .string()
        .regex(/^\d+$/, 'id must be a string representing a number')
        .transform((val) => Number(val)),
});
export const roleShortSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().trim().min(2).max(50),
});
export const roleDraftSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Имя должно содержать минимум 2 символа')
        .max(50, 'Имя не должно быть длиннее 50 символов'),
    description: z
        .string()
        .trim()
        .min(2, 'Описание должно содержать минимум 2 символа')
        .max(500, 'Описание должно быть длиннее 500 символов'),
});
export const roleAccessSchema = z.object({
    id: z.number().int().positive(),
    roleId: z.number().int().positive(),
    access: z.boolean(),
    disabled: z.boolean(),
});
export const roleChangeAccessSchema = z.object({
    access: z.boolean(),
    roleId: z.number().int().positive(),
    operation: z.object({
        fullAccess: z.boolean(),
        object: z.string().trim(),
        operation: z.string().trim(),
        flag: z.enum(['LIMITED', 'FULL']).optional(),
    }),
});
export const operationSchema = z.object({
    description: z.string().trim(),
    fullAccess: z.boolean(),
    object: z.string().trim(),
    objectName: z.string().trim(),
    operation: z.string().trim(),
    operationName: z.string().trim(),
    rolesAccesses: z.array(roleAccessSchema),
    flag: z.enum(['LIMITED', 'FULL']).optional(),
});
export const roleAccessesSchema = z.object({
    object: z.string().trim(),
    ops: z.array(roleAccessSchema),
});
export const rolesListSchema = z.object({
    roles: z.array(roleSchema),
    operations: z.array(operationSchema),
});
export const rolesNamesListSchema = z.array(roleShortSchema);
