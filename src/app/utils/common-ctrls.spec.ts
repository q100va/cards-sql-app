import { omitEmpty, omitEmptyAndFalse } from './common-ctrls';

// Assert pruned runtime shapes independently of the helpers' current complete-object return types.
describe('omitEmpty', () => {
  it('removes null, undefined, empty strings, whitespace strings, and empty arrays', () => {
    expect<unknown>(omitEmpty({
      missing: undefined, nullable: null, blank: '', whitespace: ' \t ', empty: [], value: 'smith',
    })).toEqual({ value: 'smith' });
  });

  it('preserves false as a meaningful filter value', () => {
    expect(omitEmpty({ isRestricted: false })).toEqual({ isRestricted: false });
  });

  it('preserves zero as meaningful numeric data', () => {
    expect(omitEmpty({ page: 0 })).toEqual({ page: 0 });
  });

  it('preserves non-empty values without trimming strings or recursively pruning data', () => {
    expect(omitEmpty({
      value: ' smith ', enabled: true, ids: [7], nested: { nullable: null }, emptyObject: {},
    })).toEqual({
      value: ' smith ', enabled: true, ids: [7], nested: { nullable: null }, emptyObject: {},
    });
  });

  it('returns undefined when every property is empty', () => {
    expect(omitEmpty({ missing: undefined, nullable: null, value: '', ids: [] })).toBeUndefined();
  });

  it('returns undefined for missing input and an empty object', () => {
    expect(omitEmpty()).toBeUndefined();
    expect(omitEmpty({})).toBeUndefined();
  });

  it('creates a separate result without mutating caller properties or nested data', () => {
    const input = Object.freeze({ missing: undefined, value: '', enabled: false, ids: [7], nested: { value: null } });
    const result: unknown = omitEmpty(input);
    expect(input).toEqual({ missing: undefined, value: '', enabled: false, ids: [7], nested: { value: null } });
    expect(Object.keys(input)).toEqual(['missing', 'value', 'enabled', 'ids', 'nested']);
    expect(result).toEqual({ enabled: false, ids: [7], nested: { value: null } });
    expect(result).not.toBe(input);
  });
});

describe('omitEmptyAndFalse', () => {
  it('removes null, undefined, empty strings, whitespace strings, and empty arrays', () => {
    expect<unknown>(omitEmptyAndFalse({
      missing: undefined, nullable: null, blank: '', whitespace: ' \t ', empty: [], value: 'smith',
    })).toEqual({ value: 'smith' });
  });

  it('removes false instead of treating it as an active option', () => {
    expect<unknown>(omitEmptyAndFalse({ onlyWithPicture: false, onlyAnniversaries: true }))
      .toEqual({ onlyAnniversaries: true });
  });

  it('preserves zero as meaningful numeric data', () => {
    expect(omitEmptyAndFalse({ amount: 0 })).toEqual({ amount: 0 });
  });

  it('preserves non-empty values without trimming strings or recursively pruning data', () => {
    expect(omitEmptyAndFalse({
      value: ' smith ', enabled: true, ids: [7], nested: { enabled: false }, emptyObject: {},
    })).toEqual({
      value: ' smith ', enabled: true, ids: [7], nested: { enabled: false }, emptyObject: {},
    });
  });

  it('returns undefined when every property is empty or false', () => {
    expect(omitEmptyAndFalse({ missing: undefined, nullable: null, value: '', ids: [], enabled: false }))
      .toBeUndefined();
  });

  it('returns undefined for missing input and an empty object', () => {
    expect(omitEmptyAndFalse()).toBeUndefined();
    expect(omitEmptyAndFalse({})).toBeUndefined();
  });

  it('creates a separate result without mutating caller properties or nested data', () => {
    const input = Object.freeze({ missing: undefined, value: '', enabled: false, ids: [7], nested: { enabled: false } });
    const result: unknown = omitEmptyAndFalse(input);
    expect(input).toEqual({ missing: undefined, value: '', enabled: false, ids: [7], nested: { enabled: false } });
    expect(Object.keys(input)).toEqual(['missing', 'value', 'enabled', 'ids', 'nested']);
    expect(result).toEqual({ ids: [7], nested: { enabled: false } });
    expect(result).not.toBe(input);
  });
});
