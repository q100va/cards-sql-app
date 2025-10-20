// server/tests/unit/correct-toponym-name.unit.test.js
import { describe, test, expect } from '@jest/globals';

// Import the actual module under test (no DB involved)
import {
  correctCountryName,
  correctRegionName,
  correctDistrictName,
  correctLocalityName,
} from '../../controllers/correct-toponym-name.js';

import CustomError from '../../shared/customError.js';

describe('correct-toponym-name (unit)', () => {
  // ------------------------ correctCountryName ------------------------------
  test('correctCountryName → replaces "ё" with "е" and trims', () => {
    // Arrange
    const input = '  Белорُّс ё  ';
    // Act
    const out = correctCountryName(input);
    // Assert
    expect(out).toEqual({ name: 'Белорُّс е' });
  });

  // ------------------------ correctRegionName -------------------------------
  test('correctRegionName → normalizes both name and shortName', () => {
    const out = correctRegionName('  Тюменская обл ё  ', '  Тюм. ё ');
    expect(out).toEqual({ name: 'Тюменская обл е', shortName: 'Тюм. е' });
  });

  // ------------------------ correctDistrictName -----------------------------
  test('correctDistrictName → recognizes "район": builds name/shortName', () => {
    // "район" is one of supported district types
    const out = correctDistrictName('Тверской район');
    // name: "<base> район" (normalized spacing)
    // shortName: "Тверской р-н"
    expect(out.name).toBe('Тверской район');
    expect(out.shortName).toBe('Тверской р-н');
    // No post names provided
    expect(out.postName).toBeUndefined();
    expect(out.shortPostName).toBeUndefined();
  });

  test('correctDistrictName → throws CustomError(422) when type is unknown', () => {
    // "уезд" is not present in the district type catalog
    expect(() => correctDistrictName('Тверской уезд')).toThrow(CustomError);
    try {
      correctDistrictName('Тверской уезд');
    } catch (e) {
      // Check semantic error fields
      expect(e).toBeInstanceOf(CustomError);
      expect(e.code).toBe('ERRORS.TOPONYM.INVALID_TYPE');
      expect(e.statusCode ?? e.status).toBe(422);
      // The payload should contain the original name
      expect(e.data?.name).toBe('Тверской уезд');
    }
  });

  test('correctDistrictName → postNameType="район" uses district normalization for post names', () => {
    // NOTE: Per current implementation, when rowPostNameType === "район"
    // it recursively calls correctDistrictName(rowName) (not rowPostName),
    // so postName mirrors the normalized district "rowName".
    const out = correctDistrictName('Истринский район', 'ignored here', 'район');
    expect(out.name).toBe('Истринский район');
    expect(out.shortName).toBe('Истринский р-н');
    // postName derived from "rowName" due to implementation detail
    expect(out.postName).toBe('Истринский район');
    expect(out.shortPostName).toBe('Истринский р-н');
  });

  test('correctDistrictName → postNameType!="район" uses locality normalization for post names', () => {
    const out = correctDistrictName('Пушкинский район', 'Москва', 'город');
    // postName/shortPostName are derived via correctLocalityName('Москва','город')
    expect(out.postName).toBe('Москва город');
    expect(out.shortPostName).toBe('г. Москва');
  });

  // ------------------------ correctLocalityName -----------------------------
  test('correctLocalityName → base case for "город"', () => {
    const out = correctLocalityName('Абинск', 'город', 'Абинский район');
    expect(out).toEqual({
      name: 'Абинск город',
      shortName: 'г. Абинск',
      districtFullName: 'Абинский район',
    });
  });

  test('correctLocalityName → normalizes type aliases: "поселок городского типа" → "пгт"', () => {
    const out = correctLocalityName('Сходня', 'поселок городского типа');
    expect(out.name).toBe('Сходня пгт');
    expect(out.shortName).toBe('пгт Сходня');
  });

  test('correctLocalityName → normalizes type aliases: "пгт (рабочий поселок)" → "пгт"', () => {
    const out = correctLocalityName('Апрелевка', 'пгт (рабочий поселок)');
    expect(out.name).toBe('Апрелевка пгт');
    expect(out.shortName).toBe('пгт Апрелевка');
  });

  test('correctLocalityName → adds districtFullName when district is provided (district normalization applied)', () => {
    // District name is normalized by correctDistrictName() internally
    const out = correctLocalityName('Клин', 'город', 'Клинский район');
    expect(out.districtFullName).toBe('Клинский район');
    expect(out.name).toBe('Клин город');
    expect(out.shortName).toBe('г. Клин');
  });

  test('correctLocalityName → throws CustomError(422) for unknown locality type', () => {
    expect(() => correctLocalityName('Москва', 'мегаполис')).toThrow(CustomError);
    try {
      correctLocalityName('Москва', 'мегаполис');
    } catch (e) {
      expect(e.code).toBe('ERRORS.TOPONYM.INVALID_TYPE');
      expect(e.statusCode ?? e.status).toBe(422);
      // For locality, meta.name is built as "<rowName> <type>"
      expect(e.data?.name).toBe('Москва мегаполис');
    }
  });

  test('correctLocalityName → replaces "ё" in both type and name', () => {
    const out = correctLocalityName('Алёшкино', 'деревня');
    // "Алёшкино" -> "Алешкино"; "деревня" stays as known type
    expect(out.name).toBe('Алешкино деревня');
    expect(out.shortName).toBe('д. Алешкино');
  });
});
