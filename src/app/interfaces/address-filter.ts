import type { ToponymNamesList, ToponymType, DefaultAddressParams } from "@shared/schemas/toponym.schema";
//import type { ToponymNamesList, ToponymType } from '../../../shared/schemas/toponym.schema';

export type { ToponymNamesList, ToponymType, DefaultAddressParams };

export interface AddressFilter {
  countries: number[];
  regions: number[];
  districts: number[];
  localities: number[];
}

/* export interface DefaultAddressParams {
  localityId: number | null;
  districtId: number | null;
  regionId: number | null;
  countryId: number | null;
} */

export type ToponymListMap = {
  countriesList: ToponymNamesList;
  regionsList: ToponymNamesList;
  districtsList: ToponymNamesList;
  localitiesList: ToponymNamesList;
};

export type AddressKey = keyof AddressFilter;

export function typedKeys<T extends object>(obj: T): (keyof T & string)[] {
  return Object.keys(obj) as (keyof T & string)[];
}

export function hasKey<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}
