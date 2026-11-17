import { hasAddressSelectionChanges, hasContactChanges } from './owner-ctrls';
import type { GeographicAddress, GeographicSelection } from './owner-ctrls';

describe('hasContactChanges', () => {
  const first = { id: 1, content: 'first@example.com' };
  const second = { id: 2, content: 'second@example.com' };
  const cases = [
    { label: 'keeps identical content unchanged', existing: [first], current: [first.content], changed: false },
    { label: 'detects a replaced contact value', existing: [first], current: [second.content], changed: true },
    { label: 'detects an added contact', existing: [first], current: [first.content, second.content], changed: true },
    { label: 'detects a removed contact', existing: [first, second], current: [first.content], changed: true },
    { label: 'ignores empty strings, null and undefined placeholders', existing: [first], current: ['', null, first.content, undefined], changed: false },
    { label: 'keeps only empty placeholders unchanged against no persisted contacts', existing: [], current: ['', null, undefined], changed: false },
    { label: 'counts an extra duplicate as an added entry', existing: [first], current: [first.content, first.content], changed: true },
    { label: 'detects different distinct content even when list lengths match', existing: [first, first], current: [first.content, second.content], changed: true },
    { label: 'preserves length-and-set comparison when duplicate frequencies differ', existing: [first, first, second], current: [first.content, second.content, second.content], changed: false },
  ];

  for (const { label, existing, current, changed } of cases) {
    it(label, () => expect(hasContactChanges(existing, current)).toBe(changed));
  }

  it('ignores ordering without sorting caller-owned arrays', () => {
    const existing = Object.freeze([first, second]);
    const current = Object.freeze([second.content, first.content]);
    expect(hasContactChanges(existing, current)).toBeFalse();
    expect(existing).toEqual([first, second]);
    expect(current).toEqual([second.content, first.content]);
  });

  it('does not trim whitespace or rewrite URLs or formatted phone numbers', () => {
    for (const [existing, current] of [
      ['first@example.com', ' first@example.com '],
      ['example.com/path', 'https://example.com/path'],
      ['+79991234567', '+7 (999) 123-45-67'],
    ]) {
      expect(hasContactChanges([{ content: existing }], [current])).withContext(current).toBeTrue();
    }
  });
});

describe('hasAddressSelectionChanges', () => {
  const address = { country: { id: 143 }, region: { id: 20 }, district: { id: 30 }, locality: { id: 40 } };
  const selection = { countries: [143], regions: [20], districts: [30], localities: [40] };

  it('keeps the same four geographic IDs unchanged', () => {
    expect(hasAddressSelectionChanges(address, selection)).toBeFalse();
  });

  const changes: { level: keyof GeographicSelection; value: number }[] = [
    { level: 'countries', value: 144 }, { level: 'regions', value: 21 },
    { level: 'districts', value: 31 }, { level: 'localities', value: 41 },
  ];
  for (const { level, value } of changes) {
    it(`detects a change in ${level}`, () => {
      expect(hasAddressSelectionChanges(address, { ...selection, [level]: [value] })).toBeTrue();
    });
  }

  it('treats missing persisted IDs and null, missing or empty selections as null', () => {
    const empty: GeographicAddress = { country: null, region: undefined, district: null };
    for (const current of [
      {}, { countries: [], regions: [], districts: [], localities: [] },
      { countries: null, regions: undefined, districts: null },
    ]) {
      expect(hasAddressSelectionChanges(empty, current)).toBeFalse();
    }
  });

  it('detects a persisted ID being replaced by a null selection', () => {
    expect(hasAddressSelectionChanges(address, { ...selection, regions: null })).toBeTrue();
  });

  it('uses only the first selection at a geographic level', () => {
    expect(hasAddressSelectionChanges(address, { ...selection, regions: [20, 21] })).toBeFalse();
    expect(hasAddressSelectionChanges(address, { ...selection, regions: [21, 20] })).toBeTrue();
  });
});
