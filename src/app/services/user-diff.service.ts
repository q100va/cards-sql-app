// src/app/services/user-diff.service.ts
import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { DiffConfirmService } from './diff-confirm.service';

import {
  User,
  UserDraft,
  OutdatedUserName,
  UserChangingData,
  UserOutdatingData,
  UserContacts,
  UserDraftContacts,
} from '../interfaces/user';

import {
  ContactType,
  UserRestoringData,
  UserDeletingData,
  OutdatedContacts,
  OutdatedAddress,
  OutdatedFullName,
  Contact,
  NonTelegram,
} from '../interfaces/advanced-model';

import { AddressFilter } from '../interfaces/toponym';
import { normalize, completeContact, isFieldEqual } from '../utils/user-diff';

// utils pure; no DI inside




type Names = {
  firstName: string;
  patronymic: string | null;
  lastName: string;
};

@Injectable({ providedIn: 'root' })
export class UserDiffService {
  constructor(
    private diffConfirmService: DiffConfirmService,
    private translateService: TranslateService
  ) {}

  /** Build UserDraft from form + address filter + existing user id */
  buildDraft(
    form: FormGroup,
    address: AddressFilter,
    contactTypes: NonTelegram[],
    existing: User | null
  ): UserDraft {
    const get = (name: string) => form.get(name)?.value ?? null;

    const draft: UserDraft = {
      id: existing?.id ?? null,
      userName: normalize(get('userName')),
      firstName: normalize(get('firstName')),
      patronymic: normalize(get('patronymic')) || null,
      lastName: normalize(get('lastName')),
      password: get('password'),
      roleId: get('roleId'),
      comment: get('comment'),
      isRestricted: !!get('isRestricted'),
      causeOfRestriction: get('isRestricted')
        ? get('causeOfRestriction')
        : null,
      dateOfRestriction: get('isRestricted')
        ? existing?.isRestricted
          ? existing?.dateOfRestriction ?? new Date()
          : new Date()
        : null,

      draftAddress: {
        countryId: address.countries?.[0] ?? null,
        regionId: address.regions?.[0] ?? null,
        districtId: address.districts?.[0] ?? null,
        localityId: address.localities?.[0] ?? null,
      },

      // fill contacts later via fillDraftContacts
      draftContacts: {} as Record<NonTelegram, string[]>,
    };
    for (const type of contactTypes) {
      const raw: (string | null)[] = form.get(type)?.getRawValue?.() ?? [];
      draft.draftContacts[type] = raw
        .filter(Boolean)
        .map((v) => completeContact(v as string, type));
    }

    return draft;
  }

  /** Check if user changed restored values and correct them*/
  // Address
  async corrAddress(
    restoringAddresses: number[],
    outdatingAddresses: OutdatedAddress[],
    draftAddr: UserDraft['draftAddress'],
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

  // UserNames
  async corrUserNames(
    restoringUserNames: number[],
    outdatingUserNames: OutdatedUserName[],
    draftUserName: UserDraft['userName'],
    outdatedUserNames: OutdatedUserName[]
  ): Promise<{
    restoring: number[];
    outdating: OutdatedUserName[];
  }> {
    let toRemove: number = 0;
    for (const restoringId of restoringUserNames) {
      const restoring = outdatedUserNames.find((x) => x.id === restoringId);
      if (restoring && restoring.userName !== draftUserName) {
        toRemove = restoringId;
        outdatingUserNames.push(restoring);
        break;
      }
    }
    if (toRemove) {
      restoringUserNames = restoringUserNames.filter((id) => id !== toRemove);
    }
    return { restoring: restoringUserNames, outdating: outdatingUserNames };
  }

  // Contacts
  async corrContacts(
    restoringContacts: RestoringData['contacts'],
    outdatingContacts: OutdatedContacts,
    draftContacts: UserDraft['draftContacts']
  ): Promise<{
    restoring: RestoringData['contacts'];
    outdating: OutdatedContacts;
  }> {
    for (const [type, contacts] of Object.entries(restoringContacts!)) {
      if (!contacts?.length) continue;
      const userContacts = draftContacts[type as keyof DraftContacts];
      if (!userContacts?.length) {
        outdatingContacts[type as keyof OutdatedContacts] = [
          ...(outdatingContacts[type as keyof OutdatedContacts] || []),
          ...contacts,
        ];
        delete restoringContacts![type as keyof DraftContacts];
        continue;
      }
      const toRemove: Contact[] = [];
      for (const c of contacts) {
        if (!userContacts.includes(c.content)) {
          outdatingContacts ??= {};
          outdatingContacts[type as keyof Contacts] = [
            ...(outdatingContacts[type as keyof Contacts] || []),
            c,
          ];
          toRemove.push(c);
        }
      }
      if (toRemove.length) {
        restoringContacts![type as keyof DraftContacts] = restoringContacts![
          type as keyof DraftContacts
        ]!.filter((c) => !toRemove.find((rc) => rc.id === c.id));
      }
    }
    return { restoring: restoringContacts, outdating: outdatingContacts };
  }

  /** Check if new values have duplicates in outdated data */
  // Address duplicates
  async checkAddress(
    outdatedAddresses: OutdatedAddress[],
    draftAddress: UserDraft['draftAddress']
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
    draft: UserDraft
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

  // UserNames duplicates
  async checkUserNames(
    outdatedUserNames: OutdatedUserName[],
    draftUserName: UserDraft['userName']
  ): Promise<{
    restoringId: number | null;
  }> {
    let restoringId: number | null = -1;
    const dups = outdatedUserNames.filter((u) => u.userName === draftUserName);
    if (dups.length > 0) {
      const isConfirmed = await this.diffConfirmService.confirmDataCorrectness(
        'userName',
        draftUserName
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
    draftContacts: UserDraft['draftContacts']
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
    existing: User,
    draft: UserDraft
  ): Promise<{
    changed: boolean;
    changes: Names | null;
    outdating: Names | null;
  }> {
    console.log('diffNames');
    const changes: Partial<
      Pick<UserDraft, 'firstName' | 'patronymic' | 'lastName'>
    > | null = {};
    const outdating: Partial<
      Pick<UserDraft, 'firstName' | 'patronymic' | 'lastName'>
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
      changes: Object.keys(changes).length ? (changes as Names) : null,
      outdating: Object.keys(outdating).length ? (outdating as Names) : null,
    };
  }

  async diffUserName(
    existing: User,
    draft: UserDraft
  ): Promise<{
    changed: boolean;
    changes: string | null;
    outdating: string | null;
  }> {
    const changed = normalize(existing.userName) !== normalize(draft.userName);
    let moveToOutdated = false;
    if (changed) {
      const oldUserName = `${existing.userName}`.trim();
      moveToOutdated = await this.diffConfirmService.confirmOutdateOrDelete(
        'userName',
        oldUserName
      );
    }
    return {
      changed: !!changed,
      changes: changed ? draft.userName : null,
      outdating: moveToOutdated ? existing.userName : null,
    };
  }

  /** Compare address; return changes + id to move into outdated (if any) */
  async diffAddress(
    existing: User,
    draft: UserDraft,
    restoringId: number | null
  ): Promise<{
    changed: boolean;
    changes: UserDraft['draftAddress'] | null;
    outdatingId: number | null;
    deletingId: number | null;
  }> {
    const oldA = existing.address;
    const newA = draft.draftAddress;
    let changes: UserDraft['draftAddress'] | null = null;

    const changed =
      !isFieldEqual(newA.countryId, oldA.country?.id ?? null) ||
      !isFieldEqual(newA.regionId, oldA.region?.id ?? null) ||
      !isFieldEqual(newA.districtId, oldA.district?.id ?? null) ||
      !isFieldEqual(newA.localityId, oldA.locality?.id ?? null);
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
      outdatingId: moveToOutdated && oldA.id ? oldA.id : null,
      deletingId: !moveToOutdated && oldA.id ? oldA.id : null,
    };
  }

  /** Compare contacts; return {added, removed} without side effects */
  async diffContacts(
    existing: User,
    draft: UserDraft,
    contactTypes: NonTelegram[],
    restoringContacts: OutdatedContacts | null
  ): Promise<{
    changes: ChangingData['contacts'];
    outdatingIds: number[] | null;
    deletingIds: number[] | null;
  }> {
    let changes: ChangingData['contacts'] = null;
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
    return {
      changes,
      outdatingIds,
      deletingIds,
    };
  }
}
