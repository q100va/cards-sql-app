import { FormGroup } from '@angular/forms';
import {
  ConfOwnerDraftByKind,
  RelationPick,
  DraftCommon,
  Home,
  HomeDraft,
  Kind,
  NonTelegram,
  OwnerByKind,
  OwnerDraftByKind,
  Partner,
  Senior,
  User,
  Volunteer,
} from '../interfaces/advanced-model';
import { AddressFilter } from '../interfaces/toponym';
import { completeContact, lightNormalize, normalize } from './owner-ctrls';

// --- Helpers -----------------------------------------------------------------
const get = (form: FormGroup, name: string) => form.get(name)?.value ?? null;

const getInstitutes = (form: FormGroup) =>
  form.get('institutes')!.getRawValue();

const getIds = (form: FormGroup, ctrlName: string) => {
  const v = form.get(ctrlName)!.getRawValue();
  if (v === null) return v;
  return v.map((c: RelationPick) => c.id);
};
const getId = (form: FormGroup, ctrlName: string) => {
  const v = form.get(ctrlName)!.getRawValue();
  console.log('V', v);
  if (v === null) return v;
  return v.id;
};

function first<T>(arr?: T[] | null): T | null {
  return arr?.length ? arr[0] : null;
}

const getAddress = (address: AddressFilter) => ({
  countryId: first(address.countries),
  regionId: first(address.regions),
  districtId: first(address.districts),
  localityId: first(address.localities),
});

const getHomeAddress = (address: AddressFilter): HomeDraft['draftAddress'] => ({
  countryId: address.countries[0],
  regionId: address.regions[0],
  districtId: address.districts[0],
  localityId: address.localities[0],
});

/* function getContacts(form: FormGroup, contactTypes: NonTelegram[]) {
  const draftContacts: Record<NonTelegram, string[]> = {} as Record<
    NonTelegram,
    string[]
  >;
  for (const type of contactTypes) {
    const raw: (string | null)[] =
      (form.get(type) as any)?.getRawValue?.() ?? [];
    draftContacts[type] = (raw as string[])
      .filter(Boolean)
      .map((v) => completeContact(v!, type));
  }
  return draftContacts;
} */

function getContacts(form: FormGroup, contactTypes: NonTelegram[]) {
  const draftContacts = {} as Record<NonTelegram, string[]>;
  for (const type of contactTypes) {
    const ctrl = form.get(type);
    const raw =
      (ctrl as { getRawValue?: () => unknown })?.getRawValue?.() ??
      ctrl?.value ??
      [];
    const arr = Array.isArray(raw) ? raw : [];
    draftContacts[type] = arr
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .map((v) => completeContact(v, type));
  }
  return draftContacts;
}

function mergeDraft<K extends Kind>(
  base: DraftCommon,
  extras: ExtrasByKind[K],
): ConfOwnerDraftByKind[K] {
  return { ...base, ...extras } as ConfOwnerDraftByKind[K];
}

// --- Per-kind config ---------------------------------
type ExtrasByKind = {
  [K in Kind]: Omit<ConfOwnerDraftByKind[K], keyof DraftCommon>;
};

type BuildExtrasFn<K extends Kind> = (
  form: FormGroup,
  userId: number,
  existing: OwnerByKind<K> | null,
  address: AddressFilter,
  contactTypes: NonTelegram[],
  now: Date,
) => ExtrasByKind[K];

type BuildExtrasMap = {
  [K in Kind]: BuildExtrasFn<K>;
};

const BUILD_EXTRAS: BuildExtrasMap = {
  user: (form, _userId, _existing, address, contactTypes) => ({
    firstName: normalize(get(form, 'firstName')),
    patronymic: normalize(get(form, 'patronymic')),
    lastName: normalize(get(form, 'lastName')),
    userName: normalize(get(form, 'userName')),
    password: get(form, 'password'),
    roleId: get(form, 'roleId'),
    draftAddress: getAddress(address),
    draftContacts: getContacts(form, contactTypes),
  }),

  partner: (form, _userId, _existing, address, contactTypes) => ({
    firstName: normalize(get(form, 'firstName')),
    patronymic: normalize(get(form, 'patronymic')),
    lastName: normalize(get(form, 'lastName')),
    affiliation: normalize(get(form, 'affiliation')),
    position: lightNormalize(get(form, 'position')),
    draftCoordinations: getIds(form, 'coordinations'),
    draftAddress: getAddress(address),
    draftContacts: getContacts(form, contactTypes),
  }),

  volunteer: (form, userId, _existing, address, contactTypes) => ({
    firstName: normalize(get(form, 'firstName')),
    patronymic: normalize(get(form, 'patronymic')),
    lastName: normalize(get(form, 'lastName')),
    draftSubscriptions: get(form, 'subscription') ? [userId] : [],
    draftCooperations: [],
    draftInstitutes: getInstitutes(form),
    draftAddress: getAddress(address),
    draftContacts: getContacts(form, contactTypes),
  }),

  home: (form, _userId, existing, address, contactTypes, now) => ({
    homeName: normalize(get(form, 'homeName')),
    officialName: normalize(get(form, 'officialName')),
    postalName: normalize(get(form, 'postalName')),
    draftCoordinations: getIds(form, 'coordinations'),
    infoNote: lightNormalize(get(form, 'infoNote')),
    noAddress: !!get(form, 'noAddress'),
    specialHome: !!get(form, 'specialHome'),
    acceptableForSchool: !!get(form, 'acceptableForSchool'),
    postalCode: normalize(get(form, 'postalCode')),
    postalAddressPart: normalize(get(form, 'postalAddressPart')),
    isClose: !!get(form, 'isClose'),
    dateOfClose: get(form, 'isClose')
      ? existing?.isClose
        ? (existing?.dateOfClose ?? now)
        : now
      : null,
    draftAddress: getHomeAddress(address),
    draftContacts: getContacts(form, contactTypes),
  }),

  senior: (form) => ({
    firstName: normalize(get(form, 'firstName')),
    patronymic: normalize(get(form, 'patronymic')),
    lastName: normalize(get(form, 'lastName')),
    birthDate: get(form, 'birthDate'),
    confirmedFirstName: get(form, 'confirmedFirstName'),
    confirmedPatronymic: get(form, 'confirmedPatronymic'),
    confirmedLastName: get(form, 'confirmedLastName'),
    confirmedBirthDate: get(form, 'confirmedBirthDate'),
    gender: get(form, 'gender'),
    infoNote: lightNormalize(get(form, 'infoNote')),
    photoLink: lightNormalize(get(form, 'photoLink')),
    dateOfConsent: get(form, 'dateOfConsent'),
    personalNoAddr: !!get(form, 'personalNoAddr'),
    kindergarten: lightNormalize(get(form, 'kindergarten')),
    teacher: lightNormalize(get(form, 'teacher')),
    veteran: lightNormalize(get(form, 'veteran')),
    childOfWar: lightNormalize(get(form, 'childOfWar')),
    profession: lightNormalize(get(form, 'profession')),
    honoraryStatus: lightNormalize(get(form, 'honoraryStatus')),
    interests: lightNormalize(get(form, 'interests')),
    orthodoxBeliever: lightNormalize(get(form, 'orthodoxBeliever')),
    dateOfExit: get(form, 'dateOfExit'),
    homeId: getId(form, 'nursingHome'),
    spouseId: getId(form, 'spouse'),
  }),
};

// --- Restriction config -------------------------------------------------------

type RestParams = Pick<
  DraftCommon,
  'isRestricted' | 'causeOfRestriction' | 'dateOfRestriction'
>;

type BuildRestrictedFn<K extends Kind> = (
  form: FormGroup,
  existing: OwnerByKind<K> | null,
  now: Date,
) => RestParams;

type BuildRestrictedMap = {
  [K in Kind]: BuildRestrictedFn<K>;
};

function getRestParams<
  T extends { isRestricted?: boolean; dateOfRestriction?: Date | null },
>(form: FormGroup, existing: T | null, now: Date): RestParams {
  const isRestricted = !!get(form, 'isRestricted');
  return {
    isRestricted,
    causeOfRestriction: isRestricted
      ? (get(form, 'causeOfRestriction') as string | null)
      : null,
    dateOfRestriction: isRestricted
      ? existing?.isRestricted
        ? (existing?.dateOfRestriction ?? now)
        : now
      : null,
  };
}

const BUILD_RESTRICTED: BuildRestrictedMap = {
  user: (form, existing, now) => getRestParams(form, existing, now),
  partner: (form, existing, now) => getRestParams(form, existing, now),
  volunteer: (form, existing, now) => getRestParams(form, existing, now),
  // senior: (form, existing, now) => getRestParams(form, existing, now),

  home: (form, existing, now) => {
    const isClose = !!get(form, 'isClose');
    const isRestricted = isClose ? true : !!get(form, 'isRestricted');

    const causeOfRestriction = isClose
      ? // ? `${get(form, 'causeOfRestriction') ?? ''} CLOSE`.trim()
        get(form, 'causeOfRestriction')
        ? get(form, 'causeOfRestriction')
        : 'CLOSE'
      : isRestricted
        ? (get(form, 'causeOfRestriction') as string | null)
        : null;

    const dateOfRestriction = isRestricted
      ? existing?.isRestricted
        ? (existing?.dateOfRestriction ?? now)
        : now
      : null;

    return { isRestricted, causeOfRestriction, dateOfRestriction };
  },

  senior: (form, existing, now) => {
    const dateOfExit = !!get(form, 'dateOfExit');
    const isRestricted = dateOfExit ? true : !!get(form, 'isRestricted');

    const causeOfRestriction = dateOfExit
      ? // ? `${get(form, 'causeOfRestriction') ?? ''} GONE`.trim()
        get(form, 'causeOfRestriction')
        ? get(form, 'causeOfRestriction')
        : 'GONE'
      : isRestricted
        ? (get(form, 'causeOfRestriction') as string | null)
        : null;

    const dateOfRestriction = isRestricted
      ? existing?.isRestricted
        ? (existing?.dateOfRestriction ?? now)
        : now
      : null;

    return { isRestricted, causeOfRestriction, dateOfRestriction };
  },
};

// --- Unified builder ---------------------------------------------------------
export function buildDraft<K extends Kind>(
  kind: K,
  form: FormGroup,
  address: AddressFilter,
  contactTypes: NonTelegram[],
  existing: OwnerByKind<K> | null,
  userId: number,
): ConfOwnerDraftByKind[K] {
  const now = new Date();

 // const rest = BUILD_RESTRICTED[kind](form, existing, now);

  const rest = getRestParams(form, existing, now);
  const base: DraftCommon = {
    id: existing?.id ?? null,
    comment: lightNormalize(get(form, 'comment')),
    ...rest,
  };

  const extras = BUILD_EXTRAS[kind](
    form,
    userId,
    existing,
    address,
    contactTypes,
    now,
  );

  console.log('base, extras');
  console.log(base, extras);
  return mergeDraft(base, extras);

  /*   const draft: DraftByKind[K] = { ...base, ...extras };
  return draft */
}
