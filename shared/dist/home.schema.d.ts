import { z } from 'zod';
declare const cooperationItemSchema: z.ZodObject<{
    partnerContacts: z.ZodString;
    partnerName: z.ZodString;
    homeName: z.ZodString;
    regionName: z.ZodString;
    partnerId: z.ZodNumber;
    isRecoverable: z.ZodBoolean;
    id: z.ZodNumber;
}, z.core.$strict>;
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
    website: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>>;
    otherContact: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export declare const emailControlSchema: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodEmail>>;
export declare const phoneNumberControlSchema: z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodNullable<z.ZodString>>;
export declare const telegramIdControlSchema: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
export declare const whatsAppControlSchema: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNullable<z.ZodString>>;
export declare const telegramNicknameControlSchema: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
export declare const vKontakteControlSchema: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
export declare const instagramControlSchema: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
export declare const facebookControlSchema: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
export declare const websiteControlSchema: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
export declare const otherContactControlSchema: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
export declare const draftContactsSchema: z.ZodObject<{
    email: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodEmail>>;
    phoneNumber: z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>;
    whatsApp: z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>;
    telegramNickname: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    telegramId: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    telegramPhoneNumber: z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>;
    vKontakte: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    instagram: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    facebook: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    website: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    otherContact: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
}, z.core.$strict>;
export declare const checkHomeNameSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    homeName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
}, z.core.$strict>;
export declare const homeIdSchema: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
}, z.core.$strict>;
export declare const draftAddressSchema: z.ZodObject<{
    countryId: z.ZodNumber;
    regionId: z.ZodNumber;
    districtId: z.ZodNumber;
    localityId: z.ZodNumber;
}, z.core.$strict>;
export declare const homeDraftSchema: z.ZodObject<{
    id: z.ZodNullable<z.ZodNumber>;
    homeName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    officialName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    postalName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    noAddress: z.ZodBoolean;
    specialHome: z.ZodBoolean;
    acceptableForSchool: z.ZodBoolean;
    postalCode: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    draftAddress: z.ZodObject<{
        countryId: z.ZodNumber;
        regionId: z.ZodNumber;
        districtId: z.ZodNumber;
        localityId: z.ZodNumber;
    }, z.core.$strict>;
    postalAddressPart: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    infoNote: z.ZodNullable<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    isRestricted: z.ZodBoolean;
    causeOfRestriction: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    dateOfRestriction: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    draftContacts: z.ZodObject<{
        email: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodEmail>>;
        phoneNumber: z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>;
        whatsApp: z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>;
        telegramNickname: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        telegramId: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        telegramPhoneNumber: z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>;
        vKontakte: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        instagram: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        facebook: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        website: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        otherContact: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    }, z.core.$strict>;
    draftCoordinations: z.ZodArray<z.ZodNumber>;
}, z.core.$strict>;
export declare const changingAddressSchema: z.ZodObject<{
    postalCode: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    countryId: z.ZodNumber;
    regionId: z.ZodNumber;
    districtId: z.ZodNumber;
    localityId: z.ZodNumber;
    postalAddressPart: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
}, z.core.$strict>;
export declare const changingMainSchema: z.ZodObject<{
    homeName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    officialName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    postalName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    noAddress: z.ZodOptional<z.ZodBoolean>;
    specialHome: z.ZodOptional<z.ZodBoolean>;
    acceptableForSchool: z.ZodOptional<z.ZodBoolean>;
    comment: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    infoNote: z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
    isRestricted: z.ZodOptional<z.ZodBoolean>;
    causeOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    dateOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>>;
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
    website: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
    otherContact: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
}, z.core.$strict>;
export declare const changingDataSchema: z.ZodObject<{
    main: z.ZodNullable<z.ZodObject<{
        homeName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        officialName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        postalName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        noAddress: z.ZodOptional<z.ZodBoolean>;
        specialHome: z.ZodOptional<z.ZodBoolean>;
        acceptableForSchool: z.ZodOptional<z.ZodBoolean>;
        comment: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        infoNote: z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
        isRestricted: z.ZodOptional<z.ZodBoolean>;
        causeOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        dateOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>>;
    }, z.core.$strict>>;
    address: z.ZodNullable<z.ZodObject<{
        postalCode: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
        countryId: z.ZodNumber;
        regionId: z.ZodNumber;
        districtId: z.ZodNumber;
        localityId: z.ZodNumber;
        postalAddressPart: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>>;
    contacts: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodEmail>>>;
        phoneNumber: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>>;
        whatsApp: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>>;
        telegramNickname: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
        telegramId: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
        telegramPhoneNumber: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>>;
        vKontakte: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
        instagram: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
        facebook: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
        website: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
        otherContact: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
    }, z.core.$strict>>;
    coordinations: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
}, z.core.$strict>;
export declare const outdatingDataSchema: z.ZodObject<{
    address: z.ZodNullable<z.ZodNumber>;
    officialNames: z.ZodNullable<z.ZodObject<{
        officialName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    }, z.core.$strict>>;
    contacts: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    coordinations: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
}, z.core.$strict>;
export declare const deletingDataSchema: z.ZodObject<{
    officialNames: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    addresses: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    contacts: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    coordinations: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
}, z.core.$strict>;
export declare const restoringDataSchema: z.ZodObject<{
    addresses: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    officialNames: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    contacts: z.ZodNullable<z.ZodObject<{
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
        website: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
        otherContact: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
    }, z.core.$strict>>;
    coordinations: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
}, z.core.$strict>;
export declare const updateHomeDataSchema: z.ZodObject<{
    id: z.ZodNumber;
    changingData: z.ZodObject<{
        main: z.ZodNullable<z.ZodObject<{
            homeName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
            officialName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
            postalName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
            noAddress: z.ZodOptional<z.ZodBoolean>;
            specialHome: z.ZodOptional<z.ZodBoolean>;
            acceptableForSchool: z.ZodOptional<z.ZodBoolean>;
            comment: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            infoNote: z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
            isRestricted: z.ZodOptional<z.ZodBoolean>;
            causeOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            dateOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>>;
        }, z.core.$strict>>;
        address: z.ZodNullable<z.ZodObject<{
            postalCode: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
            countryId: z.ZodNumber;
            regionId: z.ZodNumber;
            districtId: z.ZodNumber;
            localityId: z.ZodNumber;
            postalAddressPart: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strict>>;
        contacts: z.ZodNullable<z.ZodObject<{
            email: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodEmail>>>;
            phoneNumber: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>>;
            whatsApp: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>>;
            telegramNickname: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
            telegramId: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
            telegramPhoneNumber: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>>;
            vKontakte: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
            instagram: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
            facebook: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
            website: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
            otherContact: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
        }, z.core.$strict>>;
        coordinations: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    }, z.core.$strict>;
    restoringData: z.ZodObject<{
        addresses: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
        officialNames: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
        contacts: z.ZodNullable<z.ZodObject<{
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
            website: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodNumber;
                content: z.ZodString;
            }, z.core.$strict>>>;
            otherContact: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodNumber;
                content: z.ZodString;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
        coordinations: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    }, z.core.$strict>;
    outdatingData: z.ZodObject<{
        address: z.ZodNullable<z.ZodNumber>;
        officialNames: z.ZodNullable<z.ZodObject<{
            officialName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
        }, z.core.$strict>>;
        contacts: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
        coordinations: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    }, z.core.$strict>;
    deletingData: z.ZodObject<{
        officialNames: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
        addresses: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
        contacts: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
        coordinations: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const homesQueryDTOSchema: z.ZodObject<{
    page: z.ZodObject<{
        size: z.ZodNumber;
        number: z.ZodNumber;
    }, z.core.$strip>;
    sort: z.ZodOptional<z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        direction: z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>;
    }, z.core.$strip>>>;
    search: z.ZodOptional<z.ZodObject<{
        value: z.ZodString;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    view: z.ZodOptional<z.ZodObject<{
        option: z.ZodOptional<z.ZodString>;
        includeOutdated: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    filters: z.ZodOptional<z.ZodObject<{
        general: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            noAddress: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            specialHome: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            acceptableForSchool: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            comment: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            infoNote: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            dateBeginningRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodCoercedDate<unknown>, z.ZodCoercedDate<unknown>], null>>>;
            dateRestrictionRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodCoercedDate<unknown>, z.ZodCoercedDate<unknown>], null>>>;
            dateUpdateRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodCoercedDate<unknown>, z.ZodCoercedDate<unknown>], null>>>;
            contactTypes: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodEnum<{
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
                website: "website";
                otherContact: "otherContact";
            }>>>>;
        }, z.core.$strip>>>;
        address: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            countries: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodNumber>>>;
            regions: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodNumber>>>;
            districts: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodNumber>>>;
            localities: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodNumber>>>;
        }, z.core.$strip>>>;
        mode: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            strictAddress: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            strictContact: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strict>;
export declare const outdatedNameItemSchema: z.ZodObject<{
    officialName: z.ZodString;
    id: z.ZodNumber;
}, z.core.$strict>;
export declare const outdatedAddressItemSchema: z.ZodObject<{
    postalCode: z.ZodString;
    country: z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, z.core.$strict>;
    region: z.ZodObject<{
        id: z.ZodNumber;
        shortName: z.ZodString;
    }, z.core.$strict>;
    district: z.ZodObject<{
        id: z.ZodNumber;
        shortName: z.ZodString;
    }, z.core.$strict>;
    locality: z.ZodObject<{
        id: z.ZodNumber;
        shortName: z.ZodString;
    }, z.core.$strict>;
    postalAddressPart: z.ZodNullable<z.ZodString>;
    fullPostalAddress: z.ZodString;
    id: z.ZodNumber;
    isRecoverable: z.ZodBoolean;
}, z.core.$strict>;
export declare const outdatedDataSchema: z.ZodObject<{
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
        website: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
        otherContact: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
    }, z.core.$strict>;
    addresses: z.ZodArray<z.ZodObject<{
        postalCode: z.ZodString;
        country: z.ZodObject<{
            id: z.ZodNumber;
            name: z.ZodString;
        }, z.core.$strict>;
        region: z.ZodObject<{
            id: z.ZodNumber;
            shortName: z.ZodString;
        }, z.core.$strict>;
        district: z.ZodObject<{
            id: z.ZodNumber;
            shortName: z.ZodString;
        }, z.core.$strict>;
        locality: z.ZodObject<{
            id: z.ZodNumber;
            shortName: z.ZodString;
        }, z.core.$strict>;
        postalAddressPart: z.ZodNullable<z.ZodString>;
        fullPostalAddress: z.ZodString;
        id: z.ZodNumber;
        isRecoverable: z.ZodBoolean;
    }, z.core.$strict>>;
    officialNames: z.ZodArray<z.ZodObject<{
        officialName: z.ZodString;
        id: z.ZodNumber;
    }, z.core.$strict>>;
    coordinations: z.ZodArray<z.ZodObject<{
        partnerContacts: z.ZodString;
        partnerName: z.ZodString;
        homeName: z.ZodString;
        regionName: z.ZodString;
        partnerId: z.ZodNumber;
        isRecoverable: z.ZodBoolean;
        id: z.ZodNumber;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const nonNullableAddressSchema: z.ZodObject<{
    country: z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, z.core.$strict>;
    region: z.ZodObject<{
        id: z.ZodNumber;
        shortName: z.ZodString;
    }, z.core.$strict>;
    district: z.ZodObject<{
        id: z.ZodNumber;
        shortName: z.ZodString;
    }, z.core.$strict>;
    locality: z.ZodObject<{
        id: z.ZodNumber;
        shortName: z.ZodString;
    }, z.core.$strict>;
    id: z.ZodNumber;
}, z.core.$strict>;
export declare const postalAddressSchema: z.ZodObject<{
    postalCode: z.ZodString;
    postalAddressPart: z.ZodNullable<z.ZodString>;
    fullPostalAddress: z.ZodString;
    id: z.ZodNumber;
}, z.core.$strict>;
export declare const homeSchema: z.ZodObject<{
    id: z.ZodNumber;
    homeName: z.ZodString;
    officialName: z.ZodString;
    postalName: z.ZodString;
    noAddress: z.ZodBoolean;
    specialHome: z.ZodBoolean;
    acceptableForSchool: z.ZodBoolean;
    isRestricted: z.ZodBoolean;
    dateOfStart: z.ZodCoercedDate<unknown>;
    causeOfRestriction: z.ZodNullable<z.ZodString>;
    dateOfRestriction: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    address: z.ZodObject<{
        country: z.ZodObject<{
            id: z.ZodNumber;
            name: z.ZodString;
        }, z.core.$strict>;
        region: z.ZodObject<{
            id: z.ZodNumber;
            shortName: z.ZodString;
        }, z.core.$strict>;
        district: z.ZodObject<{
            id: z.ZodNumber;
            shortName: z.ZodString;
        }, z.core.$strict>;
        locality: z.ZodObject<{
            id: z.ZodNumber;
            shortName: z.ZodString;
        }, z.core.$strict>;
        id: z.ZodNumber;
    }, z.core.$strict>;
    postalAddress: z.ZodObject<{
        postalCode: z.ZodString;
        postalAddressPart: z.ZodNullable<z.ZodString>;
        fullPostalAddress: z.ZodString;
        id: z.ZodNumber;
    }, z.core.$strict>;
    comment: z.ZodNullable<z.ZodString>;
    infoNote: z.ZodNullable<z.ZodString>;
    orderedContacts: z.ZodObject<{
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
        website: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
        otherContact: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
    }, z.core.$strict>;
    outdatedData: z.ZodObject<{
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
            website: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodNumber;
                content: z.ZodString;
            }, z.core.$strict>>>;
            otherContact: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodNumber;
                content: z.ZodString;
            }, z.core.$strict>>>;
        }, z.core.$strict>;
        addresses: z.ZodArray<z.ZodObject<{
            postalCode: z.ZodString;
            country: z.ZodObject<{
                id: z.ZodNumber;
                name: z.ZodString;
            }, z.core.$strict>;
            region: z.ZodObject<{
                id: z.ZodNumber;
                shortName: z.ZodString;
            }, z.core.$strict>;
            district: z.ZodObject<{
                id: z.ZodNumber;
                shortName: z.ZodString;
            }, z.core.$strict>;
            locality: z.ZodObject<{
                id: z.ZodNumber;
                shortName: z.ZodString;
            }, z.core.$strict>;
            postalAddressPart: z.ZodNullable<z.ZodString>;
            fullPostalAddress: z.ZodString;
            id: z.ZodNumber;
            isRecoverable: z.ZodBoolean;
        }, z.core.$strict>>;
        officialNames: z.ZodArray<z.ZodObject<{
            officialName: z.ZodString;
            id: z.ZodNumber;
        }, z.core.$strict>>;
        coordinations: z.ZodArray<z.ZodObject<{
            partnerContacts: z.ZodString;
            partnerName: z.ZodString;
            homeName: z.ZodString;
            regionName: z.ZodString;
            partnerId: z.ZodNumber;
            isRecoverable: z.ZodBoolean;
            id: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    coordinations: z.ZodArray<z.ZodObject<{
        partnerContacts: z.ZodString;
        partnerName: z.ZodString;
        homeName: z.ZodString;
        regionName: z.ZodString;
        partnerId: z.ZodNumber;
        isRecoverable: z.ZodBoolean;
        id: z.ZodNumber;
    }, z.core.$strict>>;
    dateOfLastUpdate: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    status: z.ZodEnum<{
        OPEN: "OPEN";
        CLOSE: "CLOSE";
    }>;
    dateOfClose: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
}, z.core.$strict>;
export declare const homesSchema: z.ZodObject<{
    list: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        homeName: z.ZodString;
        officialName: z.ZodString;
        postalName: z.ZodString;
        noAddress: z.ZodBoolean;
        specialHome: z.ZodBoolean;
        acceptableForSchool: z.ZodBoolean;
        isRestricted: z.ZodBoolean;
        dateOfStart: z.ZodCoercedDate<unknown>;
        causeOfRestriction: z.ZodNullable<z.ZodString>;
        dateOfRestriction: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
        address: z.ZodObject<{
            country: z.ZodObject<{
                id: z.ZodNumber;
                name: z.ZodString;
            }, z.core.$strict>;
            region: z.ZodObject<{
                id: z.ZodNumber;
                shortName: z.ZodString;
            }, z.core.$strict>;
            district: z.ZodObject<{
                id: z.ZodNumber;
                shortName: z.ZodString;
            }, z.core.$strict>;
            locality: z.ZodObject<{
                id: z.ZodNumber;
                shortName: z.ZodString;
            }, z.core.$strict>;
            id: z.ZodNumber;
        }, z.core.$strict>;
        postalAddress: z.ZodObject<{
            postalCode: z.ZodString;
            postalAddressPart: z.ZodNullable<z.ZodString>;
            fullPostalAddress: z.ZodString;
            id: z.ZodNumber;
        }, z.core.$strict>;
        comment: z.ZodNullable<z.ZodString>;
        infoNote: z.ZodNullable<z.ZodString>;
        orderedContacts: z.ZodObject<{
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
            website: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodNumber;
                content: z.ZodString;
            }, z.core.$strict>>>;
            otherContact: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodNumber;
                content: z.ZodString;
            }, z.core.$strict>>>;
        }, z.core.$strict>;
        outdatedData: z.ZodObject<{
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
                website: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodNumber;
                    content: z.ZodString;
                }, z.core.$strict>>>;
                otherContact: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodNumber;
                    content: z.ZodString;
                }, z.core.$strict>>>;
            }, z.core.$strict>;
            addresses: z.ZodArray<z.ZodObject<{
                postalCode: z.ZodString;
                country: z.ZodObject<{
                    id: z.ZodNumber;
                    name: z.ZodString;
                }, z.core.$strict>;
                region: z.ZodObject<{
                    id: z.ZodNumber;
                    shortName: z.ZodString;
                }, z.core.$strict>;
                district: z.ZodObject<{
                    id: z.ZodNumber;
                    shortName: z.ZodString;
                }, z.core.$strict>;
                locality: z.ZodObject<{
                    id: z.ZodNumber;
                    shortName: z.ZodString;
                }, z.core.$strict>;
                postalAddressPart: z.ZodNullable<z.ZodString>;
                fullPostalAddress: z.ZodString;
                id: z.ZodNumber;
                isRecoverable: z.ZodBoolean;
            }, z.core.$strict>>;
            officialNames: z.ZodArray<z.ZodObject<{
                officialName: z.ZodString;
                id: z.ZodNumber;
            }, z.core.$strict>>;
            coordinations: z.ZodArray<z.ZodObject<{
                partnerContacts: z.ZodString;
                partnerName: z.ZodString;
                homeName: z.ZodString;
                regionName: z.ZodString;
                partnerId: z.ZodNumber;
                isRecoverable: z.ZodBoolean;
                id: z.ZodNumber;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        coordinations: z.ZodArray<z.ZodObject<{
            partnerContacts: z.ZodString;
            partnerName: z.ZodString;
            homeName: z.ZodString;
            regionName: z.ZodString;
            partnerId: z.ZodNumber;
            isRecoverable: z.ZodBoolean;
            id: z.ZodNumber;
        }, z.core.$strict>>;
        dateOfLastUpdate: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
        status: z.ZodEnum<{
            OPEN: "OPEN";
            CLOSE: "CLOSE";
        }>;
        dateOfClose: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    }, z.core.$strict>>;
    length: z.ZodCoercedNumber<unknown>;
}, z.core.$strict>;
export type HomeDraft = z.infer<typeof homeDraftSchema>;
export type HomeDraftContacts = z.infer<typeof draftContactsSchema>;
export type HomeOutdatedData = z.infer<typeof outdatedDataSchema>;
export type HomeChangingData = z.infer<typeof changingDataSchema>;
export type HomeOutdatingData = z.infer<typeof outdatingDataSchema>;
export type HomeCoordination = z.infer<typeof cooperationItemSchema>;
export type HomeAddress = z.infer<typeof nonNullableAddressSchema>;
export type PostalAddress = z.infer<typeof postalAddressSchema>;
export type HomeContacts = z.infer<typeof optionalContactsSchema>;
export type OutdatedCoordination = z.infer<typeof cooperationItemSchema>;
export type OutdatedOfficialName = z.infer<typeof outdatedNameItemSchema>;
export type OutdatedHomeAddress = z.infer<typeof outdatedAddressItemSchema>;
export {};
