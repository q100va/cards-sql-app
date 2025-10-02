import { z } from 'zod';
declare const toponymTypeSchema: z.ZodEnum<{
    country: "country";
    region: "region";
    district: "district";
    locality: "locality";
}>;
export declare const checkToponymNameSchema: z.ZodObject<{
    type: z.ZodEnum<{
        country: "country";
        region: "region";
        district: "district";
        locality: "locality";
    }>;
    name: z.ZodString;
    id: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    countryId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    regionId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    districtId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strict>;
export declare const saveToponymSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    type: z.ZodEnum<{
        country: "country";
        region: "region";
        district: "district";
        locality: "locality";
    }>;
    name: z.ZodString;
    shortName: z.ZodOptional<z.ZodString>;
    postName: z.ZodOptional<z.ZodString>;
    shortPostName: z.ZodOptional<z.ZodString>;
    isFederalCity: z.ZodOptional<z.ZodBoolean>;
    isCapitalOfRegion: z.ZodOptional<z.ZodBoolean>;
    isCapitalOfDistrict: z.ZodOptional<z.ZodBoolean>;
    countryId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    regionId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    districtId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strict>;
export declare const DefaultAddressParamsSchema: z.ZodObject<{
    localityId: z.ZodNullable<z.ZodNumber>;
    districtId: z.ZodNullable<z.ZodNumber>;
    regionId: z.ZodNullable<z.ZodNumber>;
    countryId: z.ZodNullable<z.ZodNumber>;
}, z.core.$strict>;
export declare const toponymSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    defaultAddressParams: z.ZodOptional<z.ZodObject<{
        localityId: z.ZodNullable<z.ZodNumber>;
        districtId: z.ZodNullable<z.ZodNumber>;
        regionId: z.ZodNullable<z.ZodNumber>;
        countryId: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strict>>;
    shortName: z.ZodOptional<z.ZodString>;
    postName: z.ZodOptional<z.ZodString>;
    shortPostName: z.ZodOptional<z.ZodString>;
    isFederalCity: z.ZodOptional<z.ZodBoolean>;
    isCapitalOfRegion: z.ZodOptional<z.ZodBoolean>;
    isCapitalOfDistrict: z.ZodOptional<z.ZodBoolean>;
    countryName: z.ZodOptional<z.ZodString>;
    regionName: z.ZodOptional<z.ZodString>;
    districtName: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const findToponymByIdSchema: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
    type: z.ZodEnum<{
        country: "country";
        region: "region";
        district: "district";
        locality: "locality";
    }>;
}, z.core.$strict>;
export declare const getToponymsListSchema: z.ZodObject<{
    ids: z.ZodPipe<z.ZodTransform<any[], unknown>, z.ZodArray<z.ZodCoercedNumber<unknown>>>;
    typeOfToponym: z.ZodEnum<{
        countries: "countries";
        regions: "regions";
        districts: "districts";
        localities: "localities";
    }>;
}, z.core.$strict>;
export declare const toponymNamesListSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
    name: z.ZodString;
    countryId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    regionId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    districtId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strict>>;
export declare const toponymsSchema: z.ZodObject<{
    toponyms: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        defaultAddressParams: z.ZodOptional<z.ZodObject<{
            localityId: z.ZodNullable<z.ZodNumber>;
            districtId: z.ZodNullable<z.ZodNumber>;
            regionId: z.ZodNullable<z.ZodNumber>;
            countryId: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strict>>;
        shortName: z.ZodOptional<z.ZodString>;
        postName: z.ZodOptional<z.ZodString>;
        shortPostName: z.ZodOptional<z.ZodString>;
        isFederalCity: z.ZodOptional<z.ZodBoolean>;
        isCapitalOfRegion: z.ZodOptional<z.ZodBoolean>;
        isCapitalOfDistrict: z.ZodOptional<z.ZodBoolean>;
        countryName: z.ZodOptional<z.ZodString>;
        regionName: z.ZodOptional<z.ZodString>;
        districtName: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    length: z.ZodCoercedNumber<unknown>;
}, z.core.$strict>;
export declare const getToponymsSchema: z.ZodObject<{
    type: z.ZodEnum<{
        country: "country";
        region: "region";
        district: "district";
        locality: "locality";
    }>;
    search: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    exact: z.ZodDefault<z.ZodOptional<z.ZodPipe<z.ZodTransform<boolean, unknown>, z.ZodBoolean>>>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        country: "country";
        region: "region";
        district: "district";
        name: "name";
        postName: "postName";
    }>>>;
    sortDir: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    pageSize: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    countries: z.ZodDefault<z.ZodOptional<z.ZodPipe<z.ZodTransform<any[], unknown>, z.ZodArray<z.ZodCoercedNumber<unknown>>>>>;
    regions: z.ZodDefault<z.ZodOptional<z.ZodPipe<z.ZodTransform<any[], unknown>, z.ZodArray<z.ZodCoercedNumber<unknown>>>>>;
    districts: z.ZodDefault<z.ZodOptional<z.ZodPipe<z.ZodTransform<any[], unknown>, z.ZodArray<z.ZodCoercedNumber<unknown>>>>>;
    localities: z.ZodDefault<z.ZodOptional<z.ZodPipe<z.ZodTransform<any[], unknown>, z.ZodArray<z.ZodCoercedNumber<unknown>>>>>;
}, z.core.$strip>;
export declare const deleteToponymSchema: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
    type: z.ZodEnum<{
        country: "country";
        region: "region";
        district: "district";
        locality: "locality";
    }>;
    destroy: z.ZodDefault<z.ZodOptional<z.ZodPipe<z.ZodTransform<boolean, unknown>, z.ZodBoolean>>>;
}, z.core.$strict>;
export declare const bulkToponymsSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"country">;
    data: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"region">;
    data: z.ZodArray<z.ZodObject<{
        country: z.ZodString;
        name: z.ZodString;
        shortName: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"district">;
    data: z.ZodArray<z.ZodObject<{
        region: z.ZodString;
        name: z.ZodString;
        postName: z.ZodString;
        postNameType: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"locality">;
    data: z.ZodArray<z.ZodObject<{
        region: z.ZodString;
        district: z.ZodString;
        name: z.ZodString;
        type: z.ZodString;
        isCapitalOfDistrict: z.ZodBoolean;
        isCapitalOfRegion: z.ZodBoolean;
        isFederalCity: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>], "type">;
export type SaveToponym = z.infer<typeof saveToponymSchema>;
export type ToponymNamesList = z.infer<typeof toponymNamesListSchema>;
export type ToponymType = z.infer<typeof toponymTypeSchema>;
export type Toponym = z.infer<typeof toponymSchema>;
export type DefaultAddressParams = z.infer<typeof DefaultAddressParamsSchema>;
export {};
