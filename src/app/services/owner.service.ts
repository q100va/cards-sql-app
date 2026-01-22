import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { DiffConfirmService } from './diff-confirm.service';

//import { User } from '../interfaces/user';

import {
  UserRestoringData,
  OutdatedContacts,
  OutdatedAddress,
  OutdatedFullName,
  Contact,
  Kind,
  NonTelegram,
  PartnerDraft,
  VolunteerDraft,
  UserDraft,
  DraftCommon,
  OwnerDraft,
  PartnerRestoringData,
  Owner,
  OwnerChangingData,
  User,
  Partner,
  OwnerByKind,
  OwnerDraftByKind,
  VolunteerRestoringData,
  HomeRestoringData,
  PersonDraft,
  Person,
  CoordinationPick,
  Home,
  Volunteer,
} from '../interfaces/advanced-model';

import { AddressFilter } from '../interfaces/toponym';
import {
  normalize,
  completeContact,
  isFieldEqual,
  lightNormalize,
} from '../utils/diff';

// --- Kind & Draft types ------------------------------------------------------

type Names = {
  firstName: string;
  patronymic: string | null;
  lastName: string | null;
};
type RestoringData =
  | UserRestoringData
  | PartnerRestoringData
  | VolunteerRestoringData
  | HomeRestoringData;

// --- Helpers -----------------------------------------------------------------
const get = (form: FormGroup, name: string) => form.get(name)?.value ?? null;
const getInstitutes = (form: FormGroup) =>
  form.get('institutes')!.getRawValue();
const getCoordinations = (form: FormGroup) =>
  form
    .get('coordinations')!
    .getRawValue()
    .map((c: CoordinationPick) => c.id);

function first<T>(arr?: T[] | null): T | null {
  return (arr && arr.length ? arr[0] : null) as T | null;
}

// --- Per-kind config ---------------------------------
const BUILD_EXTRAS = {
  user: (form: FormGroup, _userId: number, _existing_ = null) => ({
    firstName: normalize(get(form, 'firstName')),
    patronymic: normalize(get(form, 'patronymic')),
    lastName: normalize(get(form, 'lastName')),
    userName: normalize(get(form, 'userName')),
    password: get(form, 'password'),
    roleId: get(form, 'roleId'),
  }),
  partner: (form: FormGroup, _userId: number, _existing_ = null) => ({
    firstName: normalize(get(form, 'firstName')),
    patronymic: normalize(get(form, 'patronymic')),
    lastName: normalize(get(form, 'lastName')),
    affiliation: normalize(get(form, 'affiliation')),
    position: lightNormalize(get(form, 'position')),
    draftCoordinations: getCoordinations(form),
  }),
  volunteer: (form: FormGroup, userId: number, _existing = null) => ({
    firstName: normalize(get(form, 'firstName')),
    patronymic: normalize(get(form, 'patronymic')),
    lastName: normalize(get(form, 'lastName')),
    draftSubscriptions: get(form, 'subscription') ? [userId] : [],
    draftCooperations: [],
    draftInstitutes: getInstitutes(form),
  }),
  home: (form: FormGroup, _userId: number, existing: Home | null) => ({
    homeName: normalize(get(form, 'homeName')),
    officialName: normalize(get(form, 'officialName')),
    postalName: normalize(get(form, 'postalName')),
    draftCoordinations: getCoordinations(form),
    infoNote: lightNormalize(get(form, 'infoNote')),
    noAddress: get(form, 'noAddress'),
    specialHome: get(form, 'specialHome'),
    acceptableForSchool: get(form, 'acceptableForSchool'),
    postalCode: normalize(get(form, 'postalCode')),
    postalAddressPart: normalize(get(form, 'postalAddressPart')),
    isClose: get(form, 'isClose'),
    dateOfClose: get(form, 'isClose')
      ? existing?.isClose
        ? existing?.dateOfClose ?? new Date()
        : new Date()
      : null,
  }),
} as const;

const BUILD_RESTRICTED = {
  user: {
    isRestricted: (form: FormGroup, _existing = null) =>
      get(form, 'isRestricted'),
    causeOfRestriction: (form: FormGroup, _existing = null) =>
      get(form, 'isRestricted') ? get(form, 'causeOfRestriction') : null,
    dateOfRestriction: (form: FormGroup, existing: User) =>
      get(form, 'isRestricted')
        ? existing?.isRestricted
          ? existing?.dateOfRestriction ?? new Date()
          : new Date()
        : null,
  },
  partner: {
    isRestricted: (form: FormGroup, _existing = null) =>
      get(form, 'isRestricted'),
    causeOfRestriction: (form: FormGroup, _existing = null) =>
      get(form, 'isRestricted') ? get(form, 'causeOfRestriction') : null,
    dateOfRestriction: (form: FormGroup, existing: Partner) =>
      get(form, 'isRestricted')
        ? existing?.isRestricted
          ? existing?.dateOfRestriction ?? new Date()
          : new Date()
        : null,
  },
  volunteer: {
    isRestricted: (form: FormGroup, _existing = null) =>
      get(form, 'isRestricted'),
    causeOfRestriction: (form: FormGroup, _existing = null) =>
      get(form, 'isRestricted') ? get(form, 'causeOfRestriction') : null,
    dateOfRestriction: (form: FormGroup, existing: Volunteer) =>
      get(form, 'isRestricted')
        ? existing?.isRestricted
          ? existing?.dateOfRestriction ?? new Date()
          : new Date()
        : null,
  },
  home: {
    isRestricted: (form: FormGroup, _existing = null) =>
      get(form, 'isClose') ? true : get(form, 'isRestricted'),
    causeOfRestriction: (form: FormGroup, _existing = null) =>
      get(form, 'isClose')
        ? get(form, 'causeOfRestriction') ?? '' + 'CLOSE'
        : get(form, 'isRestricted')
        ? get(form, 'causeOfRestriction')
        : null,
    dateOfRestriction: (form: FormGroup, existing: Home) =>
      get(form, 'isClose')
        ? existing?.isRestricted
          ? existing?.dateOfRestriction ?? new Date()
          : new Date()
        : get(form, 'isRestricted')
        ? existing?.isRestricted
          ? existing?.dateOfRestriction ?? new Date()
          : new Date()
        : null,
  },
} as const;

@Injectable({ providedIn: 'root' })
export class OwnerService {
  constructor(
    private diffConfirmService: DiffConfirmService,
    private translateService: TranslateService
  ) {}
  //TODO: isRestricted for home: блокировать, если закрыт!

  // --- Unified builder ---------------------------------------------------------
  buildDraft<K extends Kind>(
    kind: K,
    form: FormGroup,
    address: AddressFilter,
    contactTypes: NonTelegram[],
    existing: OwnerByKind<K> | null,
    userId: number
  ): OwnerDraftByKind<K> {
    const isRestricted = !!get(form, 'isRestricted');

    const base: DraftCommon = {
      id: existing?.id ?? null,
      comment: lightNormalize(get(form, 'comment')),
      isRestricted: (BUILD_RESTRICTED as any)[kind].isRestricted(
        form,
        existing
      ),
      causeOfRestriction: (BUILD_RESTRICTED as any)[kind].causeOfRestriction(
        form,
        existing
      ),
      dateOfRestriction: (BUILD_RESTRICTED as any)[kind].dateOfRestriction(
        form,
        existing
      ),

      draftAddress: {
        countryId: first(address.countries),
        regionId: first(address.regions),
        districtId: first(address.districts),
        localityId: first(address.localities),
      },

      draftContacts: {} as Record<NonTelegram, string[]>,
    };

    // fill contacts
    for (const type of contactTypes) {
      const raw: (string | null)[] =
        (form.get(type) as any)?.getRawValue?.() ?? [];
      base.draftContacts[type] = (raw as string[])
        .filter(Boolean)
        .map((v) => completeContact(v!, type));
    }

    // per-kind extras
    const extras = (BUILD_EXTRAS as any)[kind](form, userId, existing);
    console.log('draft');
    console.log({ ...base, ...extras });

    return { ...base, ...extras } as OwnerDraftByKind<K>;
  }
//TODO: corrHomeAddress, checkHomeAddress
  /** Check if user changed restored values and correct them*/
  // Address
  async corrAddress(
    restoringAddresses: number[],
    outdatingAddresses: OutdatedAddress[],
    draftAddr: OwnerDraft['draftAddress'],
    outdatedAddresses: OutdatedAddress[]
  ): Promise<{
    restoring: number[];
    outdating: OutdatedAddress[];
  }> {
    console.log('corrAddress');
    let toRemove: number = 0;
    for (const restoringId of restoringAddresses) {
      const restoring = outdatedAddresses.find((a) => a.id === restoringId);
      if (
        restoring &&
        (!isFieldEqual(draftAddr.countryId, restoring.country?.id ?? null) ||
          !isFieldEqual(draftAddr.regionId, restoring.region?.id ?? null) ||
          !isFieldEqual(draftAddr.districtId, restoring.district?.id ?? null) ||
          !isFieldEqual(draftAddr.localityId, restoring.locality?.id ?? null))
      ) {
        toRemove = restoringId;
        outdatingAddresses.push(restoring);
        break;
      }
    }
    if (toRemove) {
      restoringAddresses = restoringAddresses.filter((id) => id !== toRemove);
    }
    return { restoring: restoringAddresses, outdating: outdatingAddresses };
  }

  // Names
  async corrNames(
    restoringNames: number[],
    outdatingNames: OutdatedFullName[],
    draftNames: Names,
    outdatedNames: OutdatedFullName[]
  ): Promise<{
    restoring: number[];
    outdating: OutdatedFullName[];
  }> {
    let toRemove: number = 0;
    for (const restoringId of restoringNames) {
      const restoring = outdatedNames.find((x) => x.id === restoringId);
      if (
        restoring &&
        (restoring.firstName !== draftNames.firstName ||
          restoring.patronymic !== draftNames.patronymic ||
          restoring.lastName !== draftNames.lastName)
      ) {
        toRemove = restoringId;
        outdatingNames.push(restoring);
        break;
      }
    }
    if (toRemove) {
      restoringNames = restoringNames.filter((id) => id !== toRemove);
    }
    return { restoring: restoringNames, outdating: outdatingNames };
  }
  // Contacts
  async corrContacts(
    restoringContacts: RestoringData['contacts'],
    outdatingContacts: OutdatedContacts,
    draftContacts: Record<NonTelegram, string[]>
  ): Promise<{
    restoring: RestoringData['contacts'];
    outdating: OutdatedContacts;
  }> {
    for (const [type, contacts] of Object.entries(restoringContacts!)) {
      if (!contacts?.length) continue;
      const ownerContacts = draftContacts[type as NonTelegram];
      if (!ownerContacts?.length) {
        outdatingContacts[type as keyof OutdatedContacts] = [
          ...(outdatingContacts[type as keyof OutdatedContacts] || []),
          ...contacts,
        ];
        delete restoringContacts![type as NonTelegram];
        continue;
      }
      const toRemove: Contact[] = [];
      for (const c of contacts) {
        if (!ownerContacts.includes(c.content)) {
          outdatingContacts ??= {};
          outdatingContacts[type as NonTelegram] = [
            ...(outdatingContacts[type as NonTelegram] || []),
            c,
          ];
          toRemove.push(c);
        }
      }
      if (toRemove.length) {
        restoringContacts![type as NonTelegram] = restoringContacts![
          type as NonTelegram
        ]!.filter((c) => !toRemove.find((rc) => rc.id === c.id));
      }
    }
    return { restoring: restoringContacts, outdating: outdatingContacts };
  }

  /** Check if new values have duplicates in outdated data */
  // Address duplicates
  async checkAddress(
    outdatedAddresses: OutdatedAddress[],
    draftAddress: OwnerDraft['draftAddress']
  ): Promise<{
    restoringId: number | null;
  }> {
    console.log('checkAddress');
    let restoringId: number | null = -1;
    if (outdatedAddresses.length > 0 && draftAddress?.countryId) {
      for (const outAddr of outdatedAddresses) {
        console.log('outAddr', outAddr);
        console.log('draftAddress', draftAddress);
        const isMatch =
          isFieldEqual(draftAddress.countryId, outAddr.country?.id ?? null) &&
          isFieldEqual(draftAddress.regionId, outAddr.region?.id ?? null) &&
          isFieldEqual(draftAddress.districtId, outAddr.district?.id ?? null) &&
          isFieldEqual(draftAddress.localityId, outAddr.locality?.id ?? null);
        if (isMatch) {
          const fullAddress = `${outAddr.country?.name + ' ' || ''}${
            outAddr.region?.shortName || ''
          } ${outAddr.district?.shortName || ''} ${
            outAddr.locality?.shortName || ''
          }`.trim();
          const isConfirmed =
            await this.diffConfirmService.confirmDataCorrectness(
              'address',
              fullAddress
            );
          if (isConfirmed) {
            restoringId = outAddr.id;
            break;
          } else {
            restoringId = null;
          }
        }
      }
    }
    return { restoringId };
  }

  // Names duplicates
  async checkNames(
    outdatedNames: OutdatedFullName[],
    draft: PersonDraft
  ): Promise<{
    restoringId: number | null;
  }> {
    let restoringId: number | null = -1;
    const dups = outdatedNames.filter(
      (n) =>
        normalize(n.firstName) === normalize(draft.firstName) &&
        normalize(n.patronymic) === normalize(draft.patronymic) &&
        normalize(n.lastName) === normalize(draft.lastName)
    );
    if (dups.length > 0) {
      const fullName = `${draft.firstName} ${draft.patronymic || ''} ${
        draft.lastName
      }`.trim();
      const isConfirmed = await this.diffConfirmService.confirmDataCorrectness(
        'names',
        fullName
      );
      if (isConfirmed) {
        restoringId = dups[0].id;
      } else {
        restoringId = null;
      }
    }
    return { restoringId };
  }

  // Contacts duplicates
  async checkContacts(
    contactTypes: NonTelegram[],
    outdatedContacts: OutdatedContacts,
    draftContacts: OwnerDraft['draftContacts']
  ): Promise<{
    restoring: RestoringData['contacts'] | null;
  }> {
    let restoring: RestoringData['contacts'] | null = {};

    if (Object.keys(outdatedContacts).length) {
      for (const type of contactTypes) {
        const duplicates: { id: number; content: string }[] = [];
        for (const v of draftContacts[type]) {
          if (!v) continue;
          if (Array.isArray(outdatedContacts[type])) {
            for (const old of outdatedContacts[type]) {
              if (old.content === v)
                duplicates.push({ id: old.id, content: old.content });
            }
          }
        }
        if (duplicates.length > 0) {
          const contentString = `${type} ${duplicates
            .map((c) => c.content)
            .join(', ')}`;
          const isConfirmed =
            await this.diffConfirmService.confirmDataCorrectness(
              'contacts',
              contentString
            );
          if (isConfirmed) {
            restoring ??= {};
            restoring[type] = [...(restoring[type] || []), ...duplicates];
          } else {
            return { restoring: null };
          }
        }
      }
    }
    return { restoring };
  }
  /** Compare names; return changes + what should be outdated (previous value) */
  async diffNames(
    existing: Person,
    draft: PersonDraft
  ): Promise<{
    changed: boolean;
    changes: Partial<
      Pick<PersonDraft, 'firstName' | 'patronymic' | 'lastName'>
    > | null;
    outdating: Names | null;
  }> {
    console.log('diffNames');
    const changes: Partial<
      Pick<PersonDraft, 'firstName' | 'patronymic' | 'lastName'>
    > | null = {};
    const outdating: Partial<
      Pick<PersonDraft, 'firstName' | 'patronymic' | 'lastName'>
    > | null = {};

    const changed =
      normalize(existing.firstName) !== normalize(draft.firstName) ||
      normalize(existing.patronymic) !== normalize(draft.patronymic) ||
      normalize(existing.lastName) !== normalize(draft.lastName);

    if (changed) {
      changes.firstName = draft.firstName;
      changes.patronymic = draft.patronymic ?? null;
      changes.lastName = draft.lastName;

      const oldName = `
      ${existing.firstName ?? ''}
      ${existing.patronymic ?? ''}
      ${existing.lastName ?? ''}`.trim();
      const moveToOutdated =
        await this.diffConfirmService.confirmOutdateOrDelete('names', oldName);
      if (moveToOutdated) {
        outdating.firstName = existing.firstName;
        outdating.patronymic = existing.patronymic ?? null;
        outdating.lastName = existing.lastName;
      }
    }
    return {
      changed: !!changed,
      changes: Object.keys(changes).length
        ? (changes as Partial<
            Pick<PersonDraft, 'firstName' | 'patronymic' | 'lastName'>
          >)
        : null,
      outdating: Object.keys(outdating).length ? (outdating as Names) : null,
    };
  }
  /** Compare address; return changes + id to move into outdated (if any) */
  async diffAddress(
    existing: Owner,
    draft: OwnerDraft,
    restoringId: number | null
  ): Promise<{
    changed: boolean;
    changes: OwnerDraft['draftAddress'] | null;
    outdatingId: number | null;
    deletingId: number | null;
  }> {
    const oldA = existing.address;
    const newA = draft.draftAddress;
    let changes: OwnerDraft['draftAddress'] | null = null;
    console.log('oldA', oldA);
    console.log('newA', newA);
    const changed =
      !isFieldEqual(newA.countryId, oldA.country?.id ?? null) ||
      !isFieldEqual(newA.regionId, oldA.region?.id ?? null) ||
      !isFieldEqual(newA.districtId, oldA.district?.id ?? null) ||
      !isFieldEqual(newA.localityId, oldA.locality?.id ?? null);
    console.log('changed', changed);
    let moveToOutdated = false;
    if (changed) {
      if (!restoringId) {
        changes = newA;
      } else {
        const restoringAddr = existing.outdatedData.addresses.find(
          (a) => a.id === restoringId
        );
        if (
          restoringAddr &&
          (!isFieldEqual(newA.countryId, restoringAddr.country?.id ?? null) ||
            !isFieldEqual(newA.regionId, restoringAddr.region?.id ?? null) ||
            !isFieldEqual(
              newA.districtId,
              restoringAddr.district?.id ?? null
            ) ||
            !isFieldEqual(newA.localityId, restoringAddr.locality?.id ?? null))
        ) {
          changes = newA;
        }
      }
      if (oldA.id) {
        const oldValue = `${oldA.country?.name + ' ' || ''}${
          oldA.region?.shortName || ''
        } ${oldA.district?.shortName || ''} ${
          oldA.locality?.shortName || ''
        }`.trim();
        moveToOutdated = await this.diffConfirmService.confirmOutdateOrDelete(
          'address',
          oldValue
        );
      }
    }
    console.log('oldA.id', oldA.id);
    return {
      changed,
      changes,
      outdatingId: changed && moveToOutdated && oldA.id ? oldA.id : null,
      deletingId: changed && !moveToOutdated && oldA.id ? oldA.id : null,
    };
  }

  /** Compare contacts; return {added, removed} without side effects */
  async diffContacts(
    existing: Owner,
    draft: OwnerDraft,
    contactTypes: NonTelegram[],
    restoringContacts: OutdatedContacts | null
  ): Promise<{
    changes: OwnerChangingData['contacts'];
    outdatingIds: number[] | null;
    deletingIds: number[] | null;
  }> {
    let changes: OwnerChangingData['contacts'] = null;
    let outdatingIds = null;
    let deletingIds = null;

    for (const type of contactTypes) {
      const oldVals = existing.orderedContacts?.[type] ?? [];
      const newVals = draft.draftContacts?.[type] ?? [];
      const restoringVals = restoringContacts?.[type] ?? [];
      for (const v of newVals) {
        const presentIdx = oldVals.findIndex((oc) => oc.content === v) ?? -1;
        if (presentIdx === -1) {
          const restoringIdx =
            restoringVals.findIndex((rc) => rc.content === v) ?? -1;
          if (restoringIdx === -1) {
            changes ??= {};
            changes[type] ??= [];
            changes[type].push(v);
          }
        }
      }
      for (const c of oldVals) {
        const newIdx = newVals.findIndex((nc) => nc === c.content);
        if (newIdx === -1) {
          const moveToOutdated =
            await this.diffConfirmService.confirmOutdateOrDelete(
              'contact',
              `${type} ${c.content}`
            );
          if (moveToOutdated) {
            outdatingIds ??= [];
            outdatingIds.push(c.id);
          } else {
            deletingIds ??= [];
            deletingIds.push(c.id);
          }
        }
      }
    }
    console.log(
      'changes, outdatingIds, deletingIds',
      changes,
      outdatingIds,
      deletingIds
    );
    return {
      changes,
      outdatingIds,
      deletingIds,
    };
  }
}
