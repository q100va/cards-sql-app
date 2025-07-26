export interface AddressFilterParams {
  isShowCountry: boolean;
  isShowRegion: boolean;
  isShowDistrict: boolean;
  isShowLocality: boolean;
  source?: 'toponymCard' | 'toponymList' | 'userCard' | 'userList';
  multiple?: boolean;
  cols?: string;
  gutterSize?: string;
  rowHeight?: string;
  readonly?: boolean | undefined;
  class?: 'none' | 'view-mode';
}
