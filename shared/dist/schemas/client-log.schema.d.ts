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
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strict>;
export declare const clientLogBatchSchema: z.ZodObject<{
    app: z.ZodLiteral<"cards-sql-app">;
    env: z.ZodEnum<{
        development: "development";
        production: "production";
    }>;
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
        context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type ClientLogBatch = z.infer<typeof clientLogBatchSchema>;
