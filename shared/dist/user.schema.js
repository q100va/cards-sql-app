import { z } from 'zod';
// Reusable helpers
const nonEmptyString20 = z.string().trim().min(1).max(20);
const nonEmptyString200 = z.string().trim().min(1).max(200);
const nullableString200 = z.string().trim().min(1).max(200).nullable();
const nonEmptyString = z.string().trim().min(1);
const nullableString = z.string().trim().min(1).nullable();
const stringArray = z.array(nonEmptyString); // [] allowed, items must be non-empty
const positiveInt = z.number().int().positive();
const nullableInt = positiveInt.nullable();
// Accept Date | ISO string | null; strict null stays null
const nullableIsoDate = z.preprocess((v) => {
    if (v === null || v === undefined || v === '')
        return null;
    if (v instanceof Date)
        return v;
    const d = new Date(String(v));
    return Number.isNaN(+d) ? v : d; // if invalid, let z.date() throw
}, z.date().nullable());
/* const nullableString = z.preprocess(
  (v) => (v === '' ? null : v),
  z.string().trim().min(1).nullable()
); */
const intOptArray = z.array(positiveInt).min(1).optional();
export const userIdSchema = z
    .object({
    id: z.coerce.number().int().positive(),
})
    .strict();
export const userBlockingSchema = z
    .object({
    id: z.coerce.number().int().positive(),
    causeOfRestriction: z.string().trim().min(1),
})
    .strict();
// Address schema
export const draftAddressSchema = z
    .object({
    countryId: nullableInt,
    regionId: nullableInt,
    districtId: nullableInt,
    localityId: nullableInt,
})
    .strict();
const nonEmptyDraftContacts = z
    .array(nonEmptyString)
    .nonempty('FORM_VALIDATION.CONTACT.MIN_CONTACT');
// Contacts schema
export const draftContactsSchema = z
    .object({
    email: nonEmptyDraftContacts,
    phoneNumber: nonEmptyDraftContacts,
    whatsApp: stringArray,
    telegramNickname: stringArray,
    telegramId: nonEmptyDraftContacts,
    telegramPhoneNumber: nonEmptyDraftContacts,
    vKontakte: stringArray,
    instagram: stringArray,
    facebook: stringArray,
    otherContact: stringArray,
})
    .strict();
export const checkUserNameSchema = z
    .object({
    userName: nonEmptyString20,
    id: z.coerce.number().int().positive().optional(),
})
    .strict();
export const checkUserDataSchema = z
    .object({
    id: z.coerce.number().int().optional(),
    firstName: nonEmptyString200,
    lastName: nonEmptyString200,
    contacts: draftContactsSchema,
})
    .strict();
export const userDraftSchema = z
    .object({
    id: nullableInt,
    userName: nonEmptyString20,
    password: z.string().trim().min(8),
    firstName: nonEmptyString200,
    patronymic: nullableString200,
    lastName: nonEmptyString200,
    roleId: positiveInt,
    draftAddress: draftAddressSchema,
    comment: nullableString,
    isRestricted: z.boolean(),
    causeOfRestriction: nullableString,
    // Accept Date instance or ISO-like string; null allowed
    dateOfRestriction: nullableIsoDate,
    draftContacts: draftContactsSchema,
})
    .strict()
    // Optional business rules: keep or remove as you prefer
    .superRefine((data, ctx) => {
    // isRestricted === false -> cause/date must be null
    if (!data.isRestricted) {
        if (data.causeOfRestriction !== null) {
            ctx.addIssue({
                code: 'custom',
                path: ['causeOfRestriction'],
                message: 'Must be null when isRestricted is false',
            });
        }
        if (data.dateOfRestriction !== null) {
            ctx.addIssue({
                code: 'custom',
                path: ['dateOfRestriction'],
                message: 'Must be null when isRestricted is false',
            });
        }
    }
    else {
        // isRestricted === true -> cause required (non-empty)
        if (!data.causeOfRestriction) {
            ctx.addIssue({
                code: 'custom',
                path: ['causeOfRestriction'],
                message: 'Required when isRestricted is true',
            });
        }
        if (!data.dateOfRestriction) {
            ctx.addIssue({
                code: 'custom',
                path: ['dateOfRestriction'],
                message: 'Required when isRestricted is true',
            });
        }
    }
});
export const duplicatesSchema = z
    .object({
    duplicatesName: z.array(z.string()),
    duplicatesContact: z.array(z
        .object({
        type: z.string(),
        content: z.string(),
        users: z.array(z.string()),
    })
        .strict()),
})
    .strict();
/* ---------- Contacts ---------- */
export const contactSchema = z
    .object({
    id: positiveInt,
    content: nonEmptyString,
})
    .strict();
const nonEmptyContacts = z
    .array(contactSchema)
    .nonempty('FORM_VALIDATION.CONTACT.MIN_CONTACT');
export const contactsSchema = z
    .object({
    email: nonEmptyContacts,
    phoneNumber: nonEmptyContacts,
    whatsApp: nonEmptyContacts.optional(),
    telegram: nonEmptyContacts,
    telegramNickname: nonEmptyContacts.optional(),
    telegramId: nonEmptyContacts,
    telegramPhoneNumber: nonEmptyContacts,
    vKontakte: nonEmptyContacts.optional(),
    instagram: nonEmptyContacts.optional(),
    facebook: nonEmptyContacts.optional(),
    otherContact: nonEmptyContacts.optional(),
})
    .strict();
export const optionalContactsSchema = z
    .object({
    email: z.array(contactSchema).optional(),
    phoneNumber: z.array(contactSchema).optional(),
    whatsApp: z.array(contactSchema).optional(),
    telegram: z.array(contactSchema).optional(),
    telegramNickname: z.array(contactSchema).optional(),
    telegramId: z.array(contactSchema).optional(),
    telegramPhoneNumber: z.array(contactSchema).optional(),
    vKontakte: z.array(contactSchema).optional(),
    instagram: z.array(contactSchema).optional(),
    facebook: z.array(contactSchema).optional(),
    otherContact: z.array(contactSchema).optional(),
})
    .strict();
/* ---------- Address ---------- */
const addressRefFullSchema = z
    .object({
    id: positiveInt,
    name: nonEmptyString,
})
    .strict();
const addressRefShortSchema = z
    .object({
    id: positiveInt,
    //name: nonEmptyString,
    shortName: nonEmptyString,
})
    .strict();
export const addressSchema = z
    .object({
    country: addressRefFullSchema.nullable(),
    region: addressRefShortSchema.nullable(),
    district: addressRefShortSchema.nullable(),
    locality: addressRefShortSchema.nullable(),
    id: positiveInt.optional(),
})
    .strict();
/* ---------- OutdatedData ---------- */
const outdatedNameItemSchema = z
    .object({
    firstName: nonEmptyString200,
    patronymic: nullableString200,
    lastName: nonEmptyString200,
    id: positiveInt,
})
    .strict();
const outdatedUserNameItemSchema = z
    .object({
    userName: nonEmptyString20,
    id: positiveInt,
})
    .strict();
const outdatedAddressItemSchema = z
    .object({
    country: addressRefFullSchema,
    region: addressRefShortSchema.nullable(),
    district: addressRefShortSchema.nullable(),
    locality: addressRefShortSchema.nullable(),
    id: positiveInt,
    isRecoverable: z.boolean(),
})
    .strict();
export const outdatedDataSchema = z
    .object({
    contacts: optionalContactsSchema,
    addresses: z.array(outdatedAddressItemSchema),
    names: z.array(outdatedNameItemSchema),
    userNames: z.array(outdatedUserNameItemSchema),
})
    .strict();
export const userSchema = z
    .object({
    id: positiveInt,
    userName: nonEmptyString20,
    //password: z.string().trim().min(8),
    firstName: nonEmptyString200,
    patronymic: nullableString200,
    lastName: nonEmptyString200,
    roleId: positiveInt,
    roleName: nonEmptyString,
    isRestricted: z.boolean(),
    dateOfStart: z.coerce.date(),
    causeOfRestriction: nullableString,
    dateOfRestriction: nullableIsoDate,
    address: addressSchema,
    comment: nullableString,
    orderedContacts: contactsSchema,
    outdatedData: outdatedDataSchema,
})
    .strict();
export const usersSchema = z
    .object({
    users: z.array(userSchema),
    length: z.coerce.number().int().min(0),
})
    .strict();
export const changePasswordSchema = z
    .object({
    userId: positiveInt,
    newPassword: z.string().trim().min(8),
    currentPassword: z.string().trim().min(8).optional(), // for self-case
})
    .strict();
/* ========= ChangedData ========= */
// ChangedData.main — PATCH-like: all fields optional, nullables allowed
export const changedMainSchema = z
    .object({
    firstName: nonEmptyString.optional(),
    patronymic: nullableString.optional(),
    lastName: nonEmptyString.optional(),
    userName: nonEmptyString.optional(),
    roleId: positiveInt.optional(),
    comment: nullableString.optional(),
    isRestricted: z.boolean().optional(),
    causeOfRestriction: nullableString.optional(),
    dateOfRestriction: nullableIsoDate.optional(),
})
    .strict();
// ChangedData.address
export const changedAddressSchema = z
    .object({
    countryId: nullableInt,
    regionId: nullableInt,
    districtId: nullableInt,
    localityId: nullableInt,
})
    .strict();
// ChangedData.contacts
export const changedContactsSchema = z
    .object({
    email: nonEmptyDraftContacts.optional(),
    phoneNumber: nonEmptyDraftContacts.optional(),
    whatsApp: nonEmptyDraftContacts.optional(),
    telegram: nonEmptyDraftContacts.optional(),
    telegramNickname: nonEmptyDraftContacts.optional(),
    telegramId: nonEmptyDraftContacts.optional(),
    telegramPhoneNumber: nonEmptyDraftContacts.optional(),
    vKontakte: nonEmptyDraftContacts.optional(),
    instagram: nonEmptyDraftContacts.optional(),
    facebook: nonEmptyDraftContacts.optional(),
    otherContact: nonEmptyDraftContacts.optional(),
})
    .strict();
/* export const changedContactsSchema = z
  .object(
    Object.fromEntries(
      contactTypeKeys.map((k) => [k, stringArray.optional()])
    ) as Record<ContactTypeKey, z.ZodTypeAny>
  )
  .strict(); */
export const changedDataSchema = z
    .object({
    main: changedMainSchema.nullable(),
    address: changedAddressSchema.nullable(),
    contacts: changedContactsSchema.nullable(),
})
    .strict()
    .superRefine((data, ctx) => {
    // Apply blocking rules only if main is provided
    const m = data.main;
    if (!m)
        return;
    // If explicitly set isRestricted === false ⇒ cause/date must be null (if present)
    if (m.isRestricted === false) {
        if (m.causeOfRestriction !== undefined && m.causeOfRestriction !== null) {
            ctx.addIssue({
                code: 'custom',
                path: ['main', 'causeOfRestriction'],
                message: 'Must be null when isRestricted is false',
            });
        }
        if (m.dateOfRestriction !== undefined && m.dateOfRestriction !== null) {
            ctx.addIssue({
                code: 'custom',
                path: ['main', 'dateOfRestriction'],
                message: 'Must be null when isRestricted is false',
            });
        }
    }
    // If explicitly set isRestricted === true ⇒ require cause/date (if any of them present or isRestricted present)
    if (m.isRestricted === true) {
        if (m.causeOfRestriction === undefined || m.causeOfRestriction === null) {
            ctx.addIssue({
                code: 'custom',
                path: ['main', 'causeOfRestriction'],
                message: 'Required when isRestricted is true',
            });
        }
        if (m.dateOfRestriction === undefined || m.dateOfRestriction === null) {
            ctx.addIssue({
                code: 'custom',
                path: ['main', 'dateOfRestriction'],
                message: 'Required when isRestricted is true',
            });
        }
    }
});
/* ========= OutdatingData ========= */
export const outdatingDataSchema = z
    .object({
    address: positiveInt.nullable(), // id текущего адреса, который помечаем устаревшим
    names: z
        .object({
        firstName: nonEmptyString,
        patronymic: nullableString,
        lastName: nonEmptyString,
    })
        .strict()
        .nullable(),
    userName: nullableString, // пометить текущий userName как устаревающий
    contacts: z.array(positiveInt).nullable(), // ids контактов to mark outdated
})
    .strict();
/* ========= DeletingData ========= */
export const deletingDataSchema = z
    .object({
    userNames: z.array(positiveInt).nullable(),
    names: z.array(positiveInt).nullable(),
    addresses: z.array(positiveInt).nullable(),
    contacts: z.array(positiveInt).nullable(),
})
    .strict();
/* ========= RestoringData ========= */
export const restoringDataSchema = z
    .object({
    addresses: z.array(positiveInt).nullable(),
    names: z.array(positiveInt).nullable(),
    userNames: z.array(positiveInt).nullable(),
    contacts: optionalContactsSchema.nullable(),
})
    .strict();
/* ========= UpdateUserData wrapper ========= */
export const updateUserDataSchema = z
    .object({
    id: positiveInt.positive(),
    changes: changedDataSchema,
    restoringData: restoringDataSchema,
    outdatingData: outdatingDataSchema,
    deletingData: deletingDataSchema,
})
    .strict();
const sortDir = z.enum(['asc', 'desc']);
const contactType = z.enum([
    'email',
    'phoneNumber',
    'whatsApp',
    'telegramNickname',
    'telegramId',
    'telegramPhoneNumber',
    'vKontakte',
    'instagram',
    'facebook',
    'otherContact',
]);
const iso = z.iso.datetime(); // zod v3.22+
export const usersQueryDTOSchema = z
    .object({
    page: z.object({
        size: z.number().int().min(1),
        number: z.number().int().min(0),
    }),
    sort: z
        .array(z.object({
        field: z.string().min(1),
        direction: sortDir,
    }))
        .optional(),
    search: z
        .object({
        value: z.string().min(1),
        exact: z.boolean().optional(),
    })
        .optional(),
    view: z
        .object({
        option: z.string().min(1).optional(), // 'only-active' | 'only-blocked'
        includeOutdated: z.boolean().optional(),
    })
        .optional(),
    filters: z
        .object({
        general: z
            .object({
            roles: z.array(positiveInt).min(1).optional(),
            comment: z.array(z.string()).min(1).optional(),
            dateBeginningRange: z.tuple([iso, iso]).optional(),
            dateRestrictionRange: z.tuple([iso, iso]).optional(),
            contactTypes: z.array(contactType).min(1).optional(),
        })
            .partial()
            .optional(),
        address: z
            .object({
            countries: intOptArray,
            regions: intOptArray,
            districts: intOptArray,
            localities: intOptArray,
        })
            .partial()
            .optional(),
        mode: z
            .object({
            strictAddress: z.boolean().optional(),
            strictContact: z.boolean().optional(),
        })
            .partial()
            .optional(),
    })
        .partial()
        .optional(),
})
    .strict();
