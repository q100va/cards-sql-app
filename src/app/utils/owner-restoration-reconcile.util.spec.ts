import { INSTITUTE_CATEGORY } from '../../../shared/constants/volunteers';
import { PARTNER_AFFILIATION } from '../../../shared/constants/partners';
import type { HomeDraft, NonTelegram, OutdatedAddress, OutdatedHomeAddress, SeniorDraft } from '../interfaces/advanced-model';
import {
  reconcileOwnerRestoration,
  reconcileRestoredAddress, reconcileRestoredContacts, reconcileRestoredCoordinations,
  reconcileRestoredHomeAddress, reconcileRestoredInstitutes, reconcileRestoredNames,
  reconcileRestoredOfficialNames, reconcileRestoredUserNames,
} from './owner-restoration-reconcile.util';
import type { OwnerRestorationInput, OwnerRestorationResult } from './owner-restoration-reconcile.util';

const names = { firstName: 'Anna', patronymic: null, lastName: 'Petrova' };
const historicalName = { id: 81, ...names };
const address: OutdatedAddress = {
  id: 82, country: { id: 143, name: 'Country' }, region: { id: 20, shortName: 'Region' },
  district: { id: 30, shortName: 'District' }, locality: { id: 40, shortName: 'Locality' }, isRecoverable: true,
};
const geographicDraft = { countryId: 143, regionId: 20, districtId: 30, localityId: 40 };
const homeAddress: OutdatedHomeAddress = {
  ...address, region: { id: 20, shortName: 'Region' }, district: { id: 30, shortName: 'District' },
  locality: { id: 40, shortName: 'Locality' }, postalCode: '123456', postalName: 'Home',
  postalAddressPart: null, fullPostalAddress: '123456 Country, Home',
};

function contactsDraft(overrides: Partial<Record<NonTelegram, string[]>> = {}): Record<NonTelegram, string[]> {
  return {
    email: [], phoneNumber: [], telegramId: [], telegramPhoneNumber: [], telegramNickname: [],
    whatsApp: [], vKontakte: [], instagram: [], facebook: [], website: [], otherContact: [], ...overrides,
  };
}

function homeDraft(overrides: Partial<HomeDraft> = {}): HomeDraft {
  return {
    id: 10, comment: null, isRestricted: false, causeOfRestriction: null, dateOfRestriction: null,
    homeName: 'Home', officialName: 'Official Home', postalName: 'Home', postalCode: '123456',
    postalAddressPart: null, draftAddress: { ...geographicDraft }, draftContacts: contactsDraft(),
    draftCoordinations: [], noAddress: false, specialHome: false, acceptableForSchool: true,
    infoNote: null, isClose: false, dateOfClose: null, ...overrides,
  };
}

describe('owner restoration comparison contracts', () => {
  for (const scenario of [
    { label: 'retain an exact person name', draft: names, selected: [81], expected: [81], returned: [] },
    { label: 'cancel a whitespace-edited person name without trimming it', draft: { ...names, firstName: ' Anna ' }, selected: [81], expected: null, returned: [historicalName] },
    { label: 'distinguish an empty patronymic from null', draft: { ...names, patronymic: '' }, selected: [81], expected: null, returned: [historicalName] },
    { label: 'drop a selected ID missing from persisted history', draft: names, selected: [999], expected: null, returned: [] },
  ]) {
    it(scenario.label, () => {
      const input = { selected: scenario.selected, history: [], draft: scenario.draft, persisted: [historicalName] };
      const before = structuredClone(input);
      expect(reconcileRestoredNames(input.selected, input.history, input.draft, input.persisted)).toEqual({
        restoring: scenario.expected, outdating: scenario.returned,
      });
      expect(input).toEqual(before);
    });
  }

  it('uses exact username equality and returns an edited selection to existing history', () => {
    const selected = { id: 83, userName: 'Editor' };
    const available = { id: 84, userName: 'Other' };
    const input = { selected: [83], history: [available], persisted: [selected] };
    const before = structuredClone(input);
    expect(reconcileRestoredUserNames(input.selected, input.history, 'Editor', input.persisted)).toEqual({ restoring: [83], outdating: [available] });
    expect(reconcileRestoredUserNames(input.selected, input.history, 'editor', input.persisted)).toEqual({ restoring: null, outdating: [available, selected] });
    expect(input).toEqual(before);
  });

  it('uses exact official-name equality without trimming an edited value', () => {
    const record = { id: 85, officialName: 'Official Home' };
    const input = { selected: [85], history: [], persisted: [record] };
    const before = structuredClone(input);
    expect(reconcileRestoredOfficialNames(input.selected, input.history, 'Official Home', input.persisted)).toEqual({ restoring: [85], outdating: [] });
    expect(reconcileRestoredOfficialNames(input.selected, input.history, ' Official Home ', input.persisted)).toEqual({ restoring: null, outdating: [record] });
    expect(input).toEqual(before);
  });

  it('compares every geographic ID and preserves nullable address levels', () => {
    const record = { ...address, district: null, locality: null };
    const input = { selected: [record.id], history: [], persisted: [record] };
    const before = structuredClone(input);
    const draft = { ...geographicDraft, districtId: null, localityId: null };
    expect(reconcileRestoredAddress(input.selected, input.history, draft, input.persisted)).toEqual({ restoring: [record.id], outdating: [] });
    expect(reconcileRestoredAddress(input.selected, input.history, { ...draft, regionId: 21 }, input.persisted)).toEqual({ restoring: null, outdating: [record] });
    expect(input).toEqual(before);
  });

  it('retains normalized Home postal fields and treats blank optional postal text as null', () => {
    const input = { selected: [homeAddress.id], history: [], draft: homeDraft({ postalCode: ' 123456 ', postalName: ' Home ', postalAddressPart: ' ' }), persisted: [homeAddress] };
    const before = structuredClone(input);
    expect(reconcileRestoredHomeAddress(input.selected, input.history, input.draft, input.persisted)).toEqual({ restoring: [homeAddress.id], outdating: [] });
    expect(input).toEqual(before);
  });

  it('cancels a Home address restoration when only the postal address part changes', () => {
    const input = { selected: [homeAddress.id], history: [], draft: homeDraft({ postalAddressPart: 'Building 2' }), persisted: [homeAddress] };
    const before = structuredClone(input);
    expect(reconcileRestoredHomeAddress(input.selected, input.history, input.draft, input.persisted)).toEqual({ restoring: null, outdating: [homeAddress] });
    expect(input).toEqual(before);
  });

  it('retains exact contact objects and returns removed selections to their own contact types', () => {
    const retained = { id: 86, content: 'kept@example.com' };
    const edited = { id: 87, content: 'edited@example.com' };
    const removed = { id: 88, content: '+79991234567' };
    const available = { id: 89, content: 'available@example.com' };
    const input = {
      selected: { email: [retained, edited], phoneNumber: [removed] }, history: { email: [available] },
      draft: contactsDraft({ email: [retained.content, 'EDITED@example.com'] }),
    };
    const before = structuredClone(input);
    expect(reconcileRestoredContacts(input.selected, input.history, input.draft)).toEqual({
      restoring: { email: [retained] }, outdating: { email: [available, edited], phoneNumber: [removed] },
    });
    expect(input).toEqual(before);
  });

  for (const kind of ['home', 'partner'] satisfies ('home' | 'partner')[]) {
    it(`matches ${kind} coordinations by the other owner's ID rather than the history ID`, () => {
      const record = { id: 90, homeId: 10, partnerId: 20, isRecoverable: true };
      const input = { selected: [90], history: [], persisted: [record] };
      const before = structuredClone(input);
      const target = kind === 'home' ? record.partnerId : record.homeId;
      expect(reconcileRestoredCoordinations(kind, input.selected, input.history, [target], input.persisted)).toEqual({ restoring: [90], outdating: [] });
      expect(reconcileRestoredCoordinations(kind, input.selected, input.history, [record.id], input.persisted)).toEqual({ restoring: null, outdating: [record] });
      expect(input).toEqual(before);
    });
  }

  it('normalizes institute names while preserving numeric category identity', () => {
    const record = { id: 91, instituteName: 'Test School', category: INSTITUTE_CATEGORY.SCHOOL, isDeletable: true };
    const input = { selected: [91], history: [], persisted: [record] };
    const before = structuredClone(input);
    expect(reconcileRestoredInstitutes(input.selected, input.history, [{ instituteName: ' test school ', category: INSTITUTE_CATEGORY.SCHOOL }], input.persisted)).toEqual({ restoring: [91], outdating: [] });
    expect(reconcileRestoredInstitutes(input.selected, input.history, [{ instituteName: 'Test School', category: INSTITUTE_CATEGORY.UNIVERSITY }], input.persisted)).toEqual({ restoring: null, outdating: [record] });
    expect(input).toEqual(before);
  });
});

describe('reconcileOwnerRestoration', () => {
  const person = { id: 10, ...names, comment: null, isRestricted: false, causeOfRestriction: null, dateOfRestriction: null };
  const contact = { id: 92, content: 'restored@example.com' };
  const userName = { id: 93, userName: 'Editor' };
  const officialName = { id: 85, officialName: 'Official Home' };
  const coordination = { id: 90, homeId: 10, partnerId: 20, isRecoverable: true };
  const institute = { id: 91, instituteName: 'Test School', category: INSTITUTE_CATEGORY.SCHOOL, isDeletable: true };
  const subscription = { id: 94, userId: 7, userName: 'editor', userFullName: 'Test Editor' };
  const cooperation = { ...subscription, id: 95 };
  const senior: SeniorDraft = {
    ...person, birthDate: null, gender: 'female', infoNote: null, photoLink: null, dateOfConsent: null,
    personalNoAddr: false, kindergarten: null, teacher: null, veteran: null, childOfWar: null,
    profession: null, honoraryStatus: null, interests: null, orthodoxBeliever: null, dateOfExit: null,
    confirmedFirstName: true, confirmedPatronymic: true, confirmedLastName: true, confirmedBirthDate: true,
    spouseId: null, homeId: 10,
  };
  const userInput = {
    kind: 'user',
    draft: { ...person, firstName: 'Changed', userName: 'Editor', password: 'password123', roleId: 1, draftAddress: geographicDraft, draftContacts: contactsDraft({ email: [contact.content] }) },
    restoring: { names: [81], addresses: [82], contacts: { email: [contact] }, userNames: [93] },
    history: { names: [], addresses: [], contacts: {}, userNames: [] },
    persistedHistory: { names: [historicalName], addresses: [address], contacts: { email: [contact] }, userNames: [userName] },
  } satisfies OwnerRestorationInput<'user'>;
  const cases = [
    {
      input: userInput,
      expected: {
        kind: 'user',
        restoring: { names: null, addresses: [82], contacts: { email: [contact] }, userNames: [93] },
        history: { names: [historicalName], addresses: [], contacts: {}, userNames: [] },
      } satisfies OwnerRestorationResult<'user'>,
    },
    {
      input: {
        kind: 'partner',
        draft: { ...person, draftAddress: geographicDraft, draftContacts: contactsDraft(), draftCoordinations: [10], affiliation: PARTNER_AFFILIATION.VOLUNTEER_COORDINATOR, position: null },
        restoring: { names: [81], addresses: null, contacts: null, coordinations: [90] },
        history: { names: [], addresses: [], contacts: {}, coordinations: [] },
        persistedHistory: { names: [historicalName], addresses: [], contacts: {}, coordinations: [coordination] },
      } satisfies OwnerRestorationInput<'partner'>,
      expected: {
        kind: 'partner',
        restoring: { names: [81], addresses: null, contacts: {}, coordinations: [90] },
        history: { names: [], addresses: [], contacts: {}, coordinations: [] },
      } satisfies OwnerRestorationResult<'partner'>,
    },
    {
      input: {
        kind: 'home',
        draft: homeDraft({ officialName: 'Changed Home', postalAddressPart: 'Building 2', draftCoordinations: [20] }),
        restoring: { addresses: [82], contacts: null, officialNames: [85], coordinations: [90] },
        history: { addresses: [], contacts: {}, officialNames: [], coordinations: [] },
        persistedHistory: { addresses: [homeAddress], contacts: {}, officialNames: [officialName], coordinations: [coordination] },
      } satisfies OwnerRestorationInput<'home'>,
      expected: {
        kind: 'home',
        restoring: { addresses: null, contacts: {}, officialNames: null, coordinations: [90] },
        history: { addresses: [homeAddress], contacts: {}, officialNames: [officialName], coordinations: [] },
      } satisfies OwnerRestorationResult<'home'>,
    },
    {
      input: {
        kind: 'volunteer',
        draft: {
          ...person, draftAddress: geographicDraft, draftContacts: contactsDraft(),
          draftInstitutes: [{ instituteName: ' test school ', category: INSTITUTE_CATEGORY.SCHOOL }],
          draftSubscriptions: [], draftCooperations: [],
        },
        restoring: { names: [81], addresses: [82], contacts: { email: [contact] }, institutes: [91] },
        history: { names: [], addresses: [], contacts: {}, institutes: [], subscriptions: [subscription], cooperations: [cooperation] },
        persistedHistory: { names: [historicalName], addresses: [address], contacts: { email: [contact] }, institutes: [institute], subscriptions: [subscription], cooperations: [cooperation] },
      } satisfies OwnerRestorationInput<'volunteer'>,
      expected: {
        kind: 'volunteer',
        restoring: { names: [81], addresses: [82], contacts: {}, institutes: [91] },
        history: { names: [], addresses: [], contacts: { email: [contact] }, institutes: [], subscriptions: [subscription], cooperations: [cooperation] },
      } satisfies OwnerRestorationResult<'volunteer'>,
    },
    {
      input: {
        kind: 'senior', draft: { ...senior, lastName: 'Changed' },
        restoring: { names: [81] }, history: { names: [] }, persistedHistory: { names: [historicalName] },
      } satisfies OwnerRestorationInput<'senior'>,
      expected: { kind: 'senior', restoring: { names: null }, history: { names: [historicalName] } } satisfies OwnerRestorationResult<'senior'>,
    },
  ];

  for (const { input, expected } of cases) {
    it(`returns the exact ${input.kind} restoration and history shapes without changing its inputs`, () => {
      const before = structuredClone(input);
      expect(reconcileOwnerRestoration(input)).toEqual(expected);
      expect(input).toEqual(before);
    });
  }

  it('normalizes empty ID selections to null while retaining an explicitly empty contact array', () => {
    const input: OwnerRestorationInput<'user'> = {
      ...userInput, restoring: { names: [], userNames: [], addresses: [], contacts: { email: [] } },
    };
    const before = structuredClone(input);
    expect(reconcileOwnerRestoration(input)).toEqual({
      kind: 'user', restoring: { names: null, userNames: null, addresses: null, contacts: { email: [] } },
      history: input.history,
    });
    expect(input).toEqual(before);
  });

  it('isolates returned contact objects, selection arrays and restored history records from caller-owned data', () => {
    const input: OwnerRestorationInput<'user'> = structuredClone(userInput);
    input.history.contacts = { email: input.restoring.contacts?.email ?? [] };
    const before = structuredClone(input);
    const result = reconcileOwnerRestoration(input);
    const returnedContact = result.restoring.contacts?.email?.[0];
    if (!returnedContact || !result.restoring.addresses) throw new Error('Expected retained contact and address selections');
    result.history.names[0].firstName = 'Changed after reconciliation';
    returnedContact.content = 'changed-after@example.com';
    result.restoring.addresses.push(999);
    expect(result.history.contacts.email).toEqual([contact]);
    expect(input).toEqual(before);
  });
});
