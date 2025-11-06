import type {
  Toponym,
  ToponymNamesList,
  ToponymType,
  DefaultAddressParams,
} from '@shared/schemas/toponym.schema';
import { DialogData } from './dialog-props';

export type { Toponym, ToponymNamesList, ToponymType, DefaultAddressParams };

export interface AddressFilter {
  countries: number[];
  regions: number[];
  districts: number[];
  localities: number[];
}

export type AddressKey = keyof AddressFilter;

export type ToponymListMap = {
  countriesList: ToponymNamesList;
  regionsList: ToponymNamesList;
  districtsList: ToponymNamesList;
  localitiesList: ToponymNamesList;
};

export interface ToponymFormControlsValues {
  name: string;
  shortName?: string;
  postName?: string;
  shortPostName?: string;
  isFederalCity?: boolean;
  isCapitalOfRegion?: boolean;
  isCapitalOfDistrict?: boolean;
}

export interface ToponymProps {
  title: string;
  displayedColumns: (
    | 'name'
    | 'shortName'
    | 'postName'
    | 'shortPostName'
    | 'district'
    | 'region'
    | 'country'
    | 'actions'
  )[];
  filename: string;
  queryParams: QueryParams;
  isShowCountry: boolean;
  isShowRegion: boolean;
  isShowDistrict: boolean;
  isShowLocality: boolean;
  searchPlaceHolder: string;
  dialogProps: DialogData<Toponym>;
}

export interface AddressFilterParams {
  isShowCountry: boolean;
  isShowRegion: boolean;
  isShowDistrict: boolean;
  isShowLocality: boolean;
  source?: 'toponymCard' | 'toponymList' | 'userCard' | 'userList' | 'partnerList';
  multiple?: boolean;
  cols?: string;
  gutterSize?: string;
  rowHeight?: string;
  readonly?: boolean | undefined;
  class?: 'none' | 'view-mode';
}

export interface AddressFilterControl<AFKey extends AddressKey> {
  addressFilterProp: AFKey;
  toponymProp: string;
}

export interface QueryParams {
  localityId: number | null;
  districtId: number | null;
  regionId: number | null;
  countryId: number | null;
  addressFilterString: string;
}

export function typedKeys<T extends object>(obj: T): (keyof T & string)[] {
  return Object.keys(obj) as (keyof T & string)[];
}

export function hasKey<T extends object>(
  obj: T,
  key: PropertyKey
): key is keyof T {
  return key in obj;
}

export const typeOfListMap: Record<
  ToponymType,
  'countries' | 'regions' | 'districts' | 'localities'
> = {
  country: 'countries',
  region: 'regions',
  district: 'districts',
  locality: 'localities',
};

export const keyMap: Record<AddressKey, keyof ToponymListMap> = {
  countries: 'countriesList',
  regions: 'regionsList',
  districts: 'districtsList',
  localities: 'localitiesList',
};

export const typeMap: Record<ToponymType, keyof ToponymListMap> = {
  country: 'countriesList',
  region: 'regionsList',
  district: 'districtsList',
  locality: 'localitiesList',
};

export const fields: AddressKey[] = [
  'countries',
  'regions',
  'districts',
  'localities',
];
export const controlMap: Record<AddressKey, ToponymType> = {
  countries: 'country',
  regions: 'region',
  districts: 'district',
  localities: 'locality',
};
