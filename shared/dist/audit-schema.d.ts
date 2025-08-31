import { z } from 'zod';
export declare const auditQuerySchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    entityId: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodEnum<{
        create: "create";
        update: "update";
        delete: "delete";
    }>>;
    from: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    to: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    offset: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const AuditActionSchema: z.ZodEnum<{
    create: "create";
    update: "update";
    delete: "delete";
}>;
export declare const AuditDiffCreateSchema: z.ZodObject<{
    after: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strict>;
export declare const AuditDiffDeleteSchema: z.ZodObject<{
    before: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strict>;
export declare const AuditDiffUpdateSchema: z.ZodObject<{
    changed: z.ZodRecord<z.ZodString, z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], null>>;
}, z.core.$strict>;
export declare const AuditDiffSchema: z.ZodUnion<readonly [z.ZodObject<{
    after: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strict>, z.ZodObject<{
    before: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strict>, z.ZodObject<{
    changed: z.ZodRecord<z.ZodString, z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], null>>;
}, z.core.$strict>]>;
export declare const AuditItemSchema: z.ZodObject<{
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    action: z.ZodEnum<{
        create: "create";
        update: "update";
        delete: "delete";
    }>;
    model: z.ZodString;
    entityId: z.ZodString;
    diff: z.ZodUnion<readonly [z.ZodObject<{
        after: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strict>, z.ZodObject<{
        before: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strict>, z.ZodObject<{
        changed: z.ZodRecord<z.ZodString, z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], null>>;
    }, z.core.$strict>]>;
    actorUserId: z.ZodNullable<z.ZodNumber>;
    correlationId: z.ZodNullable<z.ZodString>;
    ip: z.ZodNullable<z.ZodString>;
    userAgent: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, z.core.$strict>;
export declare const AuditPageSchema: z.ZodObject<{
    rows: z.ZodArray<z.ZodObject<{
        id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        action: z.ZodEnum<{
            create: "create";
            update: "update";
            delete: "delete";
        }>;
        model: z.ZodString;
        entityId: z.ZodString;
        diff: z.ZodUnion<readonly [z.ZodObject<{
            after: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, z.core.$strict>, z.ZodObject<{
            before: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, z.core.$strict>, z.ZodObject<{
            changed: z.ZodRecord<z.ZodString, z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], null>>;
        }, z.core.$strict>]>;
        actorUserId: z.ZodNullable<z.ZodNumber>;
        correlationId: z.ZodNullable<z.ZodString>;
        ip: z.ZodNullable<z.ZodString>;
        userAgent: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
    }, z.core.$strict>>;
    page: z.ZodObject<{
        limit: z.ZodNumber;
        offset: z.ZodNumber;
        count: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>;
}, z.core.$strict>;
export type AuditAction = z.infer<typeof AuditActionSchema>;
export type AuditDiff = z.infer<typeof AuditDiffSchema>;
export type AuditItem = z.infer<typeof AuditItemSchema>;
export type AuditPage = z.infer<typeof AuditPageSchema>;
