import { z } from 'zod';
export declare const roleSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    description: z.ZodString;
}, z.core.$strict>;
export declare const roleNameSchema: z.ZodObject<{
    name: z.ZodString;
}, z.core.$strict>;
export declare const roleIdSchema: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
}, z.core.$strict>;
export declare const roleShortSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
}, z.core.$strict>;
export declare const roleDraftSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
}, z.core.$strict>;
export declare const roleAccessSchema: z.ZodObject<{
    id: z.ZodNumber;
    roleId: z.ZodNumber;
    access: z.ZodBoolean;
    disabled: z.ZodBoolean;
}, z.core.$strict>;
export declare const operationSchema: z.ZodObject<{
    description: z.ZodString;
    accessToAllOps: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    object: z.ZodString;
    objectName: z.ZodString;
    operation: z.ZodString;
    operationName: z.ZodString;
    rolesAccesses: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        roleId: z.ZodNumber;
        access: z.ZodBoolean;
        disabled: z.ZodBoolean;
    }, z.core.$strict>>;
    flag: z.ZodOptional<z.ZodEnum<{
        LIMITED: "LIMITED";
        FULL: "FULL";
    }>>;
}, z.core.$strict>;
export declare const roleChangeAccessSchema: z.ZodObject<{
    access: z.ZodBoolean;
    roleId: z.ZodNumber;
    operation: z.ZodObject<{
        description: z.ZodString;
        accessToAllOps: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        object: z.ZodString;
        objectName: z.ZodString;
        operation: z.ZodString;
        operationName: z.ZodString;
        rolesAccesses: z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            roleId: z.ZodNumber;
            access: z.ZodBoolean;
            disabled: z.ZodBoolean;
        }, z.core.$strict>>;
        flag: z.ZodOptional<z.ZodEnum<{
            LIMITED: "LIMITED";
            FULL: "FULL";
        }>>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const roleAccessesSchema: z.ZodObject<{
    object: z.ZodString;
    ops: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        roleId: z.ZodNumber;
        access: z.ZodBoolean;
        disabled: z.ZodBoolean;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const rolesListSchema: z.ZodObject<{
    roles: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        description: z.ZodString;
    }, z.core.$strict>>;
    operations: z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        accessToAllOps: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        object: z.ZodString;
        objectName: z.ZodString;
        operation: z.ZodString;
        operationName: z.ZodString;
        rolesAccesses: z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            roleId: z.ZodNumber;
            access: z.ZodBoolean;
            disabled: z.ZodBoolean;
        }, z.core.$strict>>;
        flag: z.ZodOptional<z.ZodEnum<{
            LIMITED: "LIMITED";
            FULL: "FULL";
        }>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const rolesNamesListSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
}, z.core.$strict>>;
export type Role = z.infer<typeof roleSchema>;
export type RoleAccess = z.infer<typeof roleAccessSchema>;
export type Operation = z.infer<typeof operationSchema>;
