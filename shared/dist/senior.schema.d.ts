import { z } from 'zod';
export declare const nullableDateOnly: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodDate>>;
export declare const checkSeniorDataSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    homeId: z.ZodCoercedNumber<unknown>;
    firstName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    patronymic: z.ZodNullable<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    lastName: z.ZodNullable<z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>>;
    birthDate: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodDate>>;
}, z.core.$strict>;
export declare const seniorIdSchema: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
}, z.core.$strict>;
export declare const seniorBlockingSchema: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
    causeOfRestriction: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
}, z.core.$strict>;
export declare const seniorDraftSchema: z.ZodObject<{
    id: z.ZodNullable<z.ZodNumber>;
    firstName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    patronymic: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    lastName: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    birthDate: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    gender: z.ZodEnum<{
        male: "male";
        female: "female";
    }>;
    comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    dateOfConsent: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    personalNoAddr: z.ZodBoolean;
    isRestricted: z.ZodBoolean;
    causeOfRestriction: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    dateOfRestriction: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    dateOfStart: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    dateOfExit: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    homeId: z.ZodNumber;
    spouseId: z.ZodNullable<z.ZodNumber>;
}, z.core.$strict>;
export declare const changingMainSchema: z.ZodObject<{
    firstName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
    patronymic: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    lastName: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    birthDate: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    confirmedFirstName: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    confirmedPatronymic: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    confirmedLastName: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    confirmedBirthDate: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    gender: z.ZodEnum<{
        male: "male";
        female: "female";
    }>;
    comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    dateOfConsent: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    personalNoAddr: z.ZodBoolean;
    isRestricted: z.ZodBoolean;
    causeOfRestriction: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    dateOfRestriction: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    dateOfStart: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    dateOfExit: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    spouseId: z.ZodNullable<z.ZodNumber>;
}, z.core.$strict>;
export declare const changingDataSchema: z.ZodObject<{
    main: z.ZodNullable<z.ZodObject<{
        firstName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
        patronymic: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        lastName: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        birthDate: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
        confirmedFirstName: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        confirmedPatronymic: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        confirmedLastName: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        confirmedBirthDate: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
        gender: z.ZodEnum<{
            male: "male";
            female: "female";
        }>;
        comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        dateOfConsent: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
        personalNoAddr: z.ZodBoolean;
        isRestricted: z.ZodBoolean;
        causeOfRestriction: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        dateOfRestriction: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
        kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        dateOfStart: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
        dateOfExit: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
        spouseId: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strict>>;
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
            firstName: z.ZodPipe<z.ZodTransform<string, unknown>, z.ZodString>;
            patronymic: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            lastName: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            birthDate: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
            confirmedFirstName: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            confirmedPatronymic: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            confirmedLastName: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            confirmedBirthDate: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
            gender: z.ZodEnum<{
                male: "male";
                female: "female";
            }>;
            comment: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            dateOfConsent: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
            personalNoAddr: z.ZodBoolean;
            isRestricted: z.ZodBoolean;
            causeOfRestriction: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            dateOfRestriction: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
            kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
            dateOfStart: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
            dateOfExit: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
            spouseId: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strict>>;
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
        includeOutdated: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    filters: z.ZodOptional<z.ZodObject<{
        general: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            comment: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            dateBeginningRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodCoercedDate<unknown>, z.ZodCoercedDate<unknown>], null>>>;
            dateRestrictionRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodCoercedDate<unknown>, z.ZodCoercedDate<unknown>], null>>>;
            dateRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodNullable<z.ZodNumber>, z.ZodNullable<z.ZodNumber>], null>>>;
            monthRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodNullable<z.ZodNumber>, z.ZodNullable<z.ZodNumber>], null>>>;
            yearRange: z.ZodOptional<z.ZodOptional<z.ZodTuple<[z.ZodNullable<z.ZodNumber>, z.ZodNullable<z.ZodNumber>], null>>>;
            homes: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodNumber>>>;
            noAddress: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            specialHome: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            acceptableForSchool: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            gender: z.ZodOptional<z.ZodEnum<{
                male: "male";
                female: "female";
            }>>;
            hasPhotoLink: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            hasConsent: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            hasSpouse: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            hasKindergartenStatus: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            hasTeacherStatus: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            hasHonoraryStatus: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            hasVeteranStatus: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            hasChildOfWarStatus: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            hasOrthodoxBelieverStatus: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            hasProfession: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
        }, z.core.$strip>>>;
        address: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            countries: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodNumber>>>;
            regions: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodNumber>>>;
            districts: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodNumber>>>;
            localities: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodNumber>>>;
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
        fullPostalAddress: z.ZodString;
    }, z.core.$strict>;
    comment: z.ZodNullable<z.ZodString>;
    birthDate: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    confirmedFirstName: z.ZodNullable<z.ZodString>;
    confirmedPatronymic: z.ZodNullable<z.ZodString>;
    confirmedLastName: z.ZodNullable<z.ZodString>;
    confirmedBirthDate: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    gender: z.ZodEnum<{
        male: "male";
        female: "female";
    }>;
    infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    dateOfConsent: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    personalNoAddr: z.ZodBoolean;
    kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
    dateOfExit: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
    spouse: z.ZodNullable<z.ZodObject<{
        spouseId: z.ZodNumber;
        spouseFullName: z.ZodString;
    }, z.core.$strip>>;
    home: z.ZodObject<{
        homeId: z.ZodNumber;
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
            fullPostalAddress: z.ZodString;
        }, z.core.$strict>;
        comment: z.ZodNullable<z.ZodString>;
        birthDate: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
        confirmedFirstName: z.ZodNullable<z.ZodString>;
        confirmedPatronymic: z.ZodNullable<z.ZodString>;
        confirmedLastName: z.ZodNullable<z.ZodString>;
        confirmedBirthDate: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
        gender: z.ZodEnum<{
            male: "male";
            female: "female";
        }>;
        infoNote: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        photoLink: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        dateOfConsent: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
        personalNoAddr: z.ZodBoolean;
        kindergarten: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        teacher: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        veteran: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        childOfWar: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        profession: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        honoraryStatus: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        interests: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        orthodoxBeliever: z.ZodPipe<z.ZodTransform<string | null, unknown>, z.ZodNullable<z.ZodString>>;
        dateOfExit: z.ZodPipe<z.ZodTransform<{} | null, unknown>, z.ZodNullable<z.ZodDate>>;
        spouse: z.ZodNullable<z.ZodObject<{
            spouseId: z.ZodNumber;
            spouseFullName: z.ZodString;
        }, z.core.$strip>>;
        home: z.ZodObject<{
            homeId: z.ZodNumber;
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
export type SeniorOutdatedData = z.infer<typeof outdatedDataSchema>;
export type SeniorChangingData = z.infer<typeof changingDataSchema>;
export type SeniorAddress = z.infer<typeof seniorAddressSchema>;
