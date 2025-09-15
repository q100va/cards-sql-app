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
}, z.core.$strip>;
export declare const signInRespSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodNumber;
        userName: z.ZodString;
        firstName: z.ZodString;
        lastName: z.ZodString;
        roleName: z.ZodString;
    }, z.core.$strip>;
    token: z.ZodString;
    expiresIn: z.ZodNumber;
}, z.core.$strip>;
export declare const refreshRespSchema: z.ZodObject<{
    accessToken: z.ZodString;
    expiresIn: z.ZodNumber;
}, z.core.$strip>;
export type SignInReq = z.infer<typeof signInReqSchema>;
export type SignInResp = z.infer<typeof signInRespSchema>;
export type RefreshResp = z.infer<typeof refreshRespSchema>;
export type AuthUser = z.infer<typeof userSchema>;
