// src/app/services/owner-restoration-guard.service.service.ts
import { Injectable } from '@angular/core';
import { DiffConfirmService } from './diff-confirm.service';

import {
  ContactType,
  OutdatedContacts,
  OutdatedAddress,
  OutdatedFullName,
  Contact,
  NonTelegram,
  UserDraft,
  PartnerDraft,
  VolunteerDraft,
  OutdatedCoordination,
  HomeDraft,
  OutdatedOfficialName,
  OutdatedUserName,
  OutdatedInstitute,
  OutdatedHomeAddress,
  DraftAddress,
  PersonDraft,
} from '../interfaces/advanced-model';

import {
  normalize,
  isFieldEqual,
  lightNormalize,
} from '../utils/owner-ctrls';


type CheckResult<T> =
  | { ok: true; restoring: T } // continue
  | { ok: false; restoring: null }; // stop

const emptyIds = (): number[] => [];

@Injectable({ providedIn: 'root' })
export class OwnerRestorationGuardService {
  constructor(private diffConfirmService: DiffConfirmService) {}

  // ========== Address ==========

  async checkAddress(
    outdated: OutdatedAddress[],
    draft: DraftAddress,
  ): Promise<CheckResult<number | null>> {
    if (!draft?.countryId) return { ok: true, restoring: null };

    const match = outdated.find(
      (o) =>
        isFieldEqual(draft.countryId, o.country?.id ?? null) &&
        isFieldEqual(draft.regionId, o.region?.id ?? null) &&
        isFieldEqual(draft.districtId, o.district?.id ?? null) &&
        isFieldEqual(draft.localityId, o.locality?.id ?? null),
    );

    if (!match) return { ok: true, restoring: null };

    const fullAddress =
      `${match.country?.name + ' ' || ''}${match.region?.shortName || ''} ${match.district?.shortName || ''} ${match.locality?.shortName || ''}`.trim();

    const confirmed = await this.diffConfirmService.confirmDataCorrectness(
      'address',
      fullAddress,
    );
    if (!confirmed) return { ok: false, restoring: null };

    return { ok: true, restoring: match.id };
  }

  async checkHomeAddress(
    outdated: OutdatedHomeAddress[],
    draft: HomeDraft,
  ): Promise<CheckResult<number | null>> {
    const newA = {
      ...draft.draftAddress,
      postalCode: lightNormalize(draft.postalCode),
      postalName: lightNormalize(draft.postalName),
      postalAddressPart: lightNormalize(draft.postalAddressPart),
    };

    const match = outdated.find(
      (o) =>
        isFieldEqual(newA.countryId, o.country?.id ?? null) &&
        isFieldEqual(newA.regionId, o.region?.id ?? null) &&
        isFieldEqual(newA.districtId, o.district?.id ?? null) &&
        isFieldEqual(newA.localityId, o.locality?.id ?? null) &&
        newA.postalAddressPart === o.postalAddressPart &&
        newA.postalName === o.postalName &&
        newA.postalCode === o.postalCode,
    );

    if (!match) return { ok: true, restoring: null };

    const confirmed = await this.diffConfirmService.confirmDataCorrectness(
      'address',
      match.fullPostalAddress,
    );
    if (!confirmed) return { ok: false, restoring: null };

    return { ok: true, restoring: match.id };
  }

  // ========== Names ==========

  async checkNames(
    outdated: OutdatedFullName[],
    draft: PersonDraft,
  ): Promise<CheckResult<number | null>> {
    const match = outdated.find(
      (n) =>
        normalize(n.firstName) === normalize(draft.firstName) &&
        normalize(n.patronymic) === normalize(draft.patronymic) &&
        normalize(n.lastName) === normalize(draft.lastName),
    );

    if (!match) return { ok: true, restoring: null };

    const fullName =
      `${draft.firstName} ${draft.patronymic || ''} ${draft.lastName || ''}`.trim();
    const confirmed = await this.diffConfirmService.confirmDataCorrectness(
      'names',
      fullName,
    );
    if (!confirmed) return { ok: false, restoring: null };

    return { ok: true, restoring: match.id };
  }

  async checkUserNames(
    outdated: OutdatedUserName[],
    draftUserName: UserDraft['userName'],
  ): Promise<CheckResult<number | null>> {
    const match = outdated.find((u) => u.userName === draftUserName);
    if (!match) return { ok: true, restoring: null };

    const confirmed = await this.diffConfirmService.confirmDataCorrectness(
      'userName',
      draftUserName,
    );
    if (!confirmed) return { ok: false, restoring: null };

    return { ok: true, restoring: match.id };
  }

  async checkOfficialNames(
    outdated: OutdatedOfficialName[],
    draftOfficialName: HomeDraft['officialName'],
  ): Promise<CheckResult<number | null>> {
    const match = outdated.find((o) => o.officialName === draftOfficialName);
    if (!match) return { ok: true, restoring: null };

    const confirmed = await this.diffConfirmService.confirmDataCorrectness(
      'officialName',
      draftOfficialName,
    );
    if (!confirmed) return { ok: false, restoring: null };

    return { ok: true, restoring: match.id };
  }

  // ========== Relations ==========

  async checkCoordinations(
  kind: 'home' | 'partner',
  outdated: OutdatedCoordination[],
  draftIds: HomeDraft['draftCoordinations'] | PartnerDraft['draftCoordinations'],
): Promise<CheckResult<number[]>> {
  const draftSet = new Set(draftIds ?? []);
  const matches = outdated.filter((old) => {
    const oldOtherId = kind === 'home' ? old.partnerId! : old.homeId!;
    return draftSet.has(oldOtherId);
  });

  if (!matches.length) return { ok: true, restoring: emptyIds() };

  const names = matches.map((m) => (kind === 'home' ? m.partnerName! : m.homeName!));
  const contentString = names.join(', ');

  const confirmed = await this.diffConfirmService.confirmDataCorrectness('coordinations', contentString);
  if (!confirmed) return { ok: false, restoring: null };

  return { ok: true, restoring: matches.map((m) => m.id) };
}

async checkInstitutes(
  outdated: OutdatedInstitute[],
  draftInstitutes: VolunteerDraft['draftInstitutes'],
): Promise<CheckResult<number[]>> {
  const norm = (s: string) => s.trim().toLowerCase();

  const draftKeys = new Set(
    (draftInstitutes ?? [])
      .filter(Boolean)
      .map((d) => `${norm(d.instituteName)}|${d.category}`)
  );

  const matches = outdated.filter((old) =>
    draftKeys.has(`${norm(old.instituteName)}|${old.category}`)
  );

  if (!matches.length) return { ok: true, restoring: emptyIds() };

  const contentString = matches.map((m) => m.instituteName).join(', ');

  const confirmed = await this.diffConfirmService.confirmDataCorrectness('institutes', contentString);
  if (!confirmed) return { ok: false, restoring: null };

  return { ok: true, restoring: matches.map((m) => m.id) };
}

// ========== Contacts ==========

async checkContacts(
  contactTypes: NonTelegram[],
  outdated: OutdatedContacts,
  draft: Record<NonTelegram, string[]>,
): Promise<CheckResult<Partial<Record<ContactType, Contact[]>>>> {
  const restoring: Partial<Record<ContactType, Contact[]>> = {};

  for (const type of contactTypes) {
    const draftSet = new Set((draft[type] ?? []).filter(Boolean));
    const oldList = outdated[type] ?? [];

    const matches = oldList.filter((old) => draftSet.has(old.content));
    if (!matches.length) continue;

    const contentString = `${type} ${matches.map((m) => m.content).join(', ')}`;
    const confirmed = await this.diffConfirmService.confirmDataCorrectness('contacts', contentString);
    if (!confirmed) return { ok: false, restoring: null };

    restoring[type] = [...(restoring[type] ?? []), ...matches];
  }

  return { ok: true, restoring };
}



}
