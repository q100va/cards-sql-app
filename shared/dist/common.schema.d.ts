import { z } from 'zod';
export declare const toTrim: (v: unknown) => string;
export declare const emptyToNull: (v: unknown) => string | null;
export declare const toLowerTrim: (v: unknown) => string;
export declare const keepE164Chars: (v: unknown) => {};
export declare const keepE164CharsNullable: (v: unknown) => unknown;
export declare const nonEmpty: z.ZodString;
export declare const nonEmptyTrim: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
export declare const nonEmptyTrimMax: (max: number, msgMax: string) => z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
export declare const positiveInt: z.ZodNumber;
export declare const nullableInt: z.ZodNullable<z.ZodNumber>;
export declare const nullableIsoDate: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
export declare const intOptArray: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
export declare const emailSchema: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodEmail>;
export declare const phoneNumberSchema: z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>;
export declare const telegramNicknameSchema: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
export declare const telegramIdSchema: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
export declare const vKontakteSchema: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
export declare const instagramSchema: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
export declare const facebookSchema: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
export declare const otherContactSchema: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
export declare const draftAddressSchema: z.ZodObject<{
    countryId: z.ZodNullable<z.ZodNumber>;
    regionId: z.ZodNullable<z.ZodNumber>;
    districtId: z.ZodNullable<z.ZodNumber>;
    localityId: z.ZodNullable<z.ZodNumber>;
}, z.core.$strict>;
export declare const addressRefFullSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
}, z.core.$strict>;
export declare const addressRefShortSchema: z.ZodObject<{
    id: z.ZodNumber;
    shortName: z.ZodString;
}, z.core.$strict>;
export declare const addressSchema: z.ZodObject<{
    country: z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, z.core.$strict>>;
    region: z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        shortName: z.ZodString;
    }, z.core.$strict>>;
    district: z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        shortName: z.ZodString;
    }, z.core.$strict>>;
    locality: z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        shortName: z.ZodString;
    }, z.core.$strict>>;
    id: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export declare const contactType: z.ZodEnum<{
    email: "email";
    phoneNumber: "phoneNumber";
    whatsApp: "whatsApp";
    telegram: "telegram";
    telegramNickname: "telegramNickname";
    telegramId: "telegramId";
    telegramPhoneNumber: "telegramPhoneNumber";
    vKontakte: "vKontakte";
    instagram: "instagram";
    facebook: "facebook";
    otherContact: "otherContact";
}>;
export declare const contactSchema: z.ZodObject<{
    id: z.ZodNumber;
    content: z.ZodString;
}, z.core.$strict>;
export declare const nonEmptyContacts: z.ZodArray<z.ZodObject<{
    id: z.ZodNumber;
    content: z.ZodString;
}, z.core.$strict>>;
export declare const optionalContactsSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>>;
    phoneNumber: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>>;
    whatsApp: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>>;
    telegram: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>>;
    telegramNickname: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>>;
    telegramId: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>>;
    telegramPhoneNumber: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>>;
    vKontakte: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>>;
    instagram: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>>;
    facebook: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>>;
    otherContact: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export declare const changingAddressSchema: z.ZodObject<{
    countryId: z.ZodNullable<z.ZodNumber>;
    regionId: z.ZodNullable<z.ZodNumber>;
    districtId: z.ZodNullable<z.ZodNumber>;
    localityId: z.ZodNullable<z.ZodNumber>;
}, z.core.$strict>;
export declare const changingContactsSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodEmail>>>;
    phoneNumber: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>>;
    whatsApp: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>>;
    telegramNickname: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
    telegramId: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
    telegramPhoneNumber: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>>;
    vKontakte: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
    instagram: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
    facebook: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
    otherContact: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
}, z.core.$strict>;
export declare const outdatedNameItemSchema: z.ZodObject<{
    firstName: z.ZodString;
    patronymic: z.ZodNullable<z.ZodString>;
    lastName: z.ZodString;
    id: z.ZodNumber;
}, z.core.$strict>;
export declare const outdatedAddressItemSchema: z.ZodObject<{
    country: z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, z.core.$strict>;
    region: z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        shortName: z.ZodString;
    }, z.core.$strict>>;
    district: z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        shortName: z.ZodString;
    }, z.core.$strict>>;
    locality: z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        shortName: z.ZodString;
    }, z.core.$strict>>;
    id: z.ZodNumber;
    isRecoverable: z.ZodBoolean;
}, z.core.$strict>;
export declare const outdatedCommonSchema: z.ZodObject<{
    contacts: z.ZodObject<{
        email: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
        phoneNumber: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
        whatsApp: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
        telegram: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
        telegramNickname: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
        telegramId: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
        telegramPhoneNumber: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
        vKontakte: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
        instagram: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
        facebook: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
        otherContact: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
    }, z.core.$strict>;
    addresses: z.ZodArray<z.ZodObject<{
        country: z.ZodObject<{
            id: z.ZodNumber;
            name: z.ZodString;
        }, z.core.$strict>;
        region: z.ZodNullable<z.ZodObject<{
            id: z.ZodNumber;
            shortName: z.ZodString;
        }, z.core.$strict>>;
        district: z.ZodNullable<z.ZodObject<{
            id: z.ZodNumber;
            shortName: z.ZodString;
        }, z.core.$strict>>;
        locality: z.ZodNullable<z.ZodObject<{
            id: z.ZodNumber;
            shortName: z.ZodString;
        }, z.core.$strict>>;
        id: z.ZodNumber;
        isRecoverable: z.ZodBoolean;
    }, z.core.$strict>>;
    names: z.ZodArray<z.ZodObject<{
        firstName: z.ZodString;
        patronymic: z.ZodNullable<z.ZodString>;
        lastName: z.ZodString;
        id: z.ZodNumber;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type Contact = z.infer<typeof contactSchema>;
export type OptionalContacts = z.infer<typeof optionalContactsSchema>;
export type Address = z.infer<typeof addressSchema>;
export type DraftAddress = z.infer<typeof draftAddressSchema>;
export type OutdatedAddress = z.infer<typeof outdatedAddressItemSchema>;
export type OutdatedFullName = z.infer<typeof outdatedNameItemSchema>;
export type OutdatedContacts = z.infer<typeof optionalContactsSchema>;
export type BaseOutdatedData = z.infer<typeof outdatedCommonSchema>;
