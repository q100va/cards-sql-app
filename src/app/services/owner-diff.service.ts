// src/app/services/user-diff.service.ts
import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { DiffConfirmService } from './diff-confirm.service';

import {
  OutdatedUserName,
  UserContacts,
  UserDraftContacts,
} from '../interfaces/user';

import {
  User,
  UserChangingData,
  UserOutdatingData,
  ContactType,
  UserRestoringData,
  UserDeletingData,
  OutdatedContacts,
  OutdatedAddress,
  OutdatedFullName,
  Contact,
  NonTelegram,
  UserDraft,
  PartnerDraft,
  Partner,
  Volunteer,
  VolunteerDraft,
  OutdatedCoordination,
  Home,
  HomeDraft,
  OutdatedOfficialName,
} from '../interfaces/advanced-model';

import { AddressFilter } from '../interfaces/toponym';
import {
  normalize,
  completeContact,
  isFieldEqual,
  lightNormalize,
} from '../utils/diff';
import { OutdatedHome } from '../interfaces/partner';
import { OutdatedInstitute } from '../interfaces/volunteer';
import { OutdatedHomeAddress } from '@shared/schemas/home.schema';

// utils pure; no DI inside

type Names = {
  firstName: string;
  patronymic: string | null;
  lastName: string;
};

@Injectable({ providedIn: 'root' })
export class OwnerDiffService {
  constructor(
    private diffConfirmService: DiffConfirmService,
    private translateService: TranslateService
  ) {}

  /** Check if user changed restored values and correct them*/
  // Home Address
  async corrHomeAddress(
    restoringAddresses: number[],
    outdatingAddresses: OutdatedHomeAddress[],
    draft: HomeDraft,
    outdatedAddresses: OutdatedHomeAddress[]
  ): Promise<{
    restoring: number[];
    outdating: OutdatedHomeAddress[];
  }> {
    console.log('corrAddress');
    let newA = {
      ...draft.draftAddress,
      postalCode: lightNormalize(draft.postalCode),
      postalName: lightNormalize(draft.postalName),
      postalAddressPart: lightNormalize(draft.postalAddressPart),
    };
    let toRemove: number = 0;
    for (const restoringId of restoringAddresses) {
      const restoringAddr = outdatedAddresses.find((a) => a.id === restoringId);
      if (
        !!restoringAddr &&
        (!isFieldEqual(newA.countryId, restoringAddr.country?.id ?? null) ||
          !isFieldEqual(newA.regionId, restoringAddr.region?.id ?? null) ||
          !isFieldEqual(newA.districtId, restoringAddr.district?.id ?? null) ||
          !isFieldEqual(newA.localityId, restoringAddr.locality?.id ?? null) ||
          newA.postalAddressPart !== restoringAddr.postalAddressPart ||
          newA.postalName !== restoringAddr.postalName ||
          newA.postalCode !== restoringAddr.postalCode)
      ) {
        toRemove = restoringId;
        outdatingAddresses.push(restoringAddr);
        break;
      }
    }
    if (toRemove) {
      restoringAddresses = restoringAddresses.filter((id) => id !== toRemove);
    }
    return { restoring: restoringAddresses, outdating: outdatingAddresses };
  }

  // UserNames

  corrUserNames(
    restoringIds: number[],
    outdating: OutdatedUserName[],
    draftUserName: UserDraft['userName'],
    outdatedAll: OutdatedUserName[]
  ): {
    restoring: number[] | null;
    outdating: OutdatedUserName[];
  } {
    // clone inputs to avoid external mutation
    let nextRestoring = [...restoringIds];
    const nextOutdating = [...outdating];

    const toRemoveId = restoringIds.find((id) => {
      const candidate = outdatedAll.find((x) => x.id === id);
      return candidate && candidate.userName !== draftUserName;
    });

    if (toRemoveId) {
      const toRemove = outdatedAll.find((x) => x.id === toRemoveId);
      if (toRemove) nextOutdating.push(toRemove);
      nextRestoring = nextRestoring.filter((id) => id !== toRemoveId);
    }

    return {
      restoring: nextRestoring.length ? nextRestoring : null,
      outdating: nextOutdating,
    };
  }

  // Official Names

  corrOfficialNames(
    restoringIds: number[],
    outdating: OutdatedOfficialName[],
    draftOfficialName: HomeDraft['officialName'],
    outdatedAll: OutdatedOfficialName[]
  ): {
    restoring: number[] | null;
    outdating: OutdatedOfficialName[];
  } {
    // clone inputs to avoid external mutation
    let nextRestoring = [...restoringIds];
    const nextOutdating = [...outdating];

    const toRemoveId = restoringIds.find((id) => {
      const candidate = outdatedAll.find((x) => x.id === id);
      return candidate && candidate.officialName !== draftOfficialName;
    });

    if (toRemoveId) {
      const toRemove = outdatedAll.find((x) => x.id === toRemoveId);
      if (toRemove) nextOutdating.push(toRemove);
      nextRestoring = nextRestoring.filter((id) => id !== toRemoveId);
    }

    return {
      restoring: nextRestoring.length ? nextRestoring : null,
      outdating: nextOutdating,
    };
  }

  // Coordinations TODO:
  corrCoordinations(
    kind: 'home' | 'partner',
    restoringIds: number[],
    outdating: OutdatedCoordination[],
    draftCoordinations:
      | HomeDraft['draftCoordinations']
      | PartnerDraft['draftCoordinations'],
    outdatedAll: OutdatedCoordination[]
  ): {
    restoring: number[] | null;
    outdating: OutdatedCoordination[];
  } {
    // clone inputs to avoid external mutation
    let nextRestoring = [...restoringIds];
    let nextOutdating = [...outdating];

    const toRemove: number[] = [];
    for (const id of restoringIds) {
      const restoring = outdatedAll.find((c) => c.id === id);
      if (restoring) {
        const checkId =
          kind == 'home' ? restoring.partnerId! : restoring.homeId!;
        if (!draftCoordinations.includes(checkId)) {
          nextOutdating = [...nextOutdating, restoring];
          toRemove.push(id);
        }
      }
    }
    if (toRemove.length) {
      nextRestoring = nextRestoring.filter(
        (nextId) => !toRemove.find((id) => id === nextId)
      );
    }
    return {
      restoring: nextRestoring.length ? nextRestoring : null,
      outdating: nextOutdating,
    };
  }
  // Institutes
  corrInstitutes(
    restoringIds: number[],
    outdating: OutdatedInstitute[],
    draftInstitutes: VolunteerDraft['draftInstitutes'],
    outdatedAll: OutdatedInstitute[]
  ): {
    restoring: number[] | null;
    outdating: OutdatedInstitute[];
  } {
    // clone inputs to avoid external mutation
    let nextRestoring = [...restoringIds];
    let nextOutdating = [...outdating];

    const toRemove: number[] = [];
    for (const id of restoringIds) {
      const restoring = outdatedAll.find((i) => i.id === id);
      const draft = draftInstitutes.find(
        (i) =>
          i.instituteName.trim().toLowerCase() ===
            restoring?.instituteName.toLowerCase() &&
          i.category == restoring?.category
      );

      if (restoring && !draft) {
        nextOutdating = [...nextOutdating, restoring];
        toRemove.push(id);
      }
    }
    if (toRemove.length) {
      nextRestoring = nextRestoring.filter(
        (nextId) => !toRemove.find((id) => id === nextId)
      );
    }
    return {
      restoring: nextRestoring.length ? nextRestoring : null,
      outdating: nextOutdating,
    };
  }

  /** Check if new values have duplicates in outdated data */
  // Address duplicates
  async checkHomeAddress(
    outdatedAddresses: OutdatedHomeAddress[],
    draft: HomeDraft
  ): Promise<{
    restoringId: number | null;
  }> {
    console.log('checkAddress');
    let restoringId: number | null = -1;
    if (outdatedAddresses.length > 0) {
      for (const outAddr of outdatedAddresses) {
        let newA = {
          ...draft.draftAddress,
          postalCode: lightNormalize(draft.postalCode),
          postalName: lightNormalize(draft.postalName),
          postalAddressPart: lightNormalize(draft.postalAddressPart),
        };
        console.log('outAddr', outAddr);
        console.log('draftAddress', newA);
        const isMatch =
          isFieldEqual(newA.countryId, outAddr.country?.id ?? null) &&
          isFieldEqual(newA.regionId, outAddr.region?.id ?? null) &&
          isFieldEqual(newA.districtId, outAddr.district?.id ?? null) &&
          isFieldEqual(newA.localityId, outAddr.locality?.id ?? null) &&
          newA.postalAddressPart == outAddr.postalAddressPart &&
          newA.postalName == outAddr.postalName &&
          newA.postalCode == outAddr.postalCode;
        if (isMatch) {
          const fullAddress = outAddr.fullPostalAddress/* `${outAddr.country?.name + ' ' || ''}${
            outAddr.region?.shortName || ''
          } ${outAddr.district?.shortName || ''} ${
            outAddr.locality?.shortName || ''
          }`.trim() */;
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

  // Official Names duplicates
  async checkOfficialNames(
    outdatedOfficialNames: OutdatedOfficialName[],
    draftOfficialName: HomeDraft['officialName']
  ): Promise<{
    restoringId: number | null;
  }> {
    let restoringId: number | null = -1;
    const dups = outdatedOfficialNames.filter(
      (u) => u.officialName === draftOfficialName
    );
    if (dups.length > 0) {
      const isConfirmed = await this.diffConfirmService.confirmDataCorrectness(
        'officialName',
        draftOfficialName
      );
      if (isConfirmed) {
        restoringId = dups[0].id;
      } else {
        restoringId = null;
      }
    }
    return { restoringId };
  }

  // Coordinations duplicates
  async checkCoordinations(
    kind: 'home' | 'partner',
    outdated: OutdatedCoordination[],
    draftCoordinations:
      | HomeDraft['draftCoordinations']
      | PartnerDraft['draftCoordinations']
  ): Promise<{
    restoring: number[] | null;
  }> {
    let restoring: number[] | null = [];
    const duplicates: { id: number; name: string }[] = [];
    for (const v of draftCoordinations ?? []) {
      if (!v) continue;
      if (Array.isArray(outdated)) {
        for (const old of outdated) {
          const oldId = kind == 'home' ? old.partnerId! : old.homeId!;
          if (oldId === v)
            duplicates.push({
              id: old.id,
              name: kind == 'home' ? old.partnerName! : old.homeName!,
            });
        }
      }
    }
    if (duplicates.length > 0) {
      const contentString = `${duplicates.map((p) => p.name).join(', ')}`;
      const isConfirmed = await this.diffConfirmService.confirmDataCorrectness(
        'coordinations',
        contentString
      );
      if (isConfirmed) {
        restoring = [...restoring, ...duplicates.map((d) => d.id)];
      } else {
        return { restoring: null };
      }
    }
    return { restoring };
  }

  // Institutes duplicates
  async checkInstitutes(
    outdated: OutdatedInstitute[],
    draftInstitutes: VolunteerDraft['draftInstitutes']
  ): Promise<{
    restoring: number[] | null;
  }> {
    let restoring: number[] | null = [];
    const duplicates: { id: number; instituteName: string }[] = [];
    for (const v of draftInstitutes ?? []) {
      if (!v) continue;
      if (Array.isArray(outdated)) {
        for (const old of outdated) {
          if (
            old.instituteName.toLowerCase() ===
              v.instituteName.trim().toLowerCase() &&
            old.category === v.category
          )
            duplicates.push({ id: old.id, instituteName: old.instituteName });
        }
      }
    }
    if (duplicates.length > 0) {
      const contentString = `${duplicates
        .map((i) => i.instituteName)
        .join(', ')}`;
      const isConfirmed = await this.diffConfirmService.confirmDataCorrectness(
        'institutes',
        contentString
      );
      if (isConfirmed) {
        restoring = [...restoring, ...duplicates.map((d) => d.id)];
      } else {
        return { restoring: null };
      }
    }
    return { restoring };
  }

  /** Compare address; return changes + id to move into outdated (if any) */
  async diffHomeAddress(
    existing: Home,
    draft: HomeDraft,
    restoringId: number | null
  ): Promise<{
    changed: boolean;
    changes: HomeDraft['draftAddress'] | null;
    outdatingId: number | null;
    deletingId: number | null;
  }> {
    const oldA = existing.address;
    let newA = {
      ...draft.draftAddress,
      postalCode: lightNormalize(draft.postalCode),
      postalName: lightNormalize(draft.postalName),
      postalAddressPart: lightNormalize(draft.postalAddressPart),
    };
    let changes: HomeDraft['draftAddress'] | null = null;
    console.log('oldA', oldA);
    console.log('newA', newA);
    const changed =
      !isFieldEqual(newA.countryId, oldA.country?.id ?? null) ||
      !isFieldEqual(newA.regionId, oldA.region?.id ?? null) ||
      !isFieldEqual(newA.districtId, oldA.district?.id ?? null) ||
      !isFieldEqual(newA.localityId, oldA.locality?.id ?? null) ||
      newA.postalAddressPart !== oldA.postalAddressPart ||
      newA.postalName !== oldA.postalName ||
      newA.postalCode !== oldA.postalCode;
    console.log('changed', changed);
    let moveToOutdated = false;
    if (changed) {
      if (!restoringId) {
        changes = newA;
      } else {
        const restoringAddr = existing.outdatedData.addresses.find(
          (a) => a.id === restoringId
        ) as OutdatedHomeAddress | undefined;
        if (
          !!restoringAddr &&
          (!isFieldEqual(newA.countryId, restoringAddr.country?.id ?? null) ||
            !isFieldEqual(newA.regionId, restoringAddr.region?.id ?? null) ||
            !isFieldEqual(
              newA.districtId,
              restoringAddr.district?.id ?? null
            ) ||
            !isFieldEqual(
              newA.localityId,
              restoringAddr.locality?.id ?? null
            ) ||
            newA.postalAddressPart !== restoringAddr.postalAddressPart ||
            newA.postalName !== restoringAddr.postalName ||
            newA.postalCode !== restoringAddr.postalCode)
        ) {
          changes = newA;
        }
      }
      if (oldA.id) {
        const oldValue =
          oldA.fullPostalAddress; /* `${oldA.country?.name + ' ' || ''}${
          oldA.region?.shortName || ''
        } ${oldA.district?.shortName || ''} ${
          oldA.locality?.shortName || ''
        }`.trim() */
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

  /** Compare names; return changes + what should be outdated (previous value) */

  //UserName
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
      outdating: changed && moveToOutdated ? existing.userName : null,
    };
  }

  //Official Name
  async diffOfficialName(
    existing: Home,
    draft: HomeDraft
  ): Promise<{
    changed: boolean;
    changes: string | null;
    outdating: string | null;
  }> {
    const changed =
      normalize(existing.officialName) !== normalize(draft.officialName);
    let moveToOutdated = false;
    if (changed) {
      const oldUserName = `${existing.officialName}`.trim();
      moveToOutdated = await this.diffConfirmService.confirmOutdateOrDelete(
        'officialName',
        oldUserName
      );
    }
    return {
      changed: !!changed,
      changes: changed ? draft.officialName : null,
      outdating: changed && moveToOutdated ? existing.officialName : null,
    };
  }

  //Partners
  async diffCoordinations(
    kind: 'home' | 'partner',
    current: Home['coordinations'] | Partner['coordinations'],
    draftIds: HomeDraft['draftCoordinations'],
    restoringIds: number[],
    outdatedAll: OutdatedCoordination[]
  ): Promise<{
    changed: boolean;
    changes: number[] | null;
    outdating: number[] | null;
    deleting: number[] | null;
  }> {
    const outdating: number[] | null = [];
    const deleting: number[] | null = [];
    const changes: number[] | null = [];
    const currentIds =
      current?.map((c) => (kind == 'home' ? c.partnerId : c.homeId)) ?? [];
    console.log('current', currentIds);
    console.log('draftIds', draftIds);

    if (current.length) {
      for (let c of current) {
        const id = kind == 'home' ? c.partnerId : c.homeId;
        if (!draftIds.includes(id)) {
          const moveToOutdated =
            await this.diffConfirmService.confirmOutdateOrDelete(
              'coordination',
              kind == 'home' ? c.partnerName! : c.homeName!
            );
          if (moveToOutdated) outdating.push(c.id);
          else deleting.push(c.id);
        }
      }
    }
    if (draftIds.length) {
      draftIds.forEach(async (id) => {
        const inCurrent = currentIds.includes(id);

        const outdated =
          kind == 'home'
            ? outdatedAll.find((o) => o.partnerId == id)
            : outdatedAll.find((o) => o.homeId == id);
        const inRestoring = outdated
          ? restoringIds.find((r) => r === outdated.id)
          : false;

        if (!inCurrent && !inRestoring) {
          changes.push(id);
        }
      });
    }
    console.log('changes, outdating, deleting');
    console.log(changes, outdating, deleting);

    return {
      changed: !!changes.length || !!outdating.length,
      changes: changes.length ? changes : null,
      outdating: outdating.length ? outdating : null,
      deleting: deleting.length ? deleting : null,
    };
  }

  //Institutes
  async diffInstitutes(
    current: Volunteer['institutes'],
    draft: VolunteerDraft['draftInstitutes'],
    restoringIds: number[],
    outdatedAll: OutdatedInstitute[]
  ): Promise<{
    changed: boolean;
    changes: VolunteerDraft['draftInstitutes'] | null;
    outdating: number[] | null;
    deleting: number[] | null;
  }> {
    const outdating: number[] | null = [];
    const deleting: number[] | null = [];
    const changes: VolunteerDraft['draftInstitutes'] | null = [];

    for (const i of current) {
      const idx = draft.findIndex(
        (v) =>
          v.instituteName.trim().toLowerCase() ==
            i.instituteName.toLowerCase() && v.category == i.category
      );
      if (idx == -1) {
        const moveToOutdated =
          await this.diffConfirmService.confirmOutdateOrDelete(
            'institute',
            i.instituteName
          );
        if (moveToOutdated) {
          outdating.push(i.id);
        } else {
          deleting.push(i.id);
        }
      }
    }

    for (const i of draft) {
      const idx = current.findIndex(
        (v) =>
          v.instituteName.toLowerCase() ==
            i.instituteName.trim().toLowerCase() && v.category == i.category
      );
      console.log('current', current);
      console.log('idx', idx);

      if (idx == -1) {
        const outdated = outdatedAll.find(
          (o) =>
            o.instituteName.toLowerCase() ===
              i.instituteName.trim().toLowerCase() && o.category == i.category
        );
        if (outdated) {
          const restoring = restoringIds.find((i) => i === outdated.id);
          if (!restoring) {
            changes.push(i);
          }
        } else changes.push(i);
      }
    }

    return {
      changed: !!changes.length || !!outdating.length,
      changes: changes.length ? changes : null,
      outdating: outdating.length ? outdating : null,
      deleting: deleting.length ? deleting : null,
    };
  }

  //Subscriptions
  async diffSubs(
    current: Volunteer['subscriptions'],
    draftIds: VolunteerDraft['draftSubscriptions'],
    userId: number
  ): Promise<{
    changed: boolean;
    changes: number[] | null;
    deleting: number[] | null;
  }> {
    const deleting: number[] | null = [];
    const changes: number[] | null = [];
    const currentIds = current?.map((i) => i.userId) ?? [];

    console.log('draftIds', draftIds);
    console.log('currentIds', currentIds);

    if (draftIds.length) {
      if (!currentIds.includes(draftIds[0])) {
        changes.push(draftIds[0]);
      }
    } else {
      const sub = current.find((i) => i.userId == userId);
      if (sub) deleting.push(sub.id);
    }
    /*     if (current.length) {
      current.forEach(async (i) => {
        if (!draftIds.includes(i.id)) {
         deleting.push(i.id);
        }
      });
    }
    if (draftIds.length) {
      draftIds.forEach(async (id) => {
        if (!currentIds.includes(id)) {
          changes.push(id);
        }
      });
    } */

    return {
      changed: !!changes.length || !!deleting.length,
      changes: changes.length ? changes : null,
      deleting: deleting.length ? deleting : null,
    };
  }
}
