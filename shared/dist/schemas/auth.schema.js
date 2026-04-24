import { z } from 'zod';
export const signInReqSchema = z.object({
    userName: z.string().trim().min(1).max(64),
    password: z.string().min(1).max(256),
});
export const userSchema = z.object({
    id: z.number().int(),
    userName: z.string().trim().min(1),
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    roleName: z.string().min(2),
    roleId: z.number().int(),
});
export const signInRespSchema = z.object({
    user: userSchema,
    token: z.string().min(10),
    expiresIn: z.number().int().positive(),
});
export const refreshRespSchema = z.object({
    accessToken: z.string().min(10),
    expiresIn: z.number().int().positive(),
});
export const permissionSchema = z
    .object({
    id: z.number().int().positive(),
    roleId: z.number().int().positive(),
    access: z.boolean(),
    disabled: z.boolean(),
    operation: z.string(),
})
    .strict();
export const permissionRespSchema = z.array(permissionSchema);
