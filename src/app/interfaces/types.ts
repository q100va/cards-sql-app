import { ToponymNamesList } from "@shared/schemas/toponym.schema";
import { AddressFilter } from "./address-filter";

export type ToponymType = 'country' | 'region' | 'district' | 'locality';

//export type ToponymListType = 'country' | 'region' | 'district' | 'locality';

export type Ways = {
  [K in ToponymType]: {
    locality?: string | null;
    district: string | null;
    region: string | null;
    country: string | null;
  };
};

export type ToponymField = 'countryId' | 'regionId' | 'districtId' | 'localityId';

export type AddressKey = keyof AddressFilter;

/* export type ToponymListMap = {
  countriesList: { id: number; name: string }[];
  regionsList: { id: number; name: string; countryId: number }[];
  districtsList: { id: number; name: string; regionId: number }[];
  localitiesList: { id: number; name: string; districtId: number }[];
}; */

export function typedKeys<T extends object>(obj: T): (keyof T & string)[] {
  return Object.keys(obj) as (keyof T & string)[];
}

export function hasKey<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}

export type ToponymListMap = {
  countriesList: ToponymNamesList;
  regionsList: ToponymNamesList;
  districtsList: ToponymNamesList;
  localitiesList: ToponymNamesList;
};
