// src/app/services/user-diff.service.ts
import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { DiffConfirmService } from './diff-confirm.service';

import {
  User,
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
  UserDraft,
  PartnerDraft,
  Partner,
} from '../interfaces/advanced-model';

import { AddressFilter } from '../interfaces/toponym';
import { normalize, completeContact, isFieldEqual } from '../utils/user-diff';
import { OutdatedHome } from '../interfaces/partner';

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

  /** Check if user changed restored values and correct them*/

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

  corrHomes(
    restoringIds: number[],
    outdating: OutdatedHome[],
    draftHomes: PartnerDraft['draftHomes'],
    outdatedAll: OutdatedHome[]
  ): {
    restoring: number[] | null;
    outdating: OutdatedHome[];
  } {
    // clone inputs to avoid external mutation
    let nextRestoring = [...restoringIds];
    let nextOutdating = [...outdating];

    const toRemove: number[] = [];
    for (const id of restoringIds) {
      const restoring = outdatedAll.find((h) => h.id === id);
      if (restoring && !draftHomes.includes(id)) {
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

  // Homes duplicates
  async checkHomes(
    outdated: OutdatedHome[],
    draftHomes: PartnerDraft['draftHomes']
  ): Promise<{
    restoring: number[] | null;
  }> {
    let restoring: number[] | null = [];
    const duplicates: { id: number; name: string }[] = [];
    for (const v of draftHomes ?? []) {
      if (!v) continue;
      if (Array.isArray(outdated)) {
        for (const old of outdated) {
          if (old.id === v) duplicates.push({ id: old.id, name: old.name });
        }
      }
    }
    if (duplicates.length > 0) {
      const contentString = `${duplicates.map((h) => h.name).join(', ')}`;
      const isConfirmed = await this.diffConfirmService.confirmDataCorrectness(
        'homes',
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

  /** Compare names; return changes + what should be outdated (previous value) */
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

  async diffHomes(
    current: Partner['homes'],
    draftIds: PartnerDraft['draftHomes']
  ): Promise<{
    changed: boolean;
    changes: number[] | null;
    outdating: number[] | null;
  }> {
    const outdating: number[] | null = [];
    const changes: number[] | null = [];
    const currentIds = current?.map((h) => h.id) ?? [];
    if (current.length) {
      current.forEach(async (h) => {
        if (!draftIds.includes(h.id)) {
          const moveToOutdated =
            await this.diffConfirmService.confirmOutdateOrDelete(
              'home',
              h.name
            );
          if (moveToOutdated) outdating.push(h.id);
        }
      });
    }
    if (draftIds.length) {
      draftIds.forEach(async (id) => {
        if (!currentIds.includes(id)) {
          changes.push(id);
        }
      });
    }

    return {
      changed: !!changes.length || !!outdating.length,
      changes: changes.length ? changes : null,
      outdating: outdating.length ? outdating : null,
    };
  }
}
