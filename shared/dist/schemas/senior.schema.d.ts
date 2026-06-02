import { z } from 'zod';
export declare const nullableDateOnly: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
export declare const checkSeniorDataSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    homeId: z.ZodCoercedNumber<unknown>;
    firstName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    patronymic: z.ZodNullable<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    lastName: z.ZodNullable<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
}, z.core.$strict>;
export declare const seniorIdSchema: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
}, z.core.$strict>;
export declare const seniorBlockingSchema: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
    causeOfRestriction: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
}, z.core.$strict>;
export declare const homeControlSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    fullPostalAddress: z.ZodString;
    countryId: z.ZodNumber;
    regionId: z.ZodNumber;
    districtId: z.ZodNumber;
    localityId: z.ZodNumber;
}, z.core.$strip>;
export declare const spouseControlSchema: z.ZodNullable<z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
}, z.core.$strip>>;
export declare const seniorDraftSchema: z.ZodObject<{
    id: z.ZodNullable<z.ZodNumber>;
    firstName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    patronymic: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    lastName: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    confirmedFirstName: z.ZodBoolean;
    confirmedPatronymic: z.ZodBoolean;
    confirmedLastName: z.ZodBoolean;
    confirmedBirthDate: z.ZodBoolean;
    gender: z.ZodEnum<{
        male: "male";
        female: "female";
    }>;
    comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    dateOfConsent: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    personalNoAddr: z.ZodBoolean;
    isRestricted: z.ZodBoolean;
    causeOfRestriction: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    dateOfRestriction: z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>;
    kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    dateOfStart: z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>;
    dateOfExit: z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>;
    homeId: z.ZodNumber;
    spouseId: z.ZodNullable<z.ZodNumber>;
}, z.core.$strict>;
export declare const changingMainSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    patronymic: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    lastName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    birthDate: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    confirmedFirstName: z.ZodOptional<z.ZodBoolean>;
    confirmedPatronymic: z.ZodOptional<z.ZodBoolean>;
    confirmedLastName: z.ZodOptional<z.ZodBoolean>;
    confirmedBirthDate: z.ZodOptional<z.ZodBoolean>;
    gender: z.ZodOptional<z.ZodEnum<{
        male: "male";
        female: "female";
    }>>;
    comment: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    infoNote: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    photoLink: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    dateOfConsent: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    personalNoAddr: z.ZodOptional<z.ZodBoolean>;
    isRestricted: z.ZodOptional<z.ZodBoolean>;
    causeOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    dateOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>>;
    kindergarten: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    teacher: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    veteran: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    childOfWar: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    profession: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    honoraryStatus: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    interests: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    orthodoxBeliever: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    dateOfStart: z.ZodOptional<z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>>;
    dateOfExit: z.ZodOptional<z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>>;
    spouseId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>;
export declare const changingDataSchema: z.ZodObject<{
    main: z.ZodNullable<z.ZodObject<{
        firstName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
        patronymic: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        lastName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        birthDate: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        confirmedFirstName: z.ZodOptional<z.ZodBoolean>;
        confirmedPatronymic: z.ZodOptional<z.ZodBoolean>;
        confirmedLastName: z.ZodOptional<z.ZodBoolean>;
        confirmedBirthDate: z.ZodOptional<z.ZodBoolean>;
        gender: z.ZodOptional<z.ZodEnum<{
            male: "male";
            female: "female";
        }>>;
        comment: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        infoNote: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        photoLink: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        dateOfConsent: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        personalNoAddr: z.ZodOptional<z.ZodBoolean>;
        isRestricted: z.ZodOptional<z.ZodBoolean>;
        causeOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        dateOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>>;
        kindergarten: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        teacher: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        veteran: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        childOfWar: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        profession: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        honoraryStatus: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        interests: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        orthodoxBeliever: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        dateOfStart: z.ZodOptional<z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>>;
        dateOfExit: z.ZodOptional<z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>>;
        spouseId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strip>>;
}, z.core.$strict>;
export declare const outdatingDataSchema: z.ZodObject<{
    names: z.ZodNullable<z.ZodObject<{
        firstName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
        patronymic: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        lastName: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const deletingDataSchema: z.ZodObject<{
    names: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
}, z.core.$strict>;
export declare const restoringDataSchema: z.ZodObject<{
    names: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
}, z.core.$strict>;
export declare const updateSeniorDataSchema: z.ZodObject<{
    id: z.ZodNumber;
    changingData: z.ZodObject<{
        main: z.ZodNullable<z.ZodObject<{
            firstName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
            patronymic: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            lastName: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            birthDate: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            confirmedFirstName: z.ZodOptional<z.ZodBoolean>;
            confirmedPatronymic: z.ZodOptional<z.ZodBoolean>;
            confirmedLastName: z.ZodOptional<z.ZodBoolean>;
            confirmedBirthDate: z.ZodOptional<z.ZodBoolean>;
            gender: z.ZodOptional<z.ZodEnum<{
                male: "male";
                female: "female";
            }>>;
            comment: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            infoNote: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            photoLink: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            dateOfConsent: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            personalNoAddr: z.ZodOptional<z.ZodBoolean>;
            isRestricted: z.ZodOptional<z.ZodBoolean>;
            causeOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            dateOfRestriction: z.ZodOptional<z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>>;
            kindergarten: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            teacher: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            veteran: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            childOfWar: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            profession: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            honoraryStatus: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            interests: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            orthodoxBeliever: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            dateOfStart: z.ZodOptional<z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>>;
            dateOfExit: z.ZodOptional<z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>>;
            spouseId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        }, z.core.$strip>>;
    }, z.core.$strict>;
    restoringData: z.ZodObject<{
        names: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    }, z.core.$strict>;
    outdatingData: z.ZodObject<{
        names: z.ZodNullable<z.ZodObject<{
            firstName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
            patronymic: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            lastName: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    deletingData: z.ZodObject<{
        names: z.ZodNullable<z.ZodArray<z.ZodNumber>>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const seniorsQueryDTOSchema: z.ZodObject<{
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
        homeOption: z.ZodOptional<z.ZodString>;
        includeOutdated: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    filters: z.ZodOptional<z.ZodObject<{
        general: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            dateBeginningRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodCoercedDate<unknown>, z.ZodCoercedDate<unknown>], null>>>;
            dateRestrictionRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodCoercedDate<unknown>, z.ZodCoercedDate<unknown>], null>>>;
            dateExitRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodCoercedDate<unknown>, z.ZodCoercedDate<unknown>], null>>>;
            dayRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodNullable<z.ZodNumber>, z.ZodNullable<z.ZodNumber>], null>>>;
            monthRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodNullable<z.ZodNumber>, z.ZodNullable<z.ZodNumber>], null>>>;
            yearRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodNullable<z.ZodNumber>, z.ZodNullable<z.ZodNumber>], null>>>;
            homes: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodNumber>>>;
            gender: z.ZodOptional<z.ZodEnum<{
                male: "male";
                female: "female";
            }>>;
            noAddress: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            specialHome: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            acceptableForSchool: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            details: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString>>>;
            hideWithoutYear: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            hideWithoutBirthday: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
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
            strictDetail: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strict>;
export declare const outdatedDataSchema: z.ZodObject<{
    names: z.ZodArray<z.ZodObject<{
        firstName: z.ZodString;
        patronymic: z.ZodNullable<z.ZodString>;
        lastName: z.ZodNullable<z.ZodString>;
        id: z.ZodNumber;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const seniorAddressSchema: z.ZodObject<{
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
    fullPostalAddress: z.ZodString;
}, z.core.$strict>;
export declare const seniorSchema: z.ZodObject<{
    id: z.ZodNumber;
    firstName: z.ZodString;
    patronymic: z.ZodNullable<z.ZodString>;
    lastName: z.ZodNullable<z.ZodString>;
    isRestricted: z.ZodBoolean;
    dateOfStart: z.ZodCoercedDate<unknown>;
    causeOfRestriction: z.ZodNullable<z.ZodString>;
    dateOfRestriction: z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>;
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
        fullPostalAddress: z.ZodString;
    }, z.core.$strict>;
    comment: z.ZodNullable<z.ZodString>;
    birthDate: z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>;
    confirmedFirstName: z.ZodBoolean;
    confirmedPatronymic: z.ZodBoolean;
    confirmedLastName: z.ZodBoolean;
    confirmedBirthDate: z.ZodBoolean;
    gender: z.ZodEnum<{
        male: "male";
        female: "female";
    }>;
    infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    dateOfConsent: z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>;
    personalNoAddr: z.ZodBoolean;
    kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    dateOfExit: z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>;
    spouseFullName: z.ZodNullable<z.ZodString>;
    spouseId: z.ZodNullable<z.ZodNumber>;
    homeId: z.ZodNumber;
    home: z.ZodObject<{
        homeName: z.ZodString;
        noAddress: z.ZodBoolean;
        specialHome: z.ZodBoolean;
        acceptableForSchool: z.ZodBoolean;
        isRestricted: z.ZodBoolean;
        dateOfRestriction: z.ZodCoercedDate<unknown>;
        isClose: z.ZodBoolean;
        dateOfClose: z.ZodCoercedDate<unknown>;
    }, z.core.$strip>;
    outdatedData: z.ZodObject<{
        names: z.ZodArray<z.ZodObject<{
            firstName: z.ZodString;
            patronymic: z.ZodNullable<z.ZodString>;
            lastName: z.ZodNullable<z.ZodString>;
            id: z.ZodNumber;
        }, z.core.$strict>>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const seniorsSchema: z.ZodObject<{
    list: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        firstName: z.ZodString;
        patronymic: z.ZodNullable<z.ZodString>;
        lastName: z.ZodNullable<z.ZodString>;
        isRestricted: z.ZodBoolean;
        dateOfStart: z.ZodCoercedDate<unknown>;
        causeOfRestriction: z.ZodNullable<z.ZodString>;
        dateOfRestriction: z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>;
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
            fullPostalAddress: z.ZodString;
        }, z.core.$strict>;
        comment: z.ZodNullable<z.ZodString>;
        birthDate: z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>;
        confirmedFirstName: z.ZodBoolean;
        confirmedPatronymic: z.ZodBoolean;
        confirmedLastName: z.ZodBoolean;
        confirmedBirthDate: z.ZodBoolean;
        gender: z.ZodEnum<{
            male: "male";
            female: "female";
        }>;
        infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        dateOfConsent: z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>;
        personalNoAddr: z.ZodBoolean;
        kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        dateOfExit: z.ZodPipe<z.ZodTransform<Date | null | undefined, unknown>, z.ZodNullable<z.ZodDate>>;
        spouseFullName: z.ZodNullable<z.ZodString>;
        spouseId: z.ZodNullable<z.ZodNumber>;
        homeId: z.ZodNumber;
        home: z.ZodObject<{
            homeName: z.ZodString;
            noAddress: z.ZodBoolean;
            specialHome: z.ZodBoolean;
            acceptableForSchool: z.ZodBoolean;
            isRestricted: z.ZodBoolean;
            dateOfRestriction: z.ZodCoercedDate<unknown>;
            isClose: z.ZodBoolean;
            dateOfClose: z.ZodCoercedDate<unknown>;
        }, z.core.$strip>;
        outdatedData: z.ZodObject<{
            names: z.ZodArray<z.ZodObject<{
                firstName: z.ZodString;
                patronymic: z.ZodNullable<z.ZodString>;
                lastName: z.ZodNullable<z.ZodString>;
                id: z.ZodNumber;
            }, z.core.$strict>>;
        }, z.core.$strict>;
    }, z.core.$strict>>;
    length: z.ZodCoercedNumber<unknown>;
}, z.core.$strict>;
export declare const seniorRowSchema: z.ZodObject<{
    nursingHome: z.ZodString;
    lastName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    firstName: z.ZodString;
    patronymic: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dateOfConsent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dayBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
    monthBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
    yearBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
    birthDate: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    gender: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        male: "male";
        female: "female";
    }>>>;
    comment: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    infoNote: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    photoLink: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    kindergarten: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    teacher: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    veteran: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    childOfWar: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    profession: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    honoraryStatus: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    interests: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    orthodoxBeliever: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
}, z.core.$strip>;
export declare const seniorPreSchema: z.ZodObject<{
    nursingHome: z.ZodString;
    lastName: z.ZodNullable<z.ZodString>;
    firstName: z.ZodString;
    patronymic: z.ZodNullable<z.ZodString>;
    dateOfConsent: z.ZodNullable<z.ZodString>;
    dayBirthday: z.ZodNullable<z.ZodCoercedNumber<unknown>>;
    monthBirthday: z.ZodNullable<z.ZodCoercedNumber<unknown>>;
    yearBirthday: z.ZodNullable<z.ZodCoercedNumber<unknown>>;
    birthDate: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    gender: z.ZodEnum<{
        male: "male";
        female: "female";
    }>;
    comment: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    infoNote: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    photoLink: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    kindergarten: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    teacher: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    veteran: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    childOfWar: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    profession: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    honoraryStatus: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    interests: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    orthodoxBeliever: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
}, z.core.$strip>;
export declare const seniorRawSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodNumber>;
    homeId: z.ZodNumber;
    nursingHome: z.ZodOptional<z.ZodString>;
    lastName: z.ZodNullable<z.ZodString>;
    firstName: z.ZodString;
    patronymic: z.ZodNullable<z.ZodString>;
    dateOfConsent: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    dayBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
    monthBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
    yearBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
    birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    gender: z.ZodEnum<{
        male: "male";
        female: "female";
    }>;
    dateOfExit: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
declare const changesSchema: z.ZodObject<{
    lastName: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodNullable<z.ZodString>;
        oldValue: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    firstName: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodString;
        oldValue: z.ZodString;
    }, z.core.$strip>>;
    patronymic: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodNullable<z.ZodString>;
        oldValue: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    gender: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodEnum<{
            male: "male";
            female: "female";
        }>;
        oldValue: z.ZodEnum<{
            male: "male";
            female: "female";
        }>;
    }, z.core.$strip>>;
    birthDate: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    dateOfExit: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    dateOfConsent: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    comment: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    infoNote: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    photoLink: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    kindergarten: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    teacher: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    veteran: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    childOfWar: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    profession: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    honoraryStatus: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    interests: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    orthodoxBeliever: z.ZodOptional<z.ZodObject<{
        newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const acceptedChangesSchema: z.ZodObject<{
    lastName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    firstName: z.ZodOptional<z.ZodString>;
    patronymic: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    gender: z.ZodOptional<z.ZodEnum<{
        male: "male";
        female: "female";
    }>>;
    birthDate: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    dateOfExit: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    dateOfConsent: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    comment: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    infoNote: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    photoLink: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    kindergarten: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    teacher: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    veteran: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    childOfWar: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    profession: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    honoraryStatus: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    interests: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
    orthodoxBeliever: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
}, z.core.$strip>;
declare const seniorDiffSchema: z.ZodObject<{
    newSenior: z.ZodObject<{
        id: z.ZodOptional<z.ZodNumber>;
        homeId: z.ZodNumber;
        nursingHome: z.ZodOptional<z.ZodString>;
        lastName: z.ZodNullable<z.ZodString>;
        firstName: z.ZodString;
        patronymic: z.ZodNullable<z.ZodString>;
        dateOfConsent: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        dayBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        monthBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        yearBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        gender: z.ZodEnum<{
            male: "male";
            female: "female";
        }>;
        dateOfExit: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
    oldSenior: z.ZodObject<{
        id: z.ZodOptional<z.ZodNumber>;
        homeId: z.ZodNumber;
        nursingHome: z.ZodOptional<z.ZodString>;
        lastName: z.ZodNullable<z.ZodString>;
        firstName: z.ZodString;
        patronymic: z.ZodNullable<z.ZodString>;
        dateOfConsent: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        dayBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        monthBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        yearBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        gender: z.ZodEnum<{
            male: "male";
            female: "female";
        }>;
        dateOfExit: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
    changes: z.ZodObject<{
        lastName: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodNullable<z.ZodString>;
            oldValue: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        firstName: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodString;
            oldValue: z.ZodString;
        }, z.core.$strip>>;
        patronymic: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodNullable<z.ZodString>;
            oldValue: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        gender: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodEnum<{
                male: "male";
                female: "female";
            }>;
            oldValue: z.ZodEnum<{
                male: "male";
                female: "female";
            }>;
        }, z.core.$strip>>;
        birthDate: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        dateOfExit: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        dateOfConsent: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        comment: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        infoNote: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        photoLink: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        kindergarten: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        teacher: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        veteran: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        childOfWar: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        profession: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        honoraryStatus: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        interests: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        orthodoxBeliever: z.ZodOptional<z.ZodObject<{
            newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    changeRows: z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        label: z.ZodString;
        newValue: z.ZodAny;
        oldValue: z.ZodAny;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const differencesResponseSchema: z.ZodObject<{
    differences: z.ZodObject<{
        newSeniors: z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodNumber>;
            homeId: z.ZodNumber;
            nursingHome: z.ZodOptional<z.ZodString>;
            lastName: z.ZodNullable<z.ZodString>;
            firstName: z.ZodString;
            patronymic: z.ZodNullable<z.ZodString>;
            dateOfConsent: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            dayBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
            monthBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
            yearBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
            birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            gender: z.ZodEnum<{
                male: "male";
                female: "female";
            }>;
            dateOfExit: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        removedSeniors: z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodNumber>;
            homeId: z.ZodNumber;
            nursingHome: z.ZodOptional<z.ZodString>;
            lastName: z.ZodNullable<z.ZodString>;
            firstName: z.ZodString;
            patronymic: z.ZodNullable<z.ZodString>;
            dateOfConsent: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            dayBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
            monthBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
            yearBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
            birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            gender: z.ZodEnum<{
                male: "male";
                female: "female";
            }>;
            dateOfExit: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        updatedSeniors: z.ZodArray<z.ZodObject<{
            newSenior: z.ZodObject<{
                id: z.ZodOptional<z.ZodNumber>;
                homeId: z.ZodNumber;
                nursingHome: z.ZodOptional<z.ZodString>;
                lastName: z.ZodNullable<z.ZodString>;
                firstName: z.ZodString;
                patronymic: z.ZodNullable<z.ZodString>;
                dateOfConsent: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                dayBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                monthBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                yearBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                gender: z.ZodEnum<{
                    male: "male";
                    female: "female";
                }>;
                dateOfExit: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            }, z.core.$strip>;
            oldSenior: z.ZodObject<{
                id: z.ZodOptional<z.ZodNumber>;
                homeId: z.ZodNumber;
                nursingHome: z.ZodOptional<z.ZodString>;
                lastName: z.ZodNullable<z.ZodString>;
                firstName: z.ZodString;
                patronymic: z.ZodNullable<z.ZodString>;
                dateOfConsent: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                dayBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                monthBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                yearBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                gender: z.ZodEnum<{
                    male: "male";
                    female: "female";
                }>;
                dateOfExit: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            }, z.core.$strip>;
            changes: z.ZodObject<{
                lastName: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodNullable<z.ZodString>;
                    oldValue: z.ZodNullable<z.ZodString>;
                }, z.core.$strip>>;
                firstName: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodString;
                    oldValue: z.ZodString;
                }, z.core.$strip>>;
                patronymic: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodNullable<z.ZodString>;
                    oldValue: z.ZodNullable<z.ZodString>;
                }, z.core.$strip>>;
                gender: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodEnum<{
                        male: "male";
                        female: "female";
                    }>;
                    oldValue: z.ZodEnum<{
                        male: "male";
                        female: "female";
                    }>;
                }, z.core.$strip>>;
                birthDate: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                dateOfExit: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                dateOfConsent: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                comment: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                infoNote: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                photoLink: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                kindergarten: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                teacher: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                veteran: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                childOfWar: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                profession: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                honoraryStatus: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                interests: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                orthodoxBeliever: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
            }, z.core.$strip>;
            changeRows: z.ZodArray<z.ZodObject<{
                field: z.ZodString;
                label: z.ZodString;
                newValue: z.ZodAny;
                oldValue: z.ZodAny;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        possibleDuplicates: z.ZodArray<z.ZodObject<{
            newSenior: z.ZodObject<{
                id: z.ZodOptional<z.ZodNumber>;
                homeId: z.ZodNumber;
                nursingHome: z.ZodOptional<z.ZodString>;
                lastName: z.ZodNullable<z.ZodString>;
                firstName: z.ZodString;
                patronymic: z.ZodNullable<z.ZodString>;
                dateOfConsent: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                dayBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                monthBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                yearBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                gender: z.ZodEnum<{
                    male: "male";
                    female: "female";
                }>;
                dateOfExit: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            }, z.core.$strip>;
            oldSenior: z.ZodObject<{
                id: z.ZodOptional<z.ZodNumber>;
                homeId: z.ZodNumber;
                nursingHome: z.ZodOptional<z.ZodString>;
                lastName: z.ZodNullable<z.ZodString>;
                firstName: z.ZodString;
                patronymic: z.ZodNullable<z.ZodString>;
                dateOfConsent: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                dayBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                monthBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                yearBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                gender: z.ZodEnum<{
                    male: "male";
                    female: "female";
                }>;
                dateOfExit: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            }, z.core.$strip>;
            changes: z.ZodObject<{
                lastName: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodNullable<z.ZodString>;
                    oldValue: z.ZodNullable<z.ZodString>;
                }, z.core.$strip>>;
                firstName: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodString;
                    oldValue: z.ZodString;
                }, z.core.$strip>>;
                patronymic: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodNullable<z.ZodString>;
                    oldValue: z.ZodNullable<z.ZodString>;
                }, z.core.$strip>>;
                gender: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodEnum<{
                        male: "male";
                        female: "female";
                    }>;
                    oldValue: z.ZodEnum<{
                        male: "male";
                        female: "female";
                    }>;
                }, z.core.$strip>>;
                birthDate: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                dateOfExit: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                dateOfConsent: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                comment: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                infoNote: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                photoLink: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                kindergarten: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                teacher: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                veteran: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                childOfWar: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                profession: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                honoraryStatus: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                interests: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                orthodoxBeliever: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
            }, z.core.$strip>;
            changeRows: z.ZodArray<z.ZodObject<{
                field: z.ZodString;
                label: z.ZodString;
                newValue: z.ZodAny;
                oldValue: z.ZodAny;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        returnedSeniors: z.ZodArray<z.ZodObject<{
            newSenior: z.ZodObject<{
                id: z.ZodOptional<z.ZodNumber>;
                homeId: z.ZodNumber;
                nursingHome: z.ZodOptional<z.ZodString>;
                lastName: z.ZodNullable<z.ZodString>;
                firstName: z.ZodString;
                patronymic: z.ZodNullable<z.ZodString>;
                dateOfConsent: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                dayBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                monthBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                yearBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                gender: z.ZodEnum<{
                    male: "male";
                    female: "female";
                }>;
                dateOfExit: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            }, z.core.$strip>;
            oldSenior: z.ZodObject<{
                id: z.ZodOptional<z.ZodNumber>;
                homeId: z.ZodNumber;
                nursingHome: z.ZodOptional<z.ZodString>;
                lastName: z.ZodNullable<z.ZodString>;
                firstName: z.ZodString;
                patronymic: z.ZodNullable<z.ZodString>;
                dateOfConsent: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                dayBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                monthBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                yearBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
                birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                gender: z.ZodEnum<{
                    male: "male";
                    female: "female";
                }>;
                dateOfExit: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            }, z.core.$strip>;
            changes: z.ZodObject<{
                lastName: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodNullable<z.ZodString>;
                    oldValue: z.ZodNullable<z.ZodString>;
                }, z.core.$strip>>;
                firstName: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodString;
                    oldValue: z.ZodString;
                }, z.core.$strip>>;
                patronymic: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodNullable<z.ZodString>;
                    oldValue: z.ZodNullable<z.ZodString>;
                }, z.core.$strip>>;
                gender: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodEnum<{
                        male: "male";
                        female: "female";
                    }>;
                    oldValue: z.ZodEnum<{
                        male: "male";
                        female: "female";
                    }>;
                }, z.core.$strip>>;
                birthDate: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                dateOfExit: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                dateOfConsent: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                comment: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                infoNote: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                photoLink: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                kindergarten: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                teacher: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                veteran: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                childOfWar: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                profession: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                honoraryStatus: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                interests: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
                orthodoxBeliever: z.ZodOptional<z.ZodObject<{
                    newValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                    oldValue: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
                }, z.core.$strip>>;
            }, z.core.$strip>;
            changeRows: z.ZodArray<z.ZodObject<{
                field: z.ZodString;
                label: z.ZodString;
                newValue: z.ZodAny;
                oldValue: z.ZodAny;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    homeId: z.ZodNumber;
}, z.core.$strip>;
export declare const bulkUpdateSchema: z.ZodObject<{
    admitted: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodNumber>;
        homeId: z.ZodNumber;
        nursingHome: z.ZodOptional<z.ZodString>;
        lastName: z.ZodNullable<z.ZodString>;
        firstName: z.ZodString;
        patronymic: z.ZodNullable<z.ZodString>;
        dateOfConsent: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        dayBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        monthBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        yearBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        gender: z.ZodEnum<{
            male: "male";
            female: "female";
        }>;
        dateOfExit: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    removed: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodNumber>;
        homeId: z.ZodNumber;
        nursingHome: z.ZodOptional<z.ZodString>;
        lastName: z.ZodNullable<z.ZodString>;
        firstName: z.ZodString;
        patronymic: z.ZodNullable<z.ZodString>;
        dateOfConsent: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        dayBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        monthBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        yearBirthday: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        gender: z.ZodEnum<{
            male: "male";
            female: "female";
        }>;
        dateOfExit: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    updated: z.ZodArray<z.ZodObject<{
        seniorId: z.ZodNumber;
        changes: z.ZodObject<{
            lastName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            firstName: z.ZodOptional<z.ZodString>;
            patronymic: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            gender: z.ZodOptional<z.ZodEnum<{
                male: "male";
                female: "female";
            }>>;
            birthDate: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            dateOfExit: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            dateOfConsent: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            comment: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            infoNote: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            photoLink: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            kindergarten: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            teacher: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            veteran: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            childOfWar: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            profession: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            honoraryStatus: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            interests: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
            orthodoxBeliever: z.ZodOptional<z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>>;
        }, z.core.$strip>;
    }, z.core.$strip>>;
    homeId: z.ZodNumber;
    dateOfUpdate: z.ZodCoercedDate<unknown>;
}, z.core.$strip>;
export type SeniorOutdatedData = z.infer<typeof outdatedDataSchema>;
export type SeniorChangingData = z.infer<typeof changingDataSchema>;
export type SeniorAddress = z.infer<typeof seniorAddressSchema>;
export type SeniorRow = z.infer<typeof seniorRowSchema>;
export type Differences = z.infer<typeof differencesResponseSchema>;
export type SeniorRaw = z.infer<typeof seniorRawSchema>;
export type SeniorChanges = z.infer<typeof changesSchema>;
export type SeniorDiff = z.infer<typeof seniorDiffSchema>;
export type AcceptedChanges = z.infer<typeof acceptedChangesSchema>;
export {};
