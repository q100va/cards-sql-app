/** Check if user changed restored values and correct them*/
import {
  Contact,
  DraftAddress,
  HomeDraft,
  NonTelegram,
  OutdatedAddress,
  OutdatedCoordination,
  OutdatedFullName,
  OutdatedHomeAddress,
  OutdatedInstitute,
  OutdatedOfficialName,
  OutdatedUserName,
  PartnerDraft,
  VolunteerDraft,
} from '../interfaces/advanced-model';
import { isFieldEqual, lightNormalize } from './owner-ctrls';

export type ReconcileResult<TRestoring, TOutdating> = {
  restoring: TRestoring | null;
  outdating: TOutdating;
};

type Names = {
  firstName: string;
  patronymic: string | null;
  lastName: string | null;
};

/* function reconcileRestoringIds<TOutdated extends { id: number }>(
  restoringIds: readonly number[],
  outdating: readonly TOutdated[],
  outdatedAll: readonly TOutdated[],
  shouldRemove: (candidate: TOutdated) => boolean,
): ReconcileResult<number[], TOutdated[]> {
  const nextOutdating = [...outdating];

  const toRemoveId = restoringIds.find((id) => {
    const candidate = outdatedAll.find((x) => x.id === id);
    return candidate ? shouldRemove(candidate) : false;
  });

  if (!toRemoveId) {
    return {
      restoring: [...restoringIds],
      outdating: nextOutdating,
    };
  }

  const removed = outdatedAll.find((x) => x.id === toRemoveId);
  if (removed) nextOutdating.push(removed);

  return {
    restoring: removeId([...restoringIds], toRemoveId),
    outdating: nextOutdating,
  };
} */

function reconcileRestoringIds<TOutdated extends { id: number }>(
  restoringIds: readonly number[],
  outdating: readonly TOutdated[],
  outdatedAll: readonly TOutdated[],
  shouldRemove: (candidate: TOutdated) => boolean,
): ReconcileResult<number[], TOutdated[]> {
  const ids = restoringIds ?? [];
  const nextOutdating = [...(outdating ?? [])];
  if (!ids.length) return { restoring: null, outdating: nextOutdating };

  const pool = outdatedAll ?? [];
  const byId = new Map<number, TOutdated>(pool.map((x) => [x.id, x]));

  const nextRestoring: number[] = [];

  for (const id of ids) {
    const candidate = byId.get(id);
    if (!candidate) continue; // если запись пропала — просто выкинули id
    console.log('candidate', candidate);
    console.log('shouldRemove(candidate)', shouldRemove(candidate));
    if (shouldRemove(candidate)) {
      nextOutdating.push(candidate);
    } else {
      nextRestoring.push(id);
    }
  }

  return {
    restoring: nextRestoring.length ? nextRestoring : null,
    outdating: nextOutdating,
  };
}

// ========== Address ==========
export function reconcileRestoredAddress(
  restoringIds: readonly number[],
  outdating: readonly OutdatedAddress[],
  draftAddr: DraftAddress,
  outdatedAll: readonly OutdatedAddress[],
) {
  return reconcileRestoringIds(
    restoringIds,
    outdating,
    outdatedAll,
    (candidate) =>
      !isFieldEqual(draftAddr.countryId, candidate.country?.id ?? null) ||
      !isFieldEqual(draftAddr.regionId, candidate.region?.id ?? null) ||
      !isFieldEqual(draftAddr.districtId, candidate.district?.id ?? null) ||
      !isFieldEqual(draftAddr.localityId, candidate.locality?.id ?? null),
  );
}
export function reconcileRestoredHomeAddress(
  restoringIds: readonly number[],
  outdating: readonly OutdatedHomeAddress[],
  draft: HomeDraft,
  outdatedAll: readonly OutdatedHomeAddress[],
) {
  return reconcileRestoringIds(
    restoringIds,
    outdating,
    outdatedAll,
    (candidate) => {
      const newA = {
        ...draft.draftAddress,
        postalCode: lightNormalize(draft.postalCode),
        postalName: lightNormalize(draft.postalName),
        postalAddressPart: lightNormalize(draft.postalAddressPart),
      };
      return (
        !isFieldEqual(newA.countryId, candidate.country?.id ?? null) ||
        !isFieldEqual(newA.regionId, candidate.region?.id ?? null) ||
        !isFieldEqual(newA.districtId, candidate.district?.id ?? null) ||
        !isFieldEqual(newA.localityId, candidate.locality?.id ?? null) ||
        newA.postalAddressPart !== candidate.postalAddressPart ||
        newA.postalName !== candidate.postalName ||
        newA.postalCode !== candidate.postalCode
      );
    },
  );
}

// ========== Names ==========
export function reconcileRestoredUserNames(
  restoringIds: readonly number[],
  outdating: readonly OutdatedUserName[],
  draftUserName: string,
  outdatedAll: readonly OutdatedUserName[],
) {
  return reconcileRestoringIds(
    restoringIds,
    outdating,
    outdatedAll,
    (candidate) => candidate.userName !== draftUserName,
  );
}

export function reconcileRestoredNames(
  restoringIds: readonly number[],
  outdating: readonly OutdatedFullName[],
  draftNames: Names,
  outdatedAll: readonly OutdatedFullName[],
) {
  console.log('draftNames', draftNames);
  return reconcileRestoringIds(
    restoringIds,
    outdating,
    outdatedAll,
    (candidate) =>
      candidate.firstName !== draftNames.firstName ||
      candidate.patronymic !== draftNames.patronymic ||
      candidate.lastName !== draftNames.lastName,
  );
}

export function reconcileRestoredOfficialNames(
  restoringIds: readonly number[],
  outdating: readonly OutdatedOfficialName[],
  draftOfficialName: HomeDraft['officialName'],
  outdatedAll: readonly OutdatedOfficialName[],
) {
  return reconcileRestoringIds(
    restoringIds,
    outdating,
    outdatedAll,
    (candidate) => candidate.officialName !== draftOfficialName,
  );
}

// ========== Contacts ==========

export type ContactsByType<T> = Partial<Record<NonTelegram, T[]>>;

export function reconcileRestoredContacts(
  restoring: ContactsByType<Contact>,
  outdating: ContactsByType<Contact>,
  draftContacts: Record<NonTelegram, string[]>,
): ReconcileResult<ContactsByType<Contact>, ContactsByType<Contact>> {
  const nextRestoring: ContactsByType<Contact> = { ...restoring };
  const nextOutdating: ContactsByType<Contact> = { ...outdating };

  const removedTypes: NonTelegram[] = [];

  for (const [type, contacts] of Object.entries(restoring) as [
    NonTelegram,
    Contact[],
  ][]) {
    if (!contacts?.length) continue;

    const ownerContacts = draftContacts[type] ?? [];

    // если у владельца вообще нет контактов этого типа — всё уходит в outdating
    if (ownerContacts.length === 0) {
      nextOutdating[type] = [...(nextOutdating[type] ?? []), ...contacts];
      delete nextRestoring[type];
      removedTypes.push(type);
      continue;
    }

    const toOutdate = contacts.filter(
      (c) => !ownerContacts.includes(c.content),
    );
    if (toOutdate.length === 0) continue;

    nextOutdating[type] = [...(nextOutdating[type] ?? []), ...toOutdate];
    nextRestoring[type] = contacts.filter((c) =>
      ownerContacts.includes(c.content),
    );
    if (nextRestoring[type]?.length === 0) {
      delete nextRestoring[type];
      removedTypes.push(type);
    }
  }

  return { restoring: nextRestoring, outdating: nextOutdating };
}

// ========== Relations ==========
export function reconcileRestoredCoordinations(
  kind: 'home' | 'partner',
  restoringIds: readonly number[],
  outdating: readonly OutdatedCoordination[],
  draftCoordinations:
    | HomeDraft['draftCoordinations']
    | PartnerDraft['draftCoordinations'],
  outdatedAll: readonly OutdatedCoordination[],
): ReconcileResult<number[], OutdatedCoordination[]> {
  const draftSet = new Set<number>(draftCoordinations ?? []);

  return reconcileRestoringIds(
    restoringIds,
    outdating,
    outdatedAll,
    (candidate) => {
      const checkId = kind === 'home' ? candidate.partnerId : candidate.homeId;
      return !(typeof checkId === 'number' && draftSet.has(checkId));
    },
  );
}
const norm = (s: string) => s.trim().toLowerCase();

export function reconcileRestoredInstitutes(
  restoringIds: readonly number[],
  outdating: readonly OutdatedInstitute[],
  draftInstitutes: VolunteerDraft['draftInstitutes'],
  outdatedAll: readonly OutdatedInstitute[],
): ReconcileResult<number[], OutdatedInstitute[]> {
  const draftKeySet = new Set(
    (draftInstitutes ?? []).map(
      (d) => `${norm(d.instituteName)}|${d.category}`,
    ),
  );

  return reconcileRestoringIds(
    restoringIds,
    outdating,
    outdatedAll,
    (candidate) => {
      // candidate может иметь instituteName/category как строки — предполагаю так
      const key = `${norm(candidate.instituteName)}|${candidate.category}`;
      return !draftKeySet.has(key);
    },
  );
}
