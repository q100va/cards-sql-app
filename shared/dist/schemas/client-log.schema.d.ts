import { z } from 'zod';
export declare const clientLogItemSchema: z.ZodObject<{
    ts: z.ZodISODateTime;
    level: z.ZodEnum<{
        error: "error";
        warn: "warn";
    }>;
    message: z.ZodString;
    stack: z.ZodOptional<z.ZodString>;
    pageUrl: z.ZodOptional<z.ZodString>;
    route: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
    sessionId: z.ZodString;
    corrId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    userAgent: z.ZodOptional<z.ZodString>;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
export declare const clientLogBatchSchema: z.ZodObject<{
    app: z.ZodString;
    env: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        ts: z.ZodISODateTime;
        level: z.ZodEnum<{
            error: "error";
            warn: "warn";
        }>;
        message: z.ZodString;
        stack: z.ZodOptional<z.ZodString>;
        pageUrl: z.ZodOptional<z.ZodString>;
        route: z.ZodOptional<z.ZodString>;
        userId: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
        sessionId: z.ZodString;
        corrId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        userAgent: z.ZodOptional<z.ZodString>;
        context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ClientLogBatch = z.infer<typeof clientLogBatchSchema>;
