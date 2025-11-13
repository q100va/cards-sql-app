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
  Kind,
  NonTelegram,
  PartnerDraft,
  ClientDraft,
  UserDraft,
  DraftCommon,
} from '../interfaces/advanced-model';

import { AddressFilter } from '../interfaces/toponym';
import { normalize, completeContact, isFieldEqual } from '../utils/user-diff';
import { Partner } from '../interfaces/partner';
//import { Client } from '../interfaces/client';

// --- Kind & Draft types ------------------------------------------------------
type OwnerMap = {
  user: User;
  partner: Partner;
  //client: Client;
};

type OwnerDraftMap = {
  user: UserDraft;
  partner: PartnerDraft;
  client: ClientDraft;
};

// --- Helpers -----------------------------------------------------------------
const get = (form: FormGroup, name: string) => form.get(name)?.value ?? null;

function first<T>(arr?: T[] | null): T | null {
  return (arr && arr.length ? arr[0] : null) as T | null;
}

// --- Per-kind config ---------------------------------
const BUILD_EXTRAS = {
  user: (form: FormGroup) => ({
    userName: normalize(get(form, 'userName')),
    password: get(form, 'password'),
    roleId: get(form, 'roleId'),
  }),
  partner: (form: FormGroup) => ({
    affiliation: normalize(get(form, 'affiliation')),
    position: normalize(get(form, 'position')),
  }),
  client: (form: FormGroup) => ({
    displayName: normalize(get(form, 'displayName')), // TODO:
  }),
} as const;

@Injectable({ providedIn: 'root' })
export class OwnerService {
  constructor(
    private diffConfirmService: DiffConfirmService,
    private translateService: TranslateService
  ) {}

  // --- Unified builder ---------------------------------------------------------
  buildDraft<K extends Kind>(
    kind: K,
    form: FormGroup,
    address: AddressFilter,
    contactTypes: NonTelegram[],
    existing: OwnerMap[K] | null
  ): OwnerDraftMap[K] {
    const isRestricted = !!get(form, 'isRestricted');

    const base: DraftCommon = {
      id: existing?.id ?? null,

      firstName: normalize(get(form, 'firstName')),
      patronymic: normalize(get(form, 'patronymic')),
      lastName: normalize(get(form, 'lastName')),
      comment: normalize(get(form, 'comment')),

      isRestricted,
      causeOfRestriction: isRestricted ? get(form, 'causeOfRestriction') : null,
      dateOfRestriction: isRestricted
        ? existing?.isRestricted
          ? existing?.dateOfRestriction ?? new Date()
          : new Date()
        : null,

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
    const extras = (BUILD_EXTRAS as any)[kind](form);

    return { ...base, ...extras } as OwnerDraftMap[K];
  }
}
