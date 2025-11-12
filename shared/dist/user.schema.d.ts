import { z } from 'zod';
export declare const causeOfRestrictionControlSchema: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
export declare const emailControlSchema: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodEmail>;
export declare const phoneNumberControlSchema: z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>;
export declare const telegramIdControlSchema: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
export declare const whatsAppControlSchema: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodNullable<z.ZodString>>;
export declare const telegramNicknameControlSchema: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
export declare const vKontakteControlSchema: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
export declare const instagramControlSchema: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
export declare const facebookControlSchema: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
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
    otherContact: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
}, z.core.$strict>;
export declare const contactsSchema: z.ZodObject<{
    email: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>;
    phoneNumber: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>;
    whatsApp: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>>;
    telegram: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>;
    telegramNickname: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>>;
    telegramId: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>;
    telegramPhoneNumber: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
    }, z.core.$strict>>;
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
export declare const userIdSchema: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
}, z.core.$strict>;
export declare const userBlockingSchema: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
    causeOfRestriction: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
}, z.core.$strict>;
export declare const checkUserNameSchema: z.ZodObject<{
    userName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    id: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strict>;
export declare const checkUserDataSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    firstName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    lastName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    contacts: z.ZodObject<{
        email: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodEmail>>;
        phoneNumber: z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>;
        whatsApp: z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>;
        telegramNickname: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        telegramId: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        telegramPhoneNumber: z.ZodArray<z.ZodPipe<z.ZodTransform<{}, unknown>, z.ZodString>>;
        vKontakte: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        instagram: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        facebook: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        otherContact: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const userDraftSchema: z.ZodObject<{
    id: z.ZodNullable<z.ZodNumber>;
    userName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    password: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    firstName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    patronymic: z.ZodNullable<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    lastName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    roleId: z.ZodNumber;
    draftAddress: z.ZodObject<{
        countryId: z.ZodNullable<z.ZodNumber>;
        regionId: z.ZodNullable<z.ZodNumber>;
        districtId: z.ZodNullable<z.ZodNumber>;
        localityId: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strict>;
    comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
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
        otherContact: z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const changePasswordSchema: z.ZodObject<{
    userId: z.ZodNumber;
    newPassword: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    currentPassword: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const changingMainSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    patronymic: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lastName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    userName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    roleId: z.ZodOptional<z.ZodNumber>;
    comment: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    isRestricted: z.ZodOptional<z.ZodBoolean>;
    causeOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    dateOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>>;
}, z.core.$strict>;
export declare const changingDataSchema: z.ZodObject<{
    main: z.ZodNullable<z.ZodObject<{
        firstName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        patronymic: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        lastName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        userName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        roleId: z.ZodOptional<z.ZodNumber>;
        comment: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        isRestricted: z.ZodOptional<z.ZodBoolean>;
        causeOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        dateOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>>;
    }, z.core.$strict>>;
    address: z.ZodNullable<z.ZodObject<{
        countryId: z.ZodNullable<z.ZodNumber>;
        regionId: z.ZodNullable<z.ZodNumber>;
        districtId: z.ZodNullable<z.ZodNumber>;
        localityId: z.ZodNullable<z.ZodNumber>;
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
        otherContact: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const outdatingDataSchema: z.ZodObject<{
    address: z.ZodNullable<z.ZodNumber>;
    names: z.ZodNullable<z.ZodObject<{
        firstName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
        patronymic: z.ZodNullable<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        lastName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    }, z.core.$strict>>;
    userName: z.ZodNullable<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    contacts: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
}, z.core.$strict>;
export declare const deletingDataSchema: z.ZodObject<{
    userNames: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    names: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    addresses: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    contacts: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
}, z.core.$strict>;
export declare const restoringDataSchema: z.ZodObject<{
    addresses: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    names: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    userNames: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
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
        otherContact: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const updateUserDataSchema: z.ZodObject<{
    id: z.ZodNumber;
    changes: z.ZodObject<{
        main: z.ZodNullable<z.ZodObject<{
            firstName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
            patronymic: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            lastName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
            userName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
            roleId: z.ZodOptional<z.ZodNumber>;
            comment: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            isRestricted: z.ZodOptional<z.ZodBoolean>;
            causeOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            dateOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>>;
        }, z.core.$strict>>;
        address: z.ZodNullable<z.ZodObject<{
            countryId: z.ZodNullable<z.ZodNumber>;
            regionId: z.ZodNullable<z.ZodNumber>;
            districtId: z.ZodNullable<z.ZodNumber>;
            localityId: z.ZodNullable<z.ZodNumber>;
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
            otherContact: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    restoringData: z.ZodObject<{
        addresses: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
        names: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
        userNames: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
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
            otherContact: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodNumber;
                content: z.ZodString;
            }, z.core.$strict>>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    outdatingData: z.ZodObject<{
        address: z.ZodNullable<z.ZodNumber>;
        names: z.ZodNullable<z.ZodObject<{
            firstName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
            patronymic: z.ZodNullable<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
            lastName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
        }, z.core.$strict>>;
        userName: z.ZodNullable<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        contacts: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    }, z.core.$strict>;
    deletingData: z.ZodObject<{
        userNames: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
        names: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
        addresses: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
        contacts: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const usersQueryDTOSchema: z.ZodObject<{
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
            roles: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodNumber>>>;
            comment: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            dateBeginningRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodCoercedDate<unknown>, z.ZodCoercedDate<unknown>], null>>>;
            dateRestrictionRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodCoercedDate<unknown>, z.ZodCoercedDate<unknown>], null>>>;
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
declare const outdatedUserNameItemSchema: z.ZodObject<{
    userName: z.ZodString;
    id: z.ZodNumber;
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
    userNames: z.ZodArray<z.ZodObject<{
        userName: z.ZodString;
        id: z.ZodNumber;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const userSchema: z.ZodObject<{
    id: z.ZodNumber;
    userName: z.ZodString;
    firstName: z.ZodString;
    patronymic: z.ZodNullable<z.ZodString>;
    lastName: z.ZodString;
    roleId: z.ZodNumber;
    roleName: z.ZodString;
    isRestricted: z.ZodBoolean;
    dateOfStart: z.ZodCoercedDate<unknown>;
    causeOfRestriction: z.ZodNullable<z.ZodString>;
    dateOfRestriction: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    address: z.ZodObject<{
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
    comment: z.ZodNullable<z.ZodString>;
    orderedContacts: z.ZodObject<{
        email: z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>;
        phoneNumber: z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>;
        whatsApp: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
        telegram: z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>;
        telegramNickname: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>>;
        telegramId: z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>;
        telegramPhoneNumber: z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            content: z.ZodString;
        }, z.core.$strict>>;
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
        userNames: z.ZodArray<z.ZodObject<{
            userName: z.ZodString;
            id: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const usersSchema: z.ZodObject<{
    list: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        userName: z.ZodString;
        firstName: z.ZodString;
        patronymic: z.ZodNullable<z.ZodString>;
        lastName: z.ZodString;
        roleId: z.ZodNumber;
        roleName: z.ZodString;
        isRestricted: z.ZodBoolean;
        dateOfStart: z.ZodCoercedDate<unknown>;
        causeOfRestriction: z.ZodNullable<z.ZodString>;
        dateOfRestriction: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
        address: z.ZodObject<{
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
        comment: z.ZodNullable<z.ZodString>;
        orderedContacts: z.ZodObject<{
            email: z.ZodArray<z.ZodObject<{
                id: z.ZodNumber;
                content: z.ZodString;
            }, z.core.$strict>>;
            phoneNumber: z.ZodArray<z.ZodObject<{
                id: z.ZodNumber;
                content: z.ZodString;
            }, z.core.$strict>>;
            whatsApp: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodNumber;
                content: z.ZodString;
            }, z.core.$strict>>>;
            telegram: z.ZodArray<z.ZodObject<{
                id: z.ZodNumber;
                content: z.ZodString;
            }, z.core.$strict>>;
            telegramNickname: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodNumber;
                content: z.ZodString;
            }, z.core.$strict>>>;
            telegramId: z.ZodArray<z.ZodObject<{
                id: z.ZodNumber;
                content: z.ZodString;
            }, z.core.$strict>>;
            telegramPhoneNumber: z.ZodArray<z.ZodObject<{
                id: z.ZodNumber;
                content: z.ZodString;
            }, z.core.$strict>>;
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
            userNames: z.ZodArray<z.ZodObject<{
                userName: z.ZodString;
                id: z.ZodNumber;
            }, z.core.$strict>>;
        }, z.core.$strict>;
    }, z.core.$strict>>;
    length: z.ZodCoercedNumber<unknown>;
}, z.core.$strict>;
export declare const duplicatesSchema: z.ZodObject<{
    duplicatesName: z.ZodArray<z.ZodString>;
    duplicatesContact: z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        content: z.ZodString;
        users: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type UserDuplicates = z.infer<typeof duplicatesSchema>;
export type UserDraft = z.infer<typeof userDraftSchema>;
export type UserDraftContacts = z.infer<typeof draftContactsSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type UserContacts = z.infer<typeof contactsSchema>;
export type OutdatedUserName = z.infer<typeof outdatedUserNameItemSchema>;
export type UserOutdatedData = z.infer<typeof outdatedDataSchema>;
export type UserChangingData = z.infer<typeof changingDataSchema>;
export type UserOutdatingData = z.infer<typeof outdatingDataSchema>;
export {};
