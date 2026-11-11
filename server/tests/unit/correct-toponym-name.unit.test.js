/** @jest-environment node */

import { describe, expect, test } from '@jest/globals';

import { correctCountryName, correctDistrictName, correctLocalityName, correctRegionName } from '../../controllers/correct-toponym-name.js';

import CustomError from '../../shared/customError.js';

describe('correct-toponym-name', () => {
  describe('correctCountryName', () => {
    test('replaces "ё" with "е" and trims whitespace', () => {
      const result = correctCountryName('  Алёшкино  ');

      expect(result).toEqual({ name: 'Алешкино' });
    });

    test('replaces uppercase "Ё" with "Е"', () => {
      const result = correctCountryName('  Ёлкино  ');

      expect(result).toEqual({ name: 'Елкино' });
    });
  });

  describe('correctRegionName', () => {
    test('normalizes name and shortName', () => {
      const result = correctRegionName('  Тюменская обл ё  ', '  Тюм. ё  ');

      expect(result).toEqual({
        name: 'Тюменская обл е',
        shortName: 'Тюм. е',
      });
    });
  });

  describe('correctDistrictName', () => {
    test('recognizes district type and builds name and shortName', () => {
      const result = correctDistrictName('Тверской район');

      expect(result).toEqual({
        name: 'Тверской район',
        shortName: 'Тверской р-н',
        postName: undefined,
        shortPostName: undefined,
      });
    });

    test('matches a specific long district type before a generic type', () => {
      const result = correctDistrictName('Сочи городской округ город-курорт');

      expect(result).toEqual({
        name: 'Сочи городской округ город-курорт',
        shortName: 'Сочи г.о. город-курорт',
        postName: undefined,
        shortPostName: undefined,
      });
    });

    test('throws 422 for an unknown district type', () => {
      expect(() => correctDistrictName('Тверской уезд')).toThrow(CustomError);

      try {
        correctDistrictName('Тверской уезд');
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);

        expect(error.code).toBe('ERRORS.TOPONYM.INVALID_TYPE');

        expect(error.statusCode ?? error.status).toBe(422);

        expect(error.data?.name).toBe('Тверской уезд');
      }
    });

    test('uses district normalization for post names when postNameType is "район"', () => {
      const result = correctDistrictName('Истринский район', 'ignored here', 'район');

      expect(result.name).toBe('Истринский район');

      expect(result.shortName).toBe('Истринский р-н');

      expect(result.postName).toBe('Истринский район');

      expect(result.shortPostName).toBe('Истринский р-н');
    });

    test('uses locality normalization for post names when postNameType is not "район"', () => {
      const result = correctDistrictName('Пушкинский район', 'Москва', 'город');

      expect(result.postName).toBe('Москва город');

      expect(result.shortPostName).toBe('г. Москва');
    });
  });

  describe('correctLocalityName', () => {
    test('builds locality names for "город"', () => {
      const result = correctLocalityName('Абинск', 'город', 'Абинский район');

      expect(result).toEqual({
        name: 'Абинск город',
        shortName: 'г. Абинск',
        districtFullName: 'Абинский район',
      });
    });

    test('normalizes locality type case and whitespace', () => {
      const result = correctLocalityName('Москва', '  ГОРОД  ');

      expect(result).toEqual({
        name: 'Москва город',
        shortName: 'г. Москва',
        districtFullName: null,
      });
    });

    test('normalizes "поселок городского типа" alias to "пгт"', () => {
      const result = correctLocalityName('Сходня', 'поселок городского типа');

      expect(result.name).toBe('Сходня пгт');

      expect(result.shortName).toBe('пгт Сходня');
    });

    test('normalizes "пгт (рабочий поселок)" alias to "пгт"', () => {
      const result = correctLocalityName('Апрелевка', 'пгт (рабочий поселок)');

      expect(result.name).toBe('Апрелевка пгт');

      expect(result.shortName).toBe('пгт Апрелевка');
    });

    test('normalizes and includes districtFullName when district is provided', () => {
      const result = correctLocalityName('Клин', 'город', 'Клинский район');

      expect(result).toEqual({
        name: 'Клин город',
        shortName: 'г. Клин',
        districtFullName: 'Клинский район',
      });
    });

    test('throws 422 for an unknown locality type', () => {
      expect(() => correctLocalityName('Москва', 'мегаполис')).toThrow(CustomError);

      try {
        correctLocalityName('Москва', 'мегаполис');
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);

        expect(error.code).toBe('ERRORS.TOPONYM.INVALID_TYPE');

        expect(error.statusCode ?? error.status).toBe(422);

        expect(error.data?.name).toBe('Москва мегаполис');
      }
    });

    test('replaces "ё" with "е" in locality name', () => {
      const result = correctLocalityName('Алёшкино', 'деревня');

      expect(result).toEqual({
        name: 'Алешкино деревня',
        shortName: 'д. Алешкино',
        districtFullName: null,
      });
    });
  });
});
