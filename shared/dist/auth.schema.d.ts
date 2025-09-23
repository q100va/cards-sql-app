import { z } from 'zod';
export declare const signInReqSchema: z.ZodObject<{
    userName: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const userSchema: z.ZodObject<{
    id: z.ZodNumber;
    userName: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    roleName: z.ZodString;
    roleId: z.ZodNumber;
}, z.core.$strip>;
export declare const signInRespSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodNumber;
        userName: z.ZodString;
        firstName: z.ZodString;
        lastName: z.ZodString;
        roleName: z.ZodString;
        roleId: z.ZodNumber;
    }, z.core.$strip>;
    token: z.ZodString;
    expiresIn: z.ZodNumber;
}, z.core.$strip>;
export declare const refreshRespSchema: z.ZodObject<{
    accessToken: z.ZodString;
    expiresIn: z.ZodNumber;
}, z.core.$strip>;
export declare const permissionSchema: z.ZodObject<{
    id: z.ZodNumber;
    roleId: z.ZodNumber;
    access: z.ZodBoolean;
    disabled: z.ZodBoolean;
    operation: z.ZodString;
}, z.core.$strict>;
export declare const permissionRespSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodNumber;
    roleId: z.ZodNumber;
    access: z.ZodBoolean;
    disabled: z.ZodBoolean;
    operation: z.ZodString;
}, z.core.$strict>>;
export type SignInReq = z.infer<typeof signInReqSchema>;
export type SignInResp = z.infer<typeof signInRespSchema>;
export type RefreshResp = z.infer<typeof refreshRespSchema>;
export type AuthUser = z.infer<typeof userSchema>;
export type Permission = z.infer<typeof permissionSchema>;
