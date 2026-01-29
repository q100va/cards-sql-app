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
