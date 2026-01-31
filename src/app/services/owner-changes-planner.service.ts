// src/app/services/owner-diff-planner.service.ts
import { Injectable } from '@angular/core';

import {
  Address,
  ContactType,
  Home,
  HomeDraft,
  NonTelegram,
  OutdatedContacts,
  OutdatedCoordination,
  OutdatedHomeAddress,
  OutdatedInstitute,
  Partner,
  PartnerDraft,
  Person,
  PersonDraft,
  DraftAddress,
  User,
  UserDraft,
  Volunteer,
  VolunteerDraft,
  HomeCoordination,
} from '../interfaces/advanced-model';

import { DiffConfirmService } from './diff-confirm.service';
import { isFieldEqual, lightNormalize, normalize } from '../utils/owner-ctrls'; // <-- поправь путь под себя

// -----------------------------------------------------------------------------
// Common contracts
// -----------------------------------------------------------------------------

export type Id = number;

export type DiffSet<
  TChanges,
  TOutdating = Id[] | null,
  TDeleting = Id[] | null,
> = {
  changes: TChanges | null;
  outdating: TOutdating;
  deleting: TDeleting;
};

export type AddressDiff = {
  changes: DraftAddress | null;
  outdatingId: number | null;
  deletingId: number | null;
};

export type HomeAddressDiff = {
  changes: HomeDraft['draftAddress'] | null;
  outdatingId: number | null;
  deletingId: number | null;
};

export type Names = Pick<PersonDraft, 'firstName' | 'patronymic' | 'lastName'>;

export type NamesDiff = {
  changes: Names | null;
  outdating: Names | null;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const uniq = (arr: number[]) => Array.from(new Set(arr));

function instituteKey(v: { instituteName: string; category: string }): string {
  return `${v.instituteName.trim().toLowerCase()}::${v.category}`;
}

function homeCoordinationTargetId(
  kind: 'home' | 'partner',
  c: OutdatedCoordination,
): number | null {
  return kind === 'home' ? (c.partnerId ?? null) : (c.homeId ?? null);
}

function currentCoordinationTargetId(
  kind: 'home' | 'partner',
  c: HomeCoordination,
): number {
  return kind === 'home' ? c.partnerId : c.homeId;
}

function buildHomeAddressComparable(draft: HomeDraft) {
  return {
    ...draft.draftAddress,
    postalCode: lightNormalize(draft.postalCode),
    postalName: lightNormalize(draft.postalName),
    postalAddressPart: lightNormalize(draft.postalAddressPart),
  };
}

function isSameHomeAddress(
  a: {
    postalCode: string | null;
    postalName: string | null;
    postalAddressPart: string | null;
    countryId: number;
    regionId: number;
    districtId: number;
    localityId: number;
  },
  b: {
    country: {
      id: number;
      name: string;
    };
    region: {
      id: number;
      shortName: string;
    };
    district: {
      id: number;
      shortName: string;
    };
    locality: {
      id: number;
      shortName: string;
    };
    postalCode: string;
    postalName: string;
    postalAddressPart: string | null;
  },
) {
  return (
    isFieldEqual(a.countryId, b.country?.id ?? null) &&
    isFieldEqual(a.regionId, b.region?.id ?? null) &&
    isFieldEqual(a.districtId, b.district?.id ?? null) &&
    isFieldEqual(a.localityId, b.locality?.id ?? null) &&
    (a.postalAddressPart ?? null) === (b.postalAddressPart ?? null) &&
    a.postalName === b.postalName &&
    a.postalCode === b.postalCode
  );
}

// -----------------------------------------------------------------------------
// Service
// -----------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class OwnerChangesPlannerService {
  constructor(private readonly diffConfirm: DiffConfirmService) {}

  // ---------------------------------------------------------------------------
  // Address (user/partner/volunteer)
  // ---------------------------------------------------------------------------

  /** Compare address; return changes + id to move into outdated (if any) */
  async diffAddress(
    existing: {
      address: Address;
      outdatedData: { addresses: { id: number }[] };
    },
    draft: { draftAddress: DraftAddress },
    restoringId: number | null,
  ): Promise<AddressDiff> {
    const oldA = existing.address;
    const newA = draft.draftAddress;

    const changed =
      !isFieldEqual(newA.countryId, oldA.country?.id ?? null) ||
      !isFieldEqual(newA.regionId, oldA.region?.id ?? null) ||
      !isFieldEqual(newA.districtId, oldA.district?.id ?? null) ||
      !isFieldEqual(newA.localityId, oldA.locality?.id ?? null);

    let changes: DraftAddress | null = null;

    if (changed) {
      if (!restoringId) {
        changes = newA;
      } else {
        const restoringAddr = existing.outdatedData.addresses.find(
          (a) => a.id === restoringId,
        ) as any;
        if (
          restoringAddr &&
          (!isFieldEqual(newA.countryId, restoringAddr.country?.id ?? null) ||
            !isFieldEqual(newA.regionId, restoringAddr.region?.id ?? null) ||
            !isFieldEqual(
              newA.districtId,
              restoringAddr.district?.id ?? null,
            ) ||
            !isFieldEqual(newA.localityId, restoringAddr.locality?.id ?? null))
        ) {
          changes = newA;
        }
      }
    }

    let outdatingId: number | null = null;
    let deletingId: number | null = null;

    if (changed && oldA.id) {
      const oldValue =
        `${oldA.country?.name + ' ' || ''}${oldA.region?.shortName || ''} ${
          oldA.district?.shortName || ''
        } ${oldA.locality?.shortName || ''}`.trim();

      const moveToOutdated = await this.diffConfirm.confirmOutdateOrDelete(
        'address',
        oldValue,
      );
      outdatingId = moveToOutdated ? oldA.id : null;
      deletingId = moveToOutdated ? null : oldA.id;
    }

    return { changes, outdatingId, deletingId };
  }

  // ---------------------------------------------------------------------------
  // Home address
  // ---------------------------------------------------------------------------

  async diffHomeAddress(
    existing: Home,
    draft: HomeDraft,
    restoringId: number | null,
  ): Promise<HomeAddressDiff> {
    const oldA = existing.address;
    const newA = buildHomeAddressComparable(draft);

    const changed =
      !isFieldEqual(newA.countryId, oldA.country?.id ?? null) ||
      !isFieldEqual(newA.regionId, oldA.region?.id ?? null) ||
      !isFieldEqual(newA.districtId, oldA.district?.id ?? null) ||
      !isFieldEqual(newA.localityId, oldA.locality?.id ?? null) ||
      (newA.postalAddressPart ?? null) !== (oldA.postalAddressPart ?? null) ||
      (newA.postalName ?? null) !== (oldA.postalName ?? null) ||
      (newA.postalCode ?? null) !== (oldA.postalCode ?? null);

    let changes: HomeDraft['draftAddress'] | null = null;

    if (changed) {
      if (!restoringId) {
        changes = newA as HomeDraft['draftAddress'];
      } else {
        const restoringAddr = existing.outdatedData.addresses.find(
          (a) => a.id === restoringId,
        ) as OutdatedHomeAddress | undefined;

        if (restoringAddr && !isSameHomeAddress(newA, restoringAddr)) {
          changes = newA as HomeDraft['draftAddress'];
        }
      }
    }

    let outdatingId: number | null = null;
    let deletingId: number | null = null;

    if (changed && oldA.id) {
      const oldValue = oldA.fullPostalAddress;
      const moveToOutdated = await this.diffConfirm.confirmOutdateOrDelete(
        'address',
        oldValue,
      );
      outdatingId = moveToOutdated ? oldA.id : null;
      deletingId = moveToOutdated ? null : oldA.id;
    }

    return { changes, outdatingId, deletingId };
  }

  // ---------------------------------------------------------------------------
  // Names (Person)
  // ---------------------------------------------------------------------------

  async diffNames(existing: Person, draft: PersonDraft): Promise<NamesDiff> {
    const changed =
      normalize(existing.firstName) !== normalize(draft.firstName) ||
      normalize(existing.patronymic) !== normalize(draft.patronymic) ||
      normalize(existing.lastName) !== normalize(draft.lastName);

    if (!changed) return { changes: null, outdating: null };

    const changes: Names = {
      firstName: draft.firstName,
      patronymic: draft.patronymic ?? null,
      lastName: draft.lastName ?? null,
    };

    const oldName =
      `${existing.firstName ?? ''} ${existing.patronymic ?? ''} ${existing.lastName ?? ''}`.trim();
    const moveToOutdated = await this.diffConfirm.confirmOutdateOrDelete(
      'names',
      oldName,
    );

    const outdating: Names | null = moveToOutdated
      ? {
          firstName: existing.firstName,
          patronymic: existing.patronymic ?? null,
          lastName: existing.lastName ?? null,
        }
      : null;

    return { changes, outdating };
  }

  // ---------------------------------------------------------------------------
  // UserName / OfficialName
  // ---------------------------------------------------------------------------

  async diffUserName(
    existing: User,
    draft: UserDraft,
  ): Promise<{
    changes: { userName: string } | null;
    outdating: string | null;
  }> {
    const changed = normalize(existing.userName) !== normalize(draft.userName);
    if (!changed) return { changes: null, outdating: null };

    const oldValue = `${existing.userName}`.trim();
    const moveToOutdated = await this.diffConfirm.confirmOutdateOrDelete(
      'userName',
      oldValue,
    );

    return {
      changes: { userName: draft.userName },
      outdating: moveToOutdated ? existing.userName : null,
    };
  }

  async diffOfficialName(
    existing: Home,
    draft: HomeDraft,
  ): Promise<{
    changes: { officialName: string } | null;
    outdating: string | null;
  }> {
    const changed =
      normalize(existing.officialName) !== normalize(draft.officialName);
    if (!changed) return { changes: null, outdating: null };

    const oldValue = `${existing.officialName}`.trim();
    const moveToOutdated = await this.diffConfirm.confirmOutdateOrDelete(
      'officialName',
      oldValue,
    );

    return {
      changes: { officialName: draft.officialName },
      outdating: moveToOutdated ? existing.officialName : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Contacts (User/Partner/Volunteer)
  // ---------------------------------------------------------------------------

  async diffContacts(
    existing: User | Partner | Volunteer | Home,
    draft: UserDraft | PartnerDraft | VolunteerDraft | HomeDraft,
    contactTypes: NonTelegram[],
    restoringContacts: OutdatedContacts | null,
  ): Promise<{
    changes: Partial<Record<ContactType, string[]>> | null;
    outdatingIds: number[] | null;
    deletingIds: number[] | null;
  }> {
    let changes: Partial<Record<ContactType, string[]>> | null = null;
    let outdatingIds: number[] | null = null;
    let deletingIds: number[] | null = null;

    for (const type of contactTypes) {
      const oldVals = existing.orderedContacts?.[type] ?? [];
      const newVals = (draft as any).draftContacts?.[type] ?? [];
      const restoringVals = restoringContacts?.[type] ?? [];

      // added
      for (const v of newVals) {
        const inCurrent = oldVals.some((oc) => oc.content === v);
        if (inCurrent) continue;

        const inRestoring = restoringVals.some((rc) => rc.content === v);
        if (inRestoring) continue;

        changes ??= {};
        changes[type] ??= [];
        changes[type]!.push(v);
      }

      // removed
      for (const c of oldVals) {
        const stillThere = newVals.includes(c.content);
        if (stillThere) continue;

        const moveToOutdated = await this.diffConfirm.confirmOutdateOrDelete(
          'contact',
          `${type} ${c.content}`,
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

    return {
      changes,
      outdatingIds: outdatingIds ? uniq(outdatingIds) : null,
      deletingIds: deletingIds ? uniq(deletingIds) : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Coordinations (Home/Partner)
  // ---------------------------------------------------------------------------

  async diffCoordinations(
    kind: 'home' | 'partner',
    current: Home['coordinations'] | Partner['coordinations'],
    draftIds:
      | HomeDraft['draftCoordinations']
      | PartnerDraft['draftCoordinations'],
    restoringIds: number[] | null,
    outdatedAll: OutdatedCoordination[],
  ): Promise<DiffSet<number[]>> {
    const outdating: number[] = [];
    const deleting: number[] = [];
    const changes: number[] = [];

    const currentTargetIds = (current ?? []).map((c) =>
      currentCoordinationTargetId(kind, c),
    );

    // removals from current
    for (const c of current ?? []) {
      const targetId = currentCoordinationTargetId(kind, c);
      if (draftIds.includes(targetId)) continue;

      const label =
        kind === 'home' ? (c.partnerName ?? '') : (c.homeName ?? '');
      const moveToOutdated = await this.diffConfirm.confirmOutdateOrDelete(
        'coordination',
        label,
      );

      if (moveToOutdated) outdating.push(c.id);
      else deleting.push(c.id);
    }

    // additions (draft -> current/restoring)
    for (const targetId of draftIds ?? []) {
      if (currentTargetIds.includes(targetId)) continue;

      const outdated = outdatedAll.find(
        (o) => homeCoordinationTargetId(kind, o) === targetId,
      );
      const inRestoring = outdated
        ? (restoringIds ?? []).includes(outdated.id)
        : false;
      if (!inRestoring) changes.push(targetId);
    }

    return {
      changes: changes.length ? uniq(changes) : null,
      outdating: outdating.length ? uniq(outdating) : null,
      deleting: deleting.length ? uniq(deleting) : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Institutes (Volunteer)
  // ---------------------------------------------------------------------------

  async diffInstitutes(
    current: Volunteer['institutes'],
    draft: VolunteerDraft['draftInstitutes'],
    restoringIds: number[] | null,
    outdatedAll: OutdatedInstitute[],
  ): Promise<DiffSet<VolunteerDraft['draftInstitutes']>> {
    const outdating: number[] = [];
    const deleting: number[] = [];
    const changes: VolunteerDraft['draftInstitutes'] = [];

    const currentKeys = new Set(
      (current ?? []).map((i) =>
        instituteKey({ instituteName: i.instituteName, category: i.category }),
      ),
    );

    const draftKeys = new Set((draft ?? []).map((i) => instituteKey(i)));

    // removals from current
    for (const i of current ?? []) {
      const key = instituteKey({
        instituteName: i.instituteName,
        category: i.category,
      });
      if (draftKeys.has(key)) continue;

      const moveToOutdated = await this.diffConfirm.confirmOutdateOrDelete(
        'institute',
        i.instituteName,
      );
      if (moveToOutdated) outdating.push(i.id);
      else deleting.push(i.id);
    }

    // additions from draft
    for (const i of draft ?? []) {
      const key = instituteKey(i);
      if (currentKeys.has(key)) continue;

      const outdated = outdatedAll.find(
        (o) =>
          instituteKey({
            instituteName: o.instituteName,
            category: o.category,
          }) === key,
      );
      const inRestoring = outdated
        ? (restoringIds ?? []).includes(outdated.id)
        : false;

      if (!inRestoring) changes.push(i);
    }

    return {
      changes: changes.length ? changes : null,
      outdating: outdating.length ? uniq(outdating) : null,
      deleting: deleting.length ? uniq(deleting) : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Subscriptions (Volunteer) — твоя модель: draftSubscriptions либо [userId], либо []
  // ---------------------------------------------------------------------------

  async diffSubs(
    current: Volunteer['subscriptions'],
    draftIds: VolunteerDraft['draftSubscriptions'],
    userId: number,
  ): Promise<DiffSet<number[], null>> {
    const deleting: number[] = [];
    const changes: number[] = [];

    const currentUserIds = (current ?? []).map((s) => s.userId);

    // add
    if (draftIds?.length) {
      const wantUserId = draftIds[0];
      if (!currentUserIds.includes(wantUserId)) changes.push(wantUserId);
    } else {
      // remove
      const sub = (current ?? []).find((s) => s.userId === userId);
      if (sub) deleting.push(sub.id);
    }

    return {
      changes: changes.length ? changes : null,
      outdating: null, // subscriptions не outdate’им (по твоей логике)
      deleting: deleting.length ? deleting : null,
    };
  }
}
