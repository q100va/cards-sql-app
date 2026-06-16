import { z } from 'zod';
export declare const orderDraftSchema: z.ZodObject<{
    occasionId: z.ZodNumber;
    volunteerId: z.ZodNumber;
    userId: z.ZodNumber;
    instituteId: z.ZodNullable<z.ZodNumber>;
    status: z.ZodNumber;
    source: z.ZodNumber;
    contactSnapshot: z.ZodString;
    amount: z.ZodNumber;
    comment: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export declare const orderFilterSchema: z.ZodObject<{
    addressCategory: z.ZodNumber;
    gender: z.ZodNumber;
    maleAmount: z.ZodNullable<z.ZodNumber>;
    femaleAmount: z.ZodNullable<z.ZodNumber>;
    onlyWithPicture: z.ZodBoolean;
    onlyAnniversaries: z.ZodBoolean;
    onlyAnniversariesAndOldest: z.ZodBoolean;
    onlyWithConcents: z.ZodBoolean;
    year1: z.ZodNullable<z.ZodNumber>;
    year2: z.ZodNullable<z.ZodNumber>;
    date1: z.ZodNullable<z.ZodNumber>;
    date2: z.ZodNullable<z.ZodNumber>;
    regions: z.ZodArray<z.ZodNumber>;
    homes: z.ZodArray<z.ZodNumber>;
    addSpareRegions: z.ZodBoolean;
    minFromOneHouse: z.ZodNullable<z.ZodNumber>;
    maxFromOneHouse: z.ZodNullable<z.ZodNumber>;
    maxNoAddress: z.ZodNullable<z.ZodNumber>;
}, z.core.$strict>;
export declare const orderFiltersDataSchema: z.ZodObject<{
    regions: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, z.core.$strip>>;
    homes: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        regionId: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strict>;
export type OrderFiltersData = z.infer<typeof orderFiltersDataSchema>;
